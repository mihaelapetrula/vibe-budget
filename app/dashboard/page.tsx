"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardNav from "@/app/dashboard/components/DashboardNav";

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
  const { user, loading: authLoading, supabase: _supabase } = useAuth();
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl font-medium animate-pulse">Se încarcă...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Bună ziua! 👋</h2>
          <p className="text-gray-500 mt-1">Rezumatul tău financiar</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Balance */}
          <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Total Sold
              </span>
              <span className="text-3xl">💰</span>
            </div>
            {loadingSummary ? (
              <div className="h-9 bg-gray-50 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {formatAmount(summary?.totalBalance ?? 0, summary?.currency ?? "RON")}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-2">Toate tranzacțiile</p>
          </div>

          {/* Monthly Income */}
          <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Venituri Luna
              </span>
              <span className="text-3xl">📈</span>
            </div>
            {loadingSummary ? (
              <div className="h-9 bg-gray-50 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {formatAmount(summary?.monthIncome ?? 0, summary?.currency ?? "RON")}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-2">Luna curentă</p>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Cheltuieli Luna
              </span>
              <span className="text-3xl">📉</span>
            </div>
            {loadingSummary ? (
              <div className="h-9 bg-gray-50 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {formatAmount(summary?.monthExpenses ?? 0, summary?.currency ?? "RON")}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-2">Luna curentă</p>
          </div>
        </div>

        {/* Empty state */}
        {!loadingSummary && summary?.totalBalance === 0 && (
          <div className="mt-8 bg-gray-50 backdrop-blur-md border border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">📂</p>
            <p className="text-gray-900 font-semibold text-lg">Nu ai tranzacții încă</p>
            <p className="text-gray-500 text-sm mt-1">
              Importă un extras bancar pentru a vedea datele tale financiare
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
