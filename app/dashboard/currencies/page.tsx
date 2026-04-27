"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardNav from "@/app/dashboard/components/DashboardNav";

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
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);

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

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCode.trim() || !customName.trim() || !customSymbol.trim()) {
      toast.error("Completează toate câmpurile");
      return;
    }
    setSavingCustom(true);
    try {
      const res = await fetch("/api/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: customCode.trim().toUpperCase(),
          name: customName.trim(),
          symbol: customSymbol.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Eroare la adăugare");
        return;
      }
      toast.success(`${customCode.toUpperCase()} adăugat!`);
      setCurrencies((prev) => [...prev, data.data]);
      setCustomCode("");
      setCustomName("");
      setCustomSymbol("");
      setShowCustomForm(false);
    } catch {
      toast.error("Eroare la adăugare");
    } finally {
      setSavingCustom(false);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl animate-pulse">Se încarcă...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Preset buttons */}
        <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 shadow-lg">
          <h2 className="text-gray-900 font-semibold mb-4">Adaugă valute populare</h2>
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
                      ? "bg-white/5 border-gray-100 text-gray-400 cursor-not-allowed"
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

          {/* Formular valută custom */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            {!showCustomForm ? (
              <button
                onClick={() => setShowCustomForm(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium transition-all"
              >
                + Adaugă altă valută manual
              </button>
            ) : (
              <form onSubmit={handleAddCustom} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cod (ex: CHF)</label>
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="CHF"
                    maxLength={10}
                    autoFocus
                    className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 w-28"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nume (ex: Swiss Franc)</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Swiss Franc"
                    className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 w-44"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Simbol (ex: Fr)</label>
                  <input
                    type="text"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    placeholder="Fr"
                    maxLength={5}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 w-24"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingCustom}
                    className="bg-white text-teal-700 font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-all text-sm disabled:opacity-60"
                  >
                    {savingCustom ? "..." : "Adaugă"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCustomForm(false); setCustomCode(""); setCustomName(""); setCustomSymbol(""); }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 rounded-xl px-4 py-2 text-sm transition-all"
                  >
                    Anulează
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">Valutele mele</h2>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full border border-gray-300">
                {currencies.length} valute
              </span>
            </div>
          </div>

          <div className="bg-gray-100 border border-gray-300 rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-900 animate-pulse">Se încarcă...</div>
            ) : currencies.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl mb-3">💱</p>
                <p className="text-gray-900 font-semibold text-lg">Nu ai valute adăugate</p>
                <p className="text-gray-500 text-sm mt-1">Folosește butoanele de mai sus pentru a adăuga valute</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Simbol</th>
                    <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Cod</th>
                    <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Nume</th>
                    <th className="text-right px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map((currency, index) => (
                    <tr
                      key={currency.id}
                      className={`border-b border-gray-200 hover:bg-gray-100 transition-colors ${
                        index === currencies.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-2xl font-bold text-gray-900">{currency.symbol}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-white text-gray-900 font-mono font-semibold px-3 py-1 rounded-lg text-sm">
                          {currency.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{currency.name}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(currency)}
                          disabled={deletingId === currency.id}
                          className="bg-red-500/30 hover:bg-red-500/50 text-gray-900 border border-red-400/30 rounded-lg px-3 py-1.5 text-sm transition-all disabled:opacity-50"
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
