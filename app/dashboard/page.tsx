"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DashboardSummary {
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
  currency: string;
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      try {
        const res = await fetch("/api/dashboard/summary");
        const data = await res.json();

        if (!res.ok) {
          toast.error("Nu s-au putut încărca datele");
          return;
        }

        setSummary(data.data);
      } catch {
        toast.error("Eroare la încărcarea datelor");
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-orange-400 flex items-center justify-center">
        <div className="!text-white text-xl font-medium animate-pulse">Se încarcă...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-orange-400">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold !text-white">💰 Vibe Budget</h1>
            <nav className="hidden md:flex items-center gap-2">
              <button onClick={() => router.push("/dashboard/banks")} className="!text-white/80 hover:!text-white hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-all">🏦 Bănci</button>
              <button onClick={() => router.push("/dashboard/categories")} className="!text-white/80 hover:!text-white hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-all">🗂️ Categorii</button>
              <button onClick={() => router.push("/dashboard/currencies")} className="!text-white/80 hover:!text-white hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-all">💱 Valute</button>
            </nav>
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

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold !text-white">Bună ziua! 👋</h2>
          <p className="!text-white/70 mt-1">Rezumatul tău financiar</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Balance */}
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium !text-white/70 uppercase tracking-wide">
                Total Sold
              </span>
              <span className="text-3xl">💰</span>
            </div>
            {loadingSummary ? (
              <div className="h-9 bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-bold !text-white">
                {formatAmount(summary?.totalBalance ?? 0, summary?.currency ?? "RON")}
              </p>
            )}
            <p className="!text-white/60 text-xs mt-2">Toate tranzacțiile</p>
          </div>

          {/* Monthly Income */}
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium !text-white/70 uppercase tracking-wide">
                Venituri Luna
              </span>
              <span className="text-3xl">📈</span>
            </div>
            {loadingSummary ? (
              <div className="h-9 bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-bold !text-white">
                {formatAmount(summary?.monthIncome ?? 0, summary?.currency ?? "RON")}
              </p>
            )}
            <p className="!text-white/60 text-xs mt-2">Luna curentă</p>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium !text-white/70 uppercase tracking-wide">
                Cheltuieli Luna
              </span>
              <span className="text-3xl">📉</span>
            </div>
            {loadingSummary ? (
              <div className="h-9 bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-bold !text-white">
                {formatAmount(summary?.monthExpenses ?? 0, summary?.currency ?? "RON")}
              </p>
            )}
            <p className="!text-white/60 text-xs mt-2">Luna curentă</p>
          </div>
        </div>

        {/* Empty state */}
        {!loadingSummary && summary?.totalBalance === 0 && (
          <div className="mt-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">📂</p>
            <p className="!text-white font-semibold text-lg">Nu ai tranzacții încă</p>
            <p className="!text-white/60 text-sm mt-1">
              Importă un extras bancar pentru a vedea datele tale financiare
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
