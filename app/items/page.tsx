/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LocusItem } from "@/types";

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<LocusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "expired" | "valid">("all");

  // Fetch Items
  useEffect(() => {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LocusItem[];
      setItems(fetchedItems);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helpers
  // Usamos um estado para 'now' para garantir consistência na hidratação
  const [now, setNow] = useState<number>(0);
  
  useEffect(() => {
    // Usar setTimeout para evitar "setState synchronously in effect" warning
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  const getCalibrationStatus = (dueDate: number | null) => {
    if (!dueDate) return "na";
    if (now === 0) return "valid"; // Estado inicial seguro
    return dueDate < now ? "expired" : "valid";
  };

  const formatDate = (millis: number | null) => {
    if (!millis) return "N/A";
    return new Date(millis).toLocaleDateString("pt-BR");
  };

  // Filter Logic
  const filteredItems = items.filter((item) => {
    // Search Filter
    const matchesSearch =
      item.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Status Filter
    let matchesStatus = true;
    if (statusFilter !== "all") {
      const status = getCalibrationStatus(item.calibrationDueDate);
      if (statusFilter === "expired") matchesStatus = status === "expired";
      if (statusFilter === "valid") matchesStatus = status === "valid";
    }

    return matchesSearch && matchesStatus;
  });

  // Badge Component
  const StatusBadge = ({ dueDate }: { dueDate: number | null }) => {
    const status = getCalibrationStatus(dueDate);
    
    if (status === "na") {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">N/A</span>;
    }
    if (status === "expired") {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Vencido</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Vigente</span>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Inventário</h1>
          <button
            onClick={() => router.push("/items/new")}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Item
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por código, marca ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none sm:text-sm"
            />
          </div>
          
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "expired" | "valid")}
              className="block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none sm:text-sm"
            >
              <option value="all" className="text-gray-900">Todos os Status</option>
              <option value="valid" className="text-gray-900">Em dia</option>
              <option value="expired" className="text-gray-900">Vencidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-500">Carregando itens...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">Nenhum item encontrado</h3>
          <p className="mt-1 text-sm text-slate-500">Tente ajustar seus filtros ou cadastre um novo item.</p>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && filteredItems.length > 0 && (
        <div className="hidden md:block bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Foto</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Marca</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Criado em</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Calibração</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => router.push(`/items/${item.id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors even:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {item.assetCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-10 w-10 flex-shrink-0">
                      {item.photoUrl ? (
                        <img className="h-10 w-10 rounded-full object-cover" src={item.photoUrl} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {item.brand}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge dueDate={item.calibrationDueDate} />
                    <div className="text-xs text-slate-500 mt-1">
                      {formatDate(item.calibrationDueDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <span className="text-blue-600 hover:text-blue-900">Detalhes</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && filteredItems.length > 0 && (
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              onClick={() => router.push(`/items/${item.id}`)}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 active:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700 mb-1">
                    {item.assetCode}
                  </span>
                  <h3 className="font-semibold text-slate-900">{item.brand}</h3>
                </div>
                <StatusBadge dueDate={item.calibrationDueDate} />
              </div>
              
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                {item.description}
              </p>
              
              <div className="flex items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calibração: {formatDate(item.calibrationDueDate)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
