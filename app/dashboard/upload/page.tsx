"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardNav from "@/app/dashboard/components/DashboardNav";

interface Bank {
  id: string;
  name: string;
  color: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/banks")
      .then((r) => r.json())
      .then((data) => { if (data.data) setBanks(data.data); })
      .catch(() => toast.error("Eroare la încărcarea băncilor"));
  }, [user]);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      toast.error("Doar fișiere CSV sau Excel (.xlsx, .xls)");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0] ?? null;
    handleFileChange(file);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Selectează un fișier");
      return;
    }
    if (!selectedBankId) {
      toast.error("Selectează banca");
      return;
    }
    // Logica de procesare — Săptămâna 5
    toast.info("Procesarea fișierelor vine în Săptămâna 5!");
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

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">

        {/* Upload card */}
        <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 shadow-lg space-y-5">
          <h2 className="text-lg font-bold text-gray-900">Importă tranzacții</h2>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
              dragOver
                ? "border-white bg-white"
                : "border-white/40 hover:border-white hover:bg-gray-100"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />

            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-4xl">✅</p>
                <p className="text-gray-900 font-semibold">{selectedFile.name}</p>
                <p className="text-gray-500 text-sm">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="text-gray-500 hover:text-gray-900 text-xs underline mt-1"
                >
                  Elimină fișierul
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-4xl">📂</p>
                <p className="text-gray-900 font-semibold">Trage fișierul aici</p>
                <p className="text-gray-500 text-sm">sau click pentru a selecta</p>
                <p className="text-gray-400 text-xs mt-2">CSV, XLSX, XLS</p>
              </div>
            )}
          </div>

          {/* Dropdown bancă */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Selectează banca <span className="!text-red-300">*</span>
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-black"
            >
              <option value="">Alege banca...</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {banks.length === 0 && (
              <p className="text-gray-400 text-xs mt-1">
                Nu ai bănci adăugate.{" "}
                <button
                  onClick={() => router.push("/dashboard/banks")}
                  className="text-gray-900 underline"
                >
                  Adaugă o bancă
                </button>
              </p>
            )}
          </div>

          {/* Buton Upload */}
          <button
            onClick={handleUpload}
            className="w-full bg-white text-teal-700 font-semibold py-3 rounded-xl hover:bg-white/90 transition-all"
          >
            📤 Upload & Procesează
          </button>
        </div>

        {/* Preview table */}
        <div className="bg-gray-100 border border-gray-300 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-300 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Preview tranzacții</h2>
            <span className="bg-white text-gray-500 text-xs px-2 py-1 rounded-full border border-gray-300">
              0 rânduri
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Dată</th>
                  <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Descriere</th>
                  <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Sumă</th>
                  <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Valută</th>
                  <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Categorie</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-gray-500 text-sm">
                      Încarcă un fișier pentru a vedea preview-ul tranzacțiilor
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Procesarea vine în Săptămâna 5
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
