"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardNav from "@/app/dashboard/components/DashboardNav";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Parola trebuie să aibă cel puțin 6 caractere");
      return;
    }
    if (password !== confirm) {
      toast.error("Parolele nu coincid");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Parola a fost schimbată cu succes!");
      setPassword("");
      setConfirm("");
    } catch {
      toast.error("Eroare la schimbarea parolei");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl animate-pulse">Se încarcă...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-gray-100 border border-gray-300 rounded-2xl p-8 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Schimbă parola</h2>
          <p className="text-gray-500 text-sm mb-6">Contul: {user.email}</p>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Parolă nouă
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoFocus
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmă parola nouă
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-white text-teal-700 font-semibold py-3 rounded-xl hover:bg-white/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Se salvează..." : "Salvează parola nouă"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
