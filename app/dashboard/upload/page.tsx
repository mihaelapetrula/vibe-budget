"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardNav from "@/app/dashboard/components/DashboardNav";
import { parseCSV, parseExcel, type ParsedTransaction } from "@/lib/utils/file-parser";

interface Bank {
  id: string;
  name: string;
  color: string;
}

interface ImportResult {
  imported: number;
  categorized: number;
}

function formatDateRO(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("ro-RO", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function UploadPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/banks")
      .then((r) => r.json())
      .then((data) => { if (data.data) setBanks(data.data); })
      .catch(() => toast.error("Eroare la încărcarea băncilor"));
  }, [user]);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      toast.error("Doar fișiere CSV sau Excel (.xlsx, .xls)");
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setUploadError(null);
    setImportResult(null);
    setParsedTransactions([]);
    setParsing(true);

    try {
      const result = ext === "csv"
        ? await parseCSV(file)
        : await parseExcel(file);

      if (!result.success || result.transactions.length === 0) {
        setParseError(result.error ?? "Nu s-au găsit tranzacții în fișier");
        toast.error(result.error ?? "Nu s-au găsit tranzacții în fișier");
      } else {
        setParsedTransactions(result.transactions);
        toast.success(`${result.transactions.length} tranzacții găsite!`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Eroare la citirea fișierului";
      setParseError(msg);
      toast.error(msg);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0] ?? null;
    handleFileChange(file);
  };

  const handleRemoveFile = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFile(null);
    setParsedTransactions([]);
    setParseError(null);
    setUploadError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selectează un fișier");
      return;
    }
    if (!selectedBankId) {
      toast.error("Selectează banca");
      return;
    }
    if (parsedTransactions.length === 0) {
      toast.error("Nu există tranzacții de importat");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const payload = parsedTransactions.map((tx) => ({ ...tx, bankId: selectedBankId }));
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ transactions: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error ?? "Eroare la import";
        setUploadError(errMsg);
        toast.error(errMsg);
        return;
      }

      setImportResult({ imported: data.imported, categorized: data.categorized });
      toast.success(
        `${data.imported} tranzacții importate${data.categorized > 0 ? `, ${data.categorized} categorizate automat` : ""}!`
      );
    } catch {
      const errMsg = "Eroare de rețea. Verifică conexiunea și încearcă din nou.";
      setUploadError(errMsg);
      toast.error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl animate-pulse">Se încarcă...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">

        {/* Succes card */}
        {importResult && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <p className="text-4xl">🎉</p>
              <div className="flex-1">
                <h3 className="font-bold text-green-800 text-lg mb-1">Import finalizat!</h3>
                <p className="text-green-700 text-sm mb-1">
                  <span className="font-semibold">{importResult.imported} tranzacții</span> importate cu succes.
                </p>
                {importResult.categorized > 0 && (
                  <p className="text-green-600 text-sm">
                    <span className="font-semibold">{importResult.categorized}</span> categorizate automat pe baza regulilor tale.
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => router.push("/dashboard/transactions")}
                    className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                  >
                    Vezi tranzacțiile
                  </button>
                  <button
                    onClick={() => handleRemoveFile()}
                    className="bg-white hover:bg-gray-50 text-green-700 border border-green-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                  >
                    Încarcă alt fișier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload card */}
        {!importResult && (
          <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6 shadow-lg space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Importă tranzacții</h2>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !parsing && !uploading && fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                dragOver
                  ? "border-teal-400 bg-teal-50"
                  : "border-gray-300 hover:border-teal-400 hover:bg-white"
              } ${parsing || uploading ? "cursor-wait opacity-70" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              {parsing ? (
                <div className="space-y-3">
                  <p className="text-4xl animate-spin">⚙️</p>
                  <p className="text-gray-600 font-semibold">Se procesează fișierul...</p>
                  <p className="text-gray-400 text-sm">Te rugăm să aștepți</p>
                </div>
              ) : parseError ? (
                <div className="space-y-2">
                  <p className="text-4xl">❌</p>
                  <p className="text-red-600 font-semibold">Eroare la citire</p>
                  <p className="text-red-500 text-sm">{parseError}</p>
                  <button
                    onClick={handleRemoveFile}
                    className="text-gray-500 hover:text-gray-700 text-xs underline mt-1"
                  >
                    Încearcă alt fișier
                  </button>
                </div>
              ) : selectedFile && parsedTransactions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-4xl">✅</p>
                  <p className="text-gray-900 font-semibold">{selectedFile.name}</p>
                  <p className="text-teal-600 font-medium text-sm">
                    {parsedTransactions.length} tranzacții găsite
                  </p>
                  <p className="text-gray-400 text-xs">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={handleRemoveFile}
                    className="text-gray-500 hover:text-gray-700 text-xs underline mt-1"
                  >
                    Elimină fișierul
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-4xl">📂</p>
                  <p className="text-gray-700 font-semibold">Trage fișierul aici</p>
                  <p className="text-gray-500 text-sm">sau click pentru a selecta</p>
                  <p className="text-gray-400 text-xs mt-2">CSV, XLSX, XLS</p>
                </div>
              )}
            </div>

            {/* Dropdown bancă */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Selectează banca <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 [&>option]:text-black"
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
                    className="text-teal-600 underline"
                  >
                    Adaugă o bancă
                  </button>
                </p>
              )}
            </div>

            {/* Eroare upload */}
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-red-500 text-lg">⚠️</span>
                <p className="text-red-700 text-sm">{uploadError}</p>
              </div>
            )}

            {/* Buton Upload */}
            <button
              onClick={handleUpload}
              disabled={parsing || uploading || parsedTransactions.length === 0}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  Se importă {parsedTransactions.length} tranzacții...
                </>
              ) : parsing ? (
                "Se procesează..."
              ) : (
                `📤 Importă ${parsedTransactions.length > 0 ? parsedTransactions.length + " tranzacții" : ""}`
              )}
            </button>
          </div>
        )}

        {/* Preview table */}
        {!importResult && (
          <div className="bg-gray-100 border border-gray-300 rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-300 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Preview tranzacții</h2>
              <span className="bg-white text-gray-500 text-xs px-2 py-1 rounded-full border border-gray-300">
                {parsedTransactions.length} rânduri
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Dată</th>
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Descriere</th>
                    <th className="text-right px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Sumă</th>
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Valută</th>
                    <th className="text-left px-6 py-3 text-gray-500 text-xs font-medium uppercase tracking-wide">Tip</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-3xl mb-2">📋</p>
                        <p className="text-gray-500 text-sm">
                          {parseError
                            ? "Eroare la citirea fișierului"
                            : "Încarcă un fișier pentru a vedea preview-ul tranzacțiilor"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    parsedTransactions.map((tx, index) => (
                      <tr
                        key={index}
                        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                          index === parsedTransactions.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="px-6 py-3 text-gray-700 text-sm whitespace-nowrap">
                          {formatDateRO(tx.date)}
                        </td>
                        <td className="px-6 py-3 text-gray-800 text-sm max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className={`px-6 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                          tx.amount >= 0 ? "text-green-600" : "text-red-500"
                        }`}>
                          {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-gray-600 text-sm">
                          {tx.currency ?? "RON"}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.type === "credit"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {tx.type === "credit" ? "Intrare" : "Ieșire"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
