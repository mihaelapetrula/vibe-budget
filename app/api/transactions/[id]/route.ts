import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
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

    const existing = await db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, user.id)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Tranzacția nu a fost găsită" }, { status: 404 });
    }

    const [transaction] = await db
      .update(schema.transactions)
      .set({
        date,
        description: description.trim(),
        amount:      Number(amount),
        currency:    currency || "RON",
        bankId:      bankId     || null,
        categoryId:  categoryId || null,
        updatedAt:   new Date(),
      })
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, user.id)))
      .returning();

    return NextResponse.json({ data: transaction });
  } catch (error) {
    console.error("[TRANSACTIONS_PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db
      .delete(schema.transactions)
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, user.id)));

    return NextResponse.json({ message: "Tranzacție ștearsă" });
  } catch (error) {
    console.error("[TRANSACTIONS_DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
