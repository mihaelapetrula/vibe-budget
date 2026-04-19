"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

const PRESET_CURRENCIES = [
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
];

export default function CurrenciesPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingCode, setAddingCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchCurrencies();
  }, [user]);

  const fetchCurrencies = async () => {
    try {
      const res = await fetch("/api/currencies");
      const data = await res.json();
      if (res.ok) setCurrencies(data.data);
    } catch {
      toast.error("Eroare la încărcarea valutelor");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPreset = async (preset: typeof PRESET_CURRENCIES[0]) => {
    const exists = currencies.some((c) => c.code === preset.code);
    if (exists) {
      toast.info(`${preset.code} este deja adăugat`);
      return;
    }

    setAddingCode(preset.code);
    try {
      const res = await fetch("/api/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Eroare la adăugare");
        return;
      }

      toast.success(`${preset.code} adăugat!`);
      setCurrencies((prev) => [...prev, data.data]);
    } catch {
      toast.error("Eroare la adăugare");
    } finally {
      setAddingCode(null);
    }
  };

  const handleDelete = async (currency: Currency) => {
    if (!confirm(`Ștergi valuta ${currency.code}?`)) return;

    setDeletingId(currency.id);
    try {
      const res = await fetch(`/api/currencies/${currency.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Eroare la ștergere");
        return;
      }
      toast.success(`${currency.code} șters!`);
      setCurrencies((prev) => prev.filter((c) => c.id !== currency.id));
    } catch {
      toast.error("Eroare la ștergere");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-orange-400 flex items-center justify-center">
        <div className="!text-white text-xl animate-pulse">Se încarcă...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-orange-400">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="!text-white/80 hover:!text-white text-sm transition-colors"
            >
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold !text-white">💱 Valute</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="!text-white/80 text-sm hidden sm:block">{user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 !text-white border border-white/30 rounded-xl px-4 py-2 text-sm font-medium transition-all"
            >
              Ieșire
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Preset buttons */}
        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg">
          <h2 className="!text-white font-semibold mb-4">Adaugă valute populare</h2>
          <div className="flex flex-wrap gap-3">
            {PRESET_CURRENCIES.map((preset) => {
              const exists = currencies.some((c) => c.code === preset.code);
              return (
                <button
                  key={preset.code}
                  onClick={() => handleAddPreset(preset)}
                  disabled={exists || addingCode === preset.code}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                    exists
                      ? "bg-white/5 border-white/10 !text-white/40 cursor-not-allowed"
                      : "bg-white text-teal-700 border-transparent hover:bg-white/90"
                  }`}
                >
                  <span className="text-lg">{preset.symbol}</span>
                  <span>{preset.code}</span>
                  {exists && <span className="text-xs">✓</span>}
                  {addingCode === preset.code && <span className="text-xs">...</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold !text-white">Valutele mele</h2>
              <span className="bg-white/20 !text-white text-xs px-2 py-1 rounded-full border border-white/30">
                {currencies.length} valute
              </span>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center !text-white animate-pulse">Se încarcă...</div>
            ) : currencies.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl mb-3">💱</p>
                <p className="!text-white font-semibold text-lg">Nu ai valute adăugate</p>
                <p className="!text-white/60 text-sm mt-1">Folosește butoanele de mai sus pentru a adăuga valute</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left px-6 py-4 !text-white/70 text-sm font-medium uppercase tracking-wide">Simbol</th>
                    <th className="text-left px-6 py-4 !text-white/70 text-sm font-medium uppercase tracking-wide">Cod</th>
                    <th className="text-left px-6 py-4 !text-white/70 text-sm font-medium uppercase tracking-wide">Nume</th>
                    <th className="text-right px-6 py-4 !text-white/70 text-sm font-medium uppercase tracking-wide">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map((currency, index) => (
                    <tr
                      key={currency.id}
                      className={`border-b border-white/10 hover:bg-white/10 transition-colors ${
                        index === currencies.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-2xl font-bold !text-white">{currency.symbol}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-white/20 !text-white font-mono font-semibold px-3 py-1 rounded-lg text-sm">
                          {currency.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="!text-white">{currency.name}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(currency)}
                          disabled={deletingId === currency.id}
                          className="bg-red-500/30 hover:bg-red-500/50 !text-white border border-red-400/30 rounded-lg px-3 py-1.5 text-sm transition-all disabled:opacity-50"
                        >
                          {deletingId === currency.id ? "..." : "Șterge"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
