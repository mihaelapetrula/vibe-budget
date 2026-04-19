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
    const { name, icon, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Numele categoriei este obligatoriu" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(schema.categories)
      .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, user.id)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Categoria nu a fost găsită" }, { status: 404 });
    }

    if (existing[0].isSystemCategory) {
      return NextResponse.json({ error: "Categoriile sistem nu pot fi modificate" }, { status: 403 });
    }

    const [category] = await db
      .update(schema.categories)
      .set({ name: name.trim(), icon: icon || "📁", color: color || "#6366f1" })
      .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, user.id)))
      .returning();

    return NextResponse.json({ data: category });
  } catch (error) {
    console.error("[CATEGORIES_PUT] Error:", error);
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

    const existing = await db
      .select()
      .from(schema.categories)
      .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, user.id)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Categoria nu a fost găsită" }, { status: 404 });
    }

    if (existing[0].isSystemCategory) {
      return NextResponse.json({ error: "Categoriile sistem nu pot fi șterse" }, { status: 403 });
    }

    await db
      .delete(schema.categories)
      .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, user.id)));

    return NextResponse.json({ message: "Categorie ștearsă" });
  } catch (error) {
    console.error("[CATEGORIES_DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
