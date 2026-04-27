"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardNav from "@/app/dashboard/components/DashboardNav";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  bankId: string | null;
  categoryId: string | null;
}

interface Bank {
  id: string;
  name: string;
  color: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
}

interface TransactionForm {
  date: string;
  description: string;
  amount: string;
  currency: string;
  bankId: string;
  categoryId: string;
}

const EMPTY_FORM: TransactionForm = {
  date: "",
  description: "",
  amount: "",
  currency: "RON",
  bankId: "",
  categoryId: "",
};

const CURRENCIES = ["RON", "EUR", "USD", "GBP"];

function formatDateRO(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
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

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterBankId, setFilterBankId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/banks").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([banksData, catsData]) => {
        if (banksData.data) setBanks(banksData.data);
        if (catsData.data) setCategories(catsData.data);
      })
      .catch(() => {
        toast.error("Eroare la încărcarea datelor de referință");
      });
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBankId)     params.set("bankId", filterBankId);
      if (filterCategoryId) params.set("categoryId", filterCategoryId);
      if (filterStartDate)  params.set("startDate", filterStartDate);
      if (filterEndDate)    params.set("endDate", filterEndDate);
      if (filterSearch)     params.set("search", filterSearch);

      const url = `/api/transactions${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) setTransactions(data.data);
      else toast.error(data.error ?? "Eroare la încărcarea tranzacțiilor");
    } catch {
      toast.error("Eroare la încărcarea tranzacțiilor");
    } finally {
      setLoading(false);
    }
  }, [filterBankId, filterCategoryId, filterStartDate, filterEndDate, filterSearch]);

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
  }, [user, fetchTransactions]);

  const openAdd = () => {
    setEditingTransaction(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setForm({
      date:        tx.date,
      description: tx.description,
      amount:      String(tx.amount),
      currency:    tx.currency,
      bankId:      tx.bankId     ?? "",
      categoryId:  tx.categoryId ?? "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (field: keyof TransactionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.date) {
      toast.error("Data este obligatorie");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Descrierea este obligatorie");
      return;
    }
    if (!form.amount || isNaN(Number(form.amount))) {
      toast.error("Suma este obligatorie și trebuie să fie un număr");
      return;
    }

    setSaving(true);
    try {
      const url    = editingTransaction ? `/api/transactions/${editingTransaction.id}` : "/api/transactions";
      const method = editingTransaction ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date:        form.date,
          description: form.description,
          amount:      Number(form.amount),
          currency:    form.currency,
          bankId:      form.bankId     || null,
          categoryId:  form.categoryId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Eroare la salvare");
        return;
      }

      toast.success(editingTransaction ? "Tranzacție actualizată!" : "Tranzacție adăugată!");
      closeModal();
      fetchTransactions();
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ștergi această tranzacție?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Eroare la ștergere");
        return;
      }
      toast.success("Tranzacție ștearsă!");
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
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

  const resetFilters = () => {
    setFilterBankId("");
    setFilterCategoryId("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterSearch("");
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

      <main className="container mx-auto px-4 py-8">
        {/* Titlu + buton Adaugă */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tranzacții</h2>
            <p className="text-gray-500 mt-1 text-sm">{transactions.length} tranzacții</p>
          </div>
          <button
            onClick={openAdd}
            className="bg-white text-teal-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all"
          >
            + Adaugă tranzacție
          </button>
        </div>

        {/* Filtre */}
        <div className="bg-gray-100 border border-gray-300 rounded-2xl p-4 mb-6 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Caută descriere..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />

            <select
              value={filterBankId}
              onChange={(e) => setFilterBankId(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-black"
            >
              <option value="">Toate băncile</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-black"
            >
              <option value="">Toate categoriile</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&::-webkit-calendar-picker-indicator]:invert"
            />

            <div className="flex gap-2">
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&::-webkit-calendar-picker-indicator]:invert"
              />
              <button
                onClick={resetFilters}
                title="Resetează filtre"
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 rounded-xl px-3 py-2 text-sm transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="bg-gray-100 border border-gray-300 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-900 animate-pulse">Se încarcă tranzacțiile...</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">💳</p>
              <p className="text-gray-900 font-semibold text-lg">Nu există tranzacții</p>
              <p className="text-gray-500 text-sm mt-1">Adaugă o tranzacție sau ajustează filtrele</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Dată</th>
                    <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Descriere</th>
                    <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Bancă</th>
                    <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Categorie</th>
                    <th className="text-right px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Sumă</th>
                    <th className="text-right px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => {
                    const bank     = tx.bankId     ? banks.find((b) => b.id === tx.bankId)         : null;
                    const category = tx.categoryId ? categories.find((c) => c.id === tx.categoryId): null;
                    const isLast   = index === transactions.length - 1;

                    return (
                      <tr
                        key={tx.id}
                        className={`border-b border-gray-200 hover:bg-gray-100 transition-colors ${isLast ? "border-b-0" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <span className="text-gray-900 text-sm whitespace-nowrap">{formatDateRO(tx.date)}</span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="text-gray-800 font-medium text-sm truncate block">{tx.description}</span>
                        </td>
                        <td className="px-6 py-4">
                          {bank ? (
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-gray-900 whitespace-nowrap"
                              style={{ backgroundColor: bank.color + "99" }}
                            >
                              {bank.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {category ? (
                            <span className="flex items-center gap-1.5 text-sm text-gray-900 whitespace-nowrap">
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Necategorizat</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold text-sm whitespace-nowrap ${tx.amount >= 0 ? "!text-green-300" : "!text-red-300"}`}>
                            {tx.amount >= 0 ? "+" : ""}
                            {formatAmount(tx.amount, tx.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(tx)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 text-sm transition-all"
                            >
                              Editează
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              disabled={deletingId === tx.id}
                              className="bg-red-500/30 hover:bg-red-500/50 text-gray-900 border border-red-400/30 rounded-lg px-3 py-1.5 text-sm transition-all disabled:opacity-50"
                            >
                              {deletingId === tx.id ? "..." : "Șterge"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-100 border border-gray-300 rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {editingTransaction ? "Editează tranzacție" : "Adaugă tranzacție"}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dată <span className="!text-red-300">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50 [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descriere <span className="!text-red-300">*</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  placeholder="ex: MEGA IMAGE, Salariu..."
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Sumă <span className="!text-red-300">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => handleFormChange("amount", e.target.value)}
                    placeholder="-45.50"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <p className="text-gray-400 text-xs mt-1">Negativ = cheltuială, pozitiv = venit</p>
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valută</label>
                  <select
                    value={form.currency}
                    onChange={(e) => handleFormChange("currency", e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-black"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bancă</label>
                <select
                  value={form.bankId}
                  onChange={(e) => handleFormChange("bankId", e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-black"
                >
                  <option value="">Fără bancă</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categorie</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => handleFormChange("categoryId", e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-black"
                >
                  <option value="">Necategorizat</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 rounded-xl py-3 font-medium transition-all"
              >
                Anulează
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-white text-teal-700 font-semibold py-3 rounded-xl hover:bg-white/90 transition-all disabled:opacity-60"
              >
                {saving ? "Se salvează..." : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
