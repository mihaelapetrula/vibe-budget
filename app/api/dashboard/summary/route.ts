import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lt, gt, sql } from "drizzle-orm";

interface DashboardSummary {
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
  currency: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const firstDayNext =
      month === 11
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 2).padStart(2, "0")}-01`;

    const [totalResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.transactions.amount}), 0)` })
      .from(schema.transactions)
      .where(eq(schema.transactions.userId, user.id));

    const [incomeResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.transactions.amount}), 0)` })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          gte(schema.transactions.date, firstDay),
          lt(schema.transactions.date, firstDayNext),
          gt(schema.transactions.amount, 0)
        )
      );

    const [expensesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${schema.transactions.amount}), 0)` })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          gte(schema.transactions.date, firstDay),
          lt(schema.transactions.date, firstDayNext),
          lt(schema.transactions.amount, 0)
        )
      );

    const summary: DashboardSummary = {
      totalBalance: Number(totalResult?.total ?? 0),
      monthIncome: Number(incomeResult?.total ?? 0),
      monthExpenses: Math.abs(Number(expensesResult?.total ?? 0)),
      currency: user.nativeCurrency ?? "RON",
    };

    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error("[DASHBOARD_SUMMARY] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
