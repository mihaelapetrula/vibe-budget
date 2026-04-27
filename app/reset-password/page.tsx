"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    // Supabase trimite token-ul în hash: #access_token=...&type=recovery
    // Trebuie să îl parsăm manual și să setăm sesiunea
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (type === "recovery" && accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setError("Linkul de resetare este invalid sau expirat.");
          } else {
            setReady(true);
          }
        });
    } else {
      // Fallback: ascultă evenimentul Supabase (pentru browsere care nu au hash)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      // Dacă după 3 secunde nu s-a primit evenimentul, arată eroare
      const timeout = setTimeout(() => {
        setError("Linkul de resetare este invalid sau expirat.");
      }, 3000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Parola trebuie să aibă cel puțin 6 caractere");
      return;
    }
    if (password !== confirm) {
      toast.error("Parolele nu coincid");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Parola a fost schimbată cu succes!");
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      toast.error("Eroare la schimbarea parolei");
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
            <p className="!text-white/80">Parolă nouă</p>
          </div>

          {error ? (
            <div className="text-center space-y-4">
              <p className="text-4xl">⚠️</p>
              <p className="!text-white font-semibold">{error}</p>
              <p className="!text-white/70 text-sm">Solicită un nou link de resetare.</p>
              <button
                onClick={() => router.push("/forgot-password")}
                className="w-full bg-white text-teal-700 font-semibold py-3 rounded-xl hover:bg-white/90 transition-all"
              >
                Trimite alt link
              </button>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-3">
              <p className="text-4xl animate-pulse">🔐</p>
              <p className="!text-white/70 text-sm">Se verifică linkul de resetare...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium !text-white/90 mb-1.5">
                  Parolă nouă
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoFocus
                  className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 !text-white placeholder:!text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium !text-white/90 mb-1.5">
                  Confirmă parola
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 !text-white placeholder:!text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-teal-700 font-semibold py-3 rounded-xl hover:bg-white/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Se salvează..." : "Salvează parola nouă"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
