/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, type FormEvent, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LocusItem } from "@/types";

interface ItemDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [item, setItem] = useState<LocusItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [responsibleSector, setResponsibleSector] = useState("");
  const [state, setState] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [calibrationDate, setCalibrationDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const ref = doc(db, "items", id);
        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
          setError("Item não encontrado.");
          setLoading(false);
          return;
        }

        const data = snapshot.data() as Omit<LocusItem, "id">;
        const loadedItem: LocusItem = {
          id: snapshot.id,
          ...data,
        };

        setItem(loadedItem);
        // Initialize form states
        setBrand(loadedItem.brand || "");
        setModel(loadedItem.model || "");
        setSerialNumber(loadedItem.serialNumber || "");
        setLocation(loadedItem.location || "");
        setResponsibleSector(loadedItem.responsibleSector || "");
        setState(loadedItem.state || "Novo");
        setDescription(loadedItem.description || "");
        setNotes(loadedItem.notes || "");

        if (loadedItem.calibrationDueDate) {
          const date = new Date(loadedItem.calibrationDueDate);
          if (!Number.isNaN(date.getTime())) {
            setCalibrationDate(date.toISOString().slice(0, 10));
          }
        }

        setLoading(false);
      } catch {
        setError("Erro ao carregar o item.");
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const formatDateTime = (millis: number) => {
    if (!millis) return "N/A";
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("pt-BR");
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let calibrationDueDate: number | null = null;
      if (calibrationDate) {
        const [y, m, d] = calibrationDate.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        calibrationDueDate = dateObj.getTime();
      }

      const ref = doc(db, "items", item.id as string);
      
      const updateData: Partial<LocusItem> = {
        brand,
        model,
        serialNumber,
        location,
        responsibleSector,
        state,
        description,
        notes,
        calibrationDueDate,
        descriptionLower: description.toLowerCase(),
      };

      await updateDoc(ref, updateData);

      setSuccessMessage("Alterações salvas com sucesso.");
    } catch {
      setError("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const ref = doc(db, "items", item.id as string);
      await deleteDoc(ref);
      router.push("/items");
    } catch {
      setError("Erro ao excluir o item. Tente novamente.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-slate-500">Carregando item...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-lg font-semibold text-red-700 mb-2">
            Não foi possível carregar o item
          </h1>
          <p className="text-sm text-red-600 mb-4">
            {error || "O item solicitado não foi encontrado."}
          </p>
          <button
            onClick={() => router.push("/items")}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Voltar para a lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Detalhes do Ativo
          </h1>
          <p className="text-sm text-slate-500">
            Código do ativo:{" "}
            <span className="font-mono font-semibold">{item.assetCode}</span>
          </p>
        </div>
        <button
          onClick={() => router.push("/items")}
          className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Voltar
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 space-y-6">
        <div className="flex justify-center mb-4 md:mb-6">
            <div className="w-32 h-32 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
              {item.photoUrl ? (
                <img
                  src={item.photoUrl}
                  alt="Foto do ativo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-400 text-xs px-2">
                  Nenhuma foto
                </div>
              )}
            </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Grupo 1: Dados do Equipamento */}
            <div className="md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-3">Dados do Equipamento</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Código do Ativo
              </label>
              <input
                type="text"
                value={item.assetCode}
                disabled
                className="w-full bg-slate-100 border border-slate-300 text-slate-500 text-sm rounded-lg p-2.5 min-h-[48px] cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-slate-700 mb-1">
                Número de Série
              </label>
              <input
                id="serialNumber"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 min-h-[48px]"
              />
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-slate-700 mb-1">
                Marca
              </label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 min-h-[48px]"
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-slate-700 mb-1">
                Modelo
              </label>
              <input
                id="model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 min-h-[48px]"
              />
            </div>

            {/* Grupo 2: Localização e Responsável */}
            <div className="md:col-span-2 mt-2">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-3">Localização e Responsável</h3>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                Localização Física
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 min-h-[48px]"
              />
            </div>

            <div>
              <label htmlFor="responsibleSector" className="block text-sm font-medium text-slate-700 mb-1">
                Setor Responsável
              </label>
              <input
                id="responsibleSector"
                type="text"
                value={responsibleSector}
                onChange={(e) => setResponsibleSector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 min-h-[48px]"
              />
            </div>

             {/* Grupo 3: Estado e Detalhes */}
             <div className="md:col-span-2 mt-2">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-3">Estado e Detalhes</h3>
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">
                Estado de Conservação
              </label>
              <select
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 min-h-[48px]"
              >
                <option value="Novo">Novo</option>
                <option value="Usado">Usado</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Defeituoso">Defeituoso</option>
              </select>
            </div>

            <div>
              <label htmlFor="calibrationDate" className="block text-sm font-medium text-slate-700 mb-1">
                Próxima Calibração
              </label>
              <input
                id="calibrationDate"
                type="date"
                value={calibrationDate}
                onChange={(e) => setCalibrationDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 min-h-[48px]"
              />
            </div>

            {/* Grupo 4: Área de Texto */}
            <div className="md:col-span-2 mt-2">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-3">Informações Adicionais</h3>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Descrição
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                Observações / Histórico
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Detalhes adicionais, histórico de manutenção, etc."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 resize-none"
              />
            </div>

          </div>

          <div className="flex flex-col-reverse md:flex-row gap-3 pt-6 border-t border-slate-200">
             <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full md:w-auto px-5 py-2.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:ring-4 focus:outline-none focus:ring-red-100 disabled:opacity-50 min-h-[48px]"
            >
              {deleting ? "Excluindo..." : "Excluir Item"}
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => router.push("/items")}
              className="w-full md:w-auto px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:ring-4 focus:outline-none focus:ring-slate-100 min-h-[48px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 disabled:opacity-50 min-h-[48px]"
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>

        </form>

        {successMessage && (
          <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 space-y-1">
            <p>
              Criado por:{" "}
              <span className="font-mono">{item.createdBy || "N/A"}</span>
            </p>
            <p>
              Em: <span className="font-mono">{formatDateTime(item.createdAt)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
