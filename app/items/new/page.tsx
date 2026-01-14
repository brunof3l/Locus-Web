"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { LocusItem } from "@/types";
import { onAuthStateChanged, type User } from "firebase/auth";

export default function NewItemPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  
  // Estados do Fluxo
  const [isScanning, setIsScanning] = useState(false);
  const [assetCode, setAssetCode] = useState<string | null>(null);
  
  // Estados do Formulário
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [calibrationDate, setCalibrationDate] = useState(""); // YYYY-MM-DD
  
  // Estados de UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Inicializar Scanner
  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Sucesso
          setAssetCode(decodedText);
          setIsScanning(false);
          scanner.clear().catch((err) => console.error("Erro ao limpar scanner", err));
        },
        () => {
          // Erro de leitura contínuo (ignorar logs excessivos)
          // console.log(errorMessage);
        }
      );

      // Cleanup se o usuário cancelar ou desmontar
      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [isScanning]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode || !brand || !description || !user) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Conversão da data para timestamp (local midnight)
      let calibrationDueDate: number | null = null;
      if (calibrationDate) {
        const [y, m, d] = calibrationDate.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        calibrationDueDate = dateObj.getTime();
      }

      const newItem: Omit<LocusItem, "id"> = {
        assetCode,
        brand,
        description,
        createdBy: user.uid,
        createdAt: Date.now(),
        calibrationDueDate,
      };

      await addDoc(collection(db, "items"), newItem);
      router.push("/items");
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setError("Erro ao salvar o item. Tente novamente.");
      setSaving(false);
    }
  };

  const handleCancelScan = () => {
    setIsScanning(false);
    // O useEffect cleanup cuidará de limpar o scanner
  };

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-24">
      <h1 className="text-2xl font-bold mb-4 text-slate-800">Novo Cadastro de Item</h1>

      {!assetCode && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-slate-200 text-center">
          {!isScanning ? (
            <div className="py-6">
              <div className="mb-4 text-slate-500">
                Para começar, escaneie o código de barras ou QR Code do ativo.
              </div>
              <button
                onClick={() => setIsScanning(true)}
                className="inline-flex items-center justify-center px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[48px] w-full max-w-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Escanear Código
              </button>
            </div>
          ) : (
            <div>
              <div
                id="reader"
                className="w-full max-w-full rounded-xl overflow-hidden border border-slate-200 min-h-[260px]"
              ></div>
              <button
                onClick={handleCancelScan}
                className="mt-4 w-full min-h-[48px] px-4 text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
              >
                Cancelar Leitura
              </button>
            </div>
          )}
        </div>
      )}

      {assetCode && (
        <form
          onSubmit={handleSave}
          className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-slate-200 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          
          {/* Código do Ativo (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código do Ativo</label>
            <div className="flex items-center">
              <input
                type="text"
                value={assetCode}
                readOnly
                className="flex-1 bg-slate-100 border border-slate-300 text-slate-500 text-sm rounded-lg p-2.5 min-h-[48px] cursor-not-allowed focus:ring-0 focus:border-slate-300"
              />
              <button
                type="button"
                onClick={() => {
                  if (confirm("Deseja escanear outro código? Os dados atuais serão perdidos.")) {
                    setAssetCode(null);
                    setBrand("");
                    setDescription("");
                    setCalibrationDate("");
                  }
                }}
                className="ml-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Alterar
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Este código foi lido do scanner e não pode ser editado manualmente.</p>
          </div>

          {/* Marca */}
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-slate-700 mb-1">Marca / Modelo</label>
            <input
              type="text"
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
              placeholder="Ex: Dell Inspiron, Makita..."
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-h-[48px]"
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Ex: Notebook do Financeiro, Furadeira de Impacto..."
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-h-[48px]"
            />
          </div>

          {/* Data de Calibração */}
          <div>
            <label htmlFor="calibrationDate" className="block text-sm font-medium text-slate-700 mb-1">Próxima Calibração (Opcional)</label>
            <input
              type="date"
              id="calibrationDate"
              value={calibrationDate}
              onChange={(e) => setCalibrationDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-h-[48px]"
            />
            <p className="mt-1 text-xs text-slate-500">Deixe em branco se não aplicável.</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={() => router.push("/items")}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 min-h-[48px]"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px]"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </>
              ) : (
                "Salvar Item"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
