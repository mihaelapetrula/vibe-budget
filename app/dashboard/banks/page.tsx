"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardNav from "@/app/dashboard/components/DashboardNav";

interface Bank {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  "#6366f1", "#14b8a6", "#f97316", "#ef4444",
  "#22c55e", "#3b82f6", "#a855f7", "#ec4899",
  "#eab308", "#64748b",
];

export default function BanksPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchBanks();
  }, [user]);

  const fetchBanks = async () => {
    try {
      const res = await fetch("/api/banks");
      const data = await res.json();
      if (res.ok) setBanks(data.data);
    } catch {
      toast.error("Eroare la încărcarea băncilor");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingBank(null);
    setFormName("");
    setFormColor("#6366f1");
    setShowModal(true);
  };

  const openEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormName(bank.name);
    setFormColor(bank.color);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBank(null);
    setFormName("");
    setFormColor("#6366f1");
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Introduceți numele băncii");
      return;
    }

    setSaving(true);
    try {
      const url = editingBank ? `/api/banks/${editingBank.id}` : "/api/banks";
      const method = editingBank ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, color: formColor }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Eroare la salvare");
        return;
      }

      toast.success(editingBank ? "Bancă actualizată!" : "Bancă adăugată!");
      closeModal();
      fetchBanks();
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ștergi această bancă?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/banks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Eroare la ștergere");
        return;
      }
      toast.success("Bancă ștearsă!");
      setBanks((prev) => prev.filter((b) => b.id !== id));
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

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bănci</h2>
            <p className="text-gray-500 mt-1 text-sm">{banks.length} bancă/bănci înregistrate</p>
          </div>
          <button
            onClick={openAdd}
            className="bg-white text-teal-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all"
          >
            + Adaugă bancă
          </button>
        </div>

        {/* Table */}
        <div className="bg-gray-100 border border-gray-300 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-900 animate-pulse">Se încarcă băncile...</div>
            </div>
          ) : banks.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🏦</p>
              <p className="text-gray-900 font-semibold text-lg">Nu ai bănci adăugate</p>
              <p className="text-gray-500 text-sm mt-1">Click pe "Adaugă bancă" pentru a începe</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">
                    Culoare
                  </th>
                  <th className="text-left px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">
                    Nume bancă
                  </th>
                  <th className="text-right px-6 py-4 text-gray-500 text-sm font-medium uppercase tracking-wide">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {banks.map((bank, index) => (
                  <tr
                    key={bank.id}
                    className={`border-b border-gray-200 hover:bg-gray-100 transition-colors ${
                      index === banks.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: bank.color }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-800 font-medium">{bank.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(bank)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 text-sm transition-all"
                        >
                          Editează
                        </button>
                        <button
                          onClick={() => handleDelete(bank.id)}
                          disabled={deletingId === bank.id}
                          className="bg-red-500/30 hover:bg-red-500/50 text-gray-900 border border-red-400/30 rounded-lg px-3 py-1.5 text-sm transition-all disabled:opacity-50"
                        >
                          {deletingId === bank.id ? "..." : "Șterge"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-100 border border-gray-300 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {editingBank ? "Editează bancă" : "Adaugă bancă nouă"}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nume bancă
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: ING, Revolut, BCR..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Culoare
                </label>
                <div className="flex flex-wrap gap-3 mb-3">
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
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-gray-500 text-sm">sau alege culoare personalizată</span>
                </div>
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
