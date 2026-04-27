"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/app/dashboard/components/DashboardNav";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

type Period = "current" | "3months" | "6months" | "all";

interface PieEntry {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  value: number;
  percent: number;
  [key: string]: unknown;
}

interface BarEntry {
  month: string;
  label: string;
  expenses: number;
  income: number;
}

interface ReportsData {
  pieData: PieEntry[];
  barData: BarEntry[];
  summary: { totalIncome: number; totalExpenses: number };
}

const PERIOD_LABELS: Record<Period, string> = {
  current:  "Luna curentă",
  "3months": "Ultimele 3 luni",
  "6months": "Ultimele 6 luni",
  all:      "Tot timpul",
};

// Fallback palette când categoria nu are culoare proprie
const FALLBACK_COLORS = [
  "#14b8a6", "#6366f1", "#f59e0b", "#ef4444", "#10b981",
  "#8b5cf6", "#f97316", "#06b6d4", "#84cc16", "#ec4899",
];

function formatRON(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Custom tooltip pentru Pie
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PieEntry;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-900">{d.icon} {d.name}</p>
      <p className="text-gray-600 mt-0.5">{formatRON(d.value)} RON</p>
      <p className="text-gray-400">{d.percent}% din total</p>
    </div>
  );
}

// Custom tooltip pentru Bar
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="mt-0.5">
          {p.name}: {formatRON(p.value)} RON
        </p>
      ))}
    </div>
  );
}

// Custom legend pentru Pie
function PieLegend({ pieData }: { pieData: PieEntry[] }) {
  return (
    <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
      {pieData.map((entry, i) => (
        <div key={entry.categoryId ?? i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: entry.color !== "#6366f1" ? entry.color : FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
            />
            <span className="text-sm text-gray-700 truncate">{entry.icon} {entry.name}</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 shrink-0">{entry.percent}%</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>("3months");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/reports?period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Eroare la încărcarea rapoartelor");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl animate-pulse">Se încarcă...</div>
      </div>
    );
  }

  if (!user) return null;

  const pieData = data?.pieData ?? [];
  const barData = data?.barData ?? [];
  const hasPie = pieData.length > 0;
  const hasBar = barData.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">

        {/* Header + filtre perioadă */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Rapoarte</h1>
            <p className="text-gray-500 text-sm mt-0.5">Analiza cheltuielilor și veniturilor tale</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  period === p
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-700"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Sumar perioadă */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💸</span>
                <p className="text-red-700 text-sm font-medium">Total cheltuieli</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                -{formatRON(data.summary.totalExpenses)} RON
              </p>
              <p className="text-red-400 text-xs mt-1">{PERIOD_LABELS[period]}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💰</span>
                <p className="text-green-700 text-sm font-medium">Total venituri</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                +{formatRON(data.summary.totalIncome)} RON
              </p>
              <p className="text-green-400 text-xs mt-1">{PERIOD_LABELS[period]}</p>
            </div>
            {(() => {
              const balance = data.summary.totalIncome - data.summary.totalExpenses;
              const positive = balance >= 0;
              return (
                <div className={`rounded-2xl p-5 shadow-sm border ${positive ? "bg-teal-50 border-teal-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{positive ? "📈" : "📉"}</span>
                    <p className={`text-sm font-medium ${positive ? "text-teal-700" : "text-red-700"}`}>Balanță</p>
                  </div>
                  <p className={`text-2xl font-bold ${positive ? "text-teal-600" : "text-red-600"}`}>
                    {positive ? "+" : ""}{formatRON(balance)} RON
                  </p>
                  <p className={`text-xs mt-1 ${positive ? "text-teal-400" : "text-red-400"}`}>{PERIOD_LABELS[period]}</p>
                </div>
              );
            })()}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="bg-gray-100 border border-gray-300 rounded-2xl p-16 text-center">
            <p className="text-4xl animate-pulse">📊</p>
            <p className="text-gray-500 mt-3">Se încarcă datele...</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Pie Chart — cheltuieli pe categorii */}
            <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 shadow-lg">
              <h2 className="font-bold text-gray-900 mb-1">Cheltuieli pe categorii</h2>
              <p className="text-gray-500 text-xs mb-4">{PERIOD_LABELS[period]}</p>

              {hasPie ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell
                            key={entry.categoryId ?? i}
                            fill={entry.color !== "#6366f1" ? entry.color : FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend pieData={pieData.map((e, i) => ({
                    ...e,
                    color: e.color !== "#6366f1" ? e.color : FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                  }))} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-4xl mb-3">🗂️</p>
                  <p className="text-gray-500 text-sm">Nu există cheltuieli cu categorii<br />pentru perioada selectată</p>
                </div>
              )}
            </div>

            {/* Bar Chart — cheltuieli și venituri pe luni */}
            <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 shadow-lg">
              <h2 className="font-bold text-gray-900 mb-1">Venituri vs Cheltuieli pe luni</h2>
              <p className="text-gray-500 text-xs mb-4">{PERIOD_LABELS[period]}</p>

              {hasBar ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} barCategoryGap="30%" barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                        width={40}
                      />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: "#f3f4f6" }} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span style={{ color: "#374151", fontSize: 12 }}>
                            {value === "income" ? "Venituri" : "Cheltuieli"}
                          </span>
                        )}
                      />
                      <Bar dataKey="income"   name="income"   fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-4xl mb-3">📅</p>
                  <p className="text-gray-500 text-sm">Nu există tranzacții<br />pentru perioada selectată</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Top cheltuieli pe categorii — tabel detaliat */}
        {!loading && !error && hasPie && (
          <div className="bg-gray-100 border border-gray-300 rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-300">
              <h2 className="font-bold text-gray-900">Top cheltuieli pe categorii</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {pieData.map((entry, i) => (
                <div key={entry.categoryId ?? i} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <span className="text-2xl">{entry.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{entry.name}</p>
                    <div className="mt-1.5 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${entry.percent}%`,
                          backgroundColor: entry.color !== "#6366f1" ? entry.color : FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{formatRON(entry.value)} RON</p>
                    <p className="text-gray-400 text-xs">{entry.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
