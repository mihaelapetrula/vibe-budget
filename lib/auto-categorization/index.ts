import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Încarcă toate keyword-urile unui user din DB (o singură dată per request).
 * Apelează înainte de bucla de tranzacții pentru a evita N+1 queries.
 */
export async function getUserKeywords(userId: string) {
  return db
    .select()
    .from(schema.userKeywords)
    .where(eq(schema.userKeywords.userId, userId));
}

/**
 * Încearcă să găsească o categorie pentru o descriere de tranzacție.
 * Matching: case-insensitive, substring — dacă descrierea conține keyword-ul → match.
 *
 * @param description - Descrierea tranzacției (ex: "MEGA IMAGE 123")
 * @param userKeywords - Lista pre-încărcată de keywords ale userului
 * @returns categoryId dacă s-a găsit match, altfel null
 */
export function autoCategorize(
  description: string,
  userKeywords: Array<{ keyword: string; categoryId: string }>
): string | null {
  const lowerDesc = description.toLowerCase();

  for (const { keyword, categoryId } of userKeywords) {
    if (lowerDesc.includes(keyword.toLowerCase())) {
      return categoryId;
    }
  }

  return null;
}
