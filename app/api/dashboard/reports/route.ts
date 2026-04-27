import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "3months"; // current | 3months | 6months | all

    const now = new Date();
    let startDate: string | null = null;

    if (period === "current") {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (period === "3months") {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (period === "6months") {
      const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    }
    // "all" → startDate rămâne null

    const baseConditions = [eq(schema.transactions.userId, user.id)];
    if (startDate) baseConditions.push(gte(schema.transactions.date, startDate));

    // ── 1. Cheltuieli pe categorii (pie chart) ──────────────────────────────
    const expensesByCategory = await db
      .select({
        categoryId: schema.transactions.categoryId,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
        categoryColor: schema.categories.color,
        total: sql<string>`ABS(SUM(${schema.transactions.amount}))`,
      })
      .from(schema.transactions)
      .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
      .where(and(...baseConditions, lt(schema.transactions.amount, 0)))
      .groupBy(
        schema.transactions.categoryId,
        schema.categories.name,
        schema.categories.icon,
        schema.categories.color,
      )
      .orderBy(sql`ABS(SUM(${schema.transactions.amount})) DESC`);

    const totalExpenses = expensesByCategory.reduce((sum, r) => sum + Number(r.total), 0);

    const pieData = expensesByCategory.map((r) => ({
      categoryId: r.categoryId,
      name: r.categoryName ?? "Fără categorie",
      icon: r.categoryIcon ?? "📁",
      color: r.categoryColor ?? "#6366f1",
      value: Number(r.total),
      percent: totalExpenses > 0 ? Math.round((Number(r.total) / totalExpenses) * 100) : 0,
    }));

    // ── 2. Cheltuieli pe luni (bar chart) ──────────────────────────────────
    const expensesByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${schema.transactions.date}::date, 'YYYY-MM')`,
        total: sql<string>`ABS(SUM(${schema.transactions.amount}))`,
      })
      .from(schema.transactions)
      .where(and(...baseConditions, lt(schema.transactions.amount, 0)))
      .groupBy(sql`TO_CHAR(${schema.transactions.date}::date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${schema.transactions.date}::date, 'YYYY-MM') ASC`);

    const incomeByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${schema.transactions.date}::date, 'YYYY-MM')`,
        total: sql<string>`SUM(${schema.transactions.amount})`,
      })
      .from(schema.transactions)
      .where(
        and(
          ...baseConditions,
          sql`${schema.transactions.amount} > 0`,
        )
      )
      .groupBy(sql`TO_CHAR(${schema.transactions.date}::date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${schema.transactions.date}::date, 'YYYY-MM') ASC`);

    // Combină cheltuieli + venituri pe aceeași lună
    const monthMap: Record<string, { month: string; expenses: number; income: number }> = {};

    for (const r of expensesByMonth) {
      monthMap[r.month] = { month: r.month, expenses: Number(r.total), income: 0 };
    }
    for (const r of incomeByMonth) {
      if (monthMap[r.month]) {
        monthMap[r.month].income = Number(r.total);
      } else {
        monthMap[r.month] = { month: r.month, expenses: 0, income: Number(r.total) };
      }
    }

    const MONTH_LABELS: Record<string, string> = {
      "01": "Ian", "02": "Feb", "03": "Mar", "04": "Apr",
      "05": "Mai", "06": "Iun", "07": "Iul", "08": "Aug",
      "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
    };

    const barData = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => {
        const [, mm] = r.month.split("-");
        return {
          month: r.month,
          label: `${MONTH_LABELS[mm] ?? mm}`,
          expenses: r.expenses,
          income: r.income,
        };
      });

    // ── 3. Sumar perioadă ───────────────────────────────────────────────────
    const [summaryRow] = await db
      .select({
        totalIncome:   sql<string>`COALESCE(SUM(CASE WHEN ${schema.transactions.amount} > 0 THEN ${schema.transactions.amount} ELSE 0 END), 0)`,
        totalExpenses: sql<string>`COALESCE(ABS(SUM(CASE WHEN ${schema.transactions.amount} < 0 THEN ${schema.transactions.amount} ELSE 0 END)), 0)`,
      })
      .from(schema.transactions)
      .where(and(...baseConditions));

    return NextResponse.json({
      data: {
        pieData,
        barData,
        summary: {
          totalIncome:   Number(summaryRow?.totalIncome   ?? 0),
          totalExpenses: Number(summaryRow?.totalExpenses ?? 0),
        },
      },
    });
  } catch (error) {
    console.error("[REPORTS_GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
