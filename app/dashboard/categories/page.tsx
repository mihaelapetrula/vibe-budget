"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  isSystemCategory: boolean;
}

const INCOME_EMOJIS = ["💰", "💵", "💼", "📈", "🏆", "🎯", "💎", "🤝", "🏠", "🚀", "⭐", "🎁"];
const EXPENSE_EMOJIS = ["🏠", "🚗", "🍔", "🛒", "💊", "🎮", "✈️", "👗", "📱", "⚡", "🎓", "🐾", "🎵", "🏋️", "💇", "🛁"];

const PRESET_COLORS = [
  "#14b8a6", "#6366f1", "#f97316", "#ef4444",
  "#22c55e", "#3b82f6", "#a855f7", "#ec4899",
  "#eab308", "#64748b",
];

export default function CategoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formIcon, setFormIcon] = useState("📁");
  const [formColor, setFormColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok) setCategories(data.data);
    } catch {
      toast.error("Eroare la încărcarea categoriilor");
    } finally {
      setLoading(false);
    }
  };

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  const openAdd = (type: "income" | "expense") => {
    setEditingCategory(null);
    setFormName("");
    setFormType(type);
    setFormIcon(type === "income" ? "💰" : "🛒");
    setFormColor(type === "income" ? "#22c55e" : "#ef4444");
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormType(cat.type as "income" | "expense");
    setFormIcon(cat.icon);
    setFormColor(cat.color || "#6366f1");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Introduceți numele categoriei");
      return;
    }

    setSaving(true);
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, type: formType, icon: formIcon, color: formColor }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Eroare la salvare");
        return;
      }

      toast.success(editingCategory ? "Categorie actualizată!" : "Categorie adăugată!");
      closeModal();
      fetchCategories();
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (cat.isSystemCategory) {
      toast.error("Categoriile sistem nu pot fi șterse");
      return;
    }
    if (!confirm(`Ștergi categoria "${cat.name}"?`)) return;

    setDeletingId(cat.id);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Eroare la ștergere");
        return;
      }
      toast.success("Categorie ștearsă!");
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
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

  const emojiList = formType === "income" ? INCOME_EMOJIS : EXPENSE_EMOJIS;

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
            <h1 className="text-xl font-bold !text-white">🗂️ Categorii</h1>
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

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* INCOME TABLE */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📈</span>
              <h2 className="text-xl font-bold !text-white">Venituri</h2>
              <span className="bg-green-500/30 !text-white text-xs px-2 py-1 rounded-full border border-green-400/30">
                {income.length} categorii
              </span>
            </div>
            <button
              onClick={() => openAdd("income")}
              className="bg-white text-teal-700 font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-all text-sm"
            >
              + Adaugă venit
            </button>
          </div>

          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center !text-white animate-pulse">Se încarcă...</div>
            ) : income.length === 0 ? (
              <div className="p-8 text-center">
                <p className="!text-white/60 text-sm">Nu ai categorii de venituri. Adaugă una!</p>
              </div>
            ) : (
              <CategoryTable
                categories={income}
                onEdit={openEdit}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            )}
          </div>
        </div>

        {/* EXPENSE TABLE */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📉</span>
              <h2 className="text-xl font-bold !text-white">Cheltuieli</h2>
              <span className="bg-red-500/30 !text-white text-xs px-2 py-1 rounded-full border border-red-400/30">
                {expense.length} categorii
              </span>
            </div>
            <button
              onClick={() => openAdd("expense")}
              className="bg-white text-teal-700 font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-all text-sm"
            >
              + Adaugă cheltuială
            </button>
          </div>

          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center !text-white animate-pulse">Se încarcă...</div>
            ) : expense.length === 0 ? (
              <div className="p-8 text-center">
                <p className="!text-white/60 text-sm">Nu ai categorii de cheltuieli. Adaugă una!</p>
              </div>
            ) : (
              <CategoryTable
                categories={expense}
                onEdit={openEdit}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="text-xl font-bold !text-white mb-6">
              {editingCategory ? "Editează categorie" : `Adaugă categorie de ${formType === "income" ? "venit" : "cheltuială"}`}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium !text-white/90 mb-1.5">
                  Nume categorie
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: Salariu, Chirie, Mâncare..."
                  className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium !text-white/90 mb-3">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {emojiList.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setFormIcon(emoji)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        formIcon === emoji
                          ? "bg-white/40 scale-110 border border-white/60"
                          : "bg-white/10 hover:bg-white/20 border border-transparent"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="!text-white/70 text-sm">Ales:</span>
                  <span className="text-2xl">{formIcon}</span>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    maxLength={2}
                    className="bg-white/10 border border-white/30 rounded-lg px-2 py-1 text-white text-center w-16 text-lg focus:outline-none"
                    placeholder="✏️"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium !text-white/90 mb-3">
                  Culoare
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormColor(color)}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor: formColor === color ? "white" : "transparent",
                        transform: formColor === color ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={closeModal}
                className="flex-1 bg-white/10 hover:bg-white/20 !text-white border border-white/30 rounded-xl py-3 font-medium transition-all"
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

interface CategoryTableProps {
  categories: Category[];
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  deletingId: string | null;
}

function CategoryTable({ categories, onEdit, onDelete, deletingId }: CategoryTableProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-white/20">
          <th className="text-left px-6 py-4 !text-white/70 text-sm font-medium uppercase tracking-wide">Icon</th>
          <th className="text-left px-6 py-4 !text-white/70 text-sm font-medium uppercase tracking-wide">Nume</th>
          <th className="text-left px-6 py-4 !text-white/70 text-sm font-medium uppercase tracking-wide hidden sm:table-cell">Tip</th>
          <th className="text-right px-6 py-4 !text-white/70 text-sm font-medium uppercase tracking-wide">Acțiuni</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((cat, index) => (
          <tr
            key={cat.id}
            className={`border-b border-white/10 hover:bg-white/10 transition-colors ${
              index === categories.length - 1 ? "border-b-0" : ""
            }`}
          >
            <td className="px-6 py-4">
              <span
                className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: cat.color ? `${cat.color}33` : "#6366f133" }}
              >
                {cat.icon}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="!text-white font-medium">{cat.name}</span>
                {cat.isSystemCategory && (
                  <span className="bg-white/20 !text-white/70 text-xs px-2 py-0.5 rounded-full">
                    sistem
                  </span>
                )}
              </div>
            </td>
            <td className="px-6 py-4 hidden sm:table-cell">
              <span className={`text-xs px-2 py-1 rounded-full border ${
                cat.type === "income"
                  ? "bg-green-500/20 border-green-400/30 !text-white"
                  : "bg-red-500/20 border-red-400/30 !text-white"
              }`}>
                {cat.type === "income" ? "Venit" : "Cheltuială"}
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => onEdit(cat)}
                  disabled={cat.isSystemCategory}
                  className="bg-white/20 hover:bg-white/30 !text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Editează
                </button>
                <button
                  onClick={() => onDelete(cat)}
                  disabled={cat.isSystemCategory || deletingId === cat.id}
                  className="bg-red-500/30 hover:bg-red-500/50 !text-white border border-red-400/30 rounded-lg px-3 py-1.5 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingId === cat.id ? "..." : "Șterge"}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
