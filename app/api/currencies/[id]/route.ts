import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db
      .delete(schema.currencies)
      .where(and(eq(schema.currencies.id, id), eq(schema.currencies.userId, user.id)));

    return NextResponse.json({ message: "Valută ștearsă" });
  } catch (error) {
    console.error("[CURRENCIES_DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
