import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, ilike, desc, SQL } from "drizzle-orm";
import { autoCategorize, getUserKeywords } from "@/lib/auto-categorization";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bankId     = searchParams.get("bankId");
    const categoryId = searchParams.get("categoryId");
    const startDate  = searchParams.get("startDate");
    const endDate    = searchParams.get("endDate");
    const search     = searchParams.get("search");

    const conditions: SQL[] = [eq(schema.transactions.userId, user.id)];

    if (bankId)     conditions.push(eq(schema.transactions.bankId, bankId));
    if (categoryId) conditions.push(eq(schema.transactions.categoryId, categoryId));
    if (startDate)  conditions.push(gte(schema.transactions.date, startDate));
    if (endDate)    conditions.push(lte(schema.transactions.date, endDate));
    if (search)     conditions.push(ilike(schema.transactions.description, `%${search}%`));

    const transactions = await db
      .select()
      .from(schema.transactions)
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.date), desc(schema.transactions.createdAt));

    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error("[TRANSACTIONS_GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Bulk insert — array de tranzacții (de la upload CSV/Excel)
    if (body.transactions) {
      const { transactions } = body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return NextResponse.json({ error: "Array de tranzacții invalid" }, { status: 400 });
      }

      // Încarcă keyword-urile userului o singură dată
      const keywords = await getUserKeywords(user.id);

      let categorizedCount = 0;
      const values: typeof schema.transactions.$inferInsert[] = [];

      for (const tx of transactions) {
        if (!tx.date || !tx.description?.trim() || tx.amount === undefined || tx.amount === null) {
          continue;
        }

        const categoryId = autoCategorize(tx.description, keywords);
        if (categoryId) categorizedCount++;

        values.push({
          userId:      user.id,
          date:        tx.date,
          description: tx.description.trim(),
          amount:      Number(tx.amount),
          currency:    tx.currency || "RON",
          bankId:      tx.bankId   || null,
          categoryId,
        });
      }

      if (values.length === 0) {
        return NextResponse.json(
          { error: "Nu există tranzacții valide de importat" },
          { status: 400 }
        );
      }

      await db.insert(schema.transactions).values(values);

      return NextResponse.json(
        {
          message:     "Tranzacții importate cu succes",
          imported:    values.length,
          categorized: categorizedCount,
        },
        { status: 201 }
      );
    }

    // Single insert — backward compatibility cu modalul de adăugare manuală
    const { date, description, amount, currency, bankId, categoryId } = body;

    if (!date) {
      return NextResponse.json({ error: "Data este obligatorie" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Descrierea este obligatorie" }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Suma este obligatorie" }, { status: 400 });
    }

    const [transaction] = await db
      .insert(schema.transactions)
      .values({
        userId:      user.id,
        date,
        description: description.trim(),
        amount:      Number(amount),
        currency:    currency   || "RON",
        bankId:      bankId     || null,
        categoryId:  categoryId || null,
      })
      .returning();

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    console.error("[TRANSACTIONS_POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
