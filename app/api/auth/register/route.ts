import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterBody;
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, parola și numele sunt obligatorii" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă minim 6 caractere" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Eroare la înregistrare" },
        { status: 400 }
      );
    }

    await db.insert(schema.users).values({
      id: authData.user.id,
      email,
      name,
      nativeCurrency: "RON",
    });

    return NextResponse.json({ message: "Cont creat cu succes" }, { status: 201 });
  } catch (error) {
    console.error("[REGISTER] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
