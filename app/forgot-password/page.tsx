"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSent(true);
    } catch {
      toast.error("Eroare la trimiterea emailului");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-orange-400 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold !text-white mb-2">💰 Vibe Budget</h1>
            <p className="!text-white/80">Resetare parolă</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-4xl">📧</p>
              <p className="!text-white font-semibold text-lg">Email trimis!</p>
              <p className="!text-white/70 text-sm">
                Verifică inbox-ul pentru <span className="!text-white font-medium">{email}</span> și urmează linkul pentru a-ți reseta parola.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-white text-teal-700 font-semibold py-3 rounded-xl hover:bg-white/90 transition-all mt-4"
              >
                Înapoi la login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="!text-white/70 text-sm">
                Introdu adresa de email și îți vom trimite un link pentru resetarea parolei.
              </p>

              <div>
                <label className="block text-sm font-medium !text-white/90 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@exemplu.com"
                  autoFocus
                  className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 !text-white placeholder:!text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-teal-700 font-semibold py-3 rounded-xl hover:bg-white/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Se trimite..." : "Trimite link de resetare"}
              </button>

              <p className="text-center !text-white/70 text-sm">
                <Link href="/login" className="!text-white font-semibold hover:underline">
                  ← Înapoi la login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
