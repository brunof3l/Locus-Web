"use client";

import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { onAuthStateChanged, type User, signInWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import type { LocusItem } from "@/types";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import * as XLSX from "xlsx";
import { FileDown, PlusCircle, AlertTriangle, Box, Calendar } from "lucide-react";
import Link from "next/link";

const COLLECTION_NAME = "items";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<LocusItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION_NAME));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedItems: LocusItem[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<LocusItem, "id">;
          return {
            id: doc.id,
            ...data,
          };
        });
        setItems(fetchedItems);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Falha ao carregar itens.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError("");
    } catch {
      setError("Falha no login. Verifique suas credenciais.");
    }
  };

  const exportToExcel = () => {
    if (items.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(
      items.map(item => ({
        ID: item.id,
        Codigo: item.assetCode,
        Marca: item.brand,
        Descricao: item.description,
        CriadoEm: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
        VencimentoCalibracao: item.calibrationDueDate ? new Date(item.calibrationDueDate).toLocaleDateString() : "N/A"
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patrimonio");
    XLSX.writeFile(workbook, "Locus_Exportacao.xlsx");
  };

  // KPIs Calculations
  const totalItems = items.length;
  
  // Usando estado para 'now' para evitar erro de hidratação/função impura
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Usar setTimeout para evitar "setState synchronously in effect" warning
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);

  const overdueItems = now 
    ? items.filter(i => i.calibrationDueDate && i.calibrationDueDate < now).length 
    : 0;
  
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const todayItems = items.filter(i => i.createdAt >= startOfToday.getTime()).length;

  // Chart Data (Group by Brand)
  const brandMap: Record<string, number> = {};

  items.forEach((item) => {
    // Normaliza: Remove espaços, converte para maiúsculo e trata nulos
    const rawBrand = item.brand || "Desconhecido";
    const brand = rawBrand.trim().toUpperCase();
    
    if (brandMap[brand]) {
      brandMap[brand]++;
    } else {
      brandMap[brand] = 1;
    }
  });

  // 2. Converte para Array e Ordena (Do maior para o menor)
  const sortedBrands = Object.entries(brandMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 3. Pega o Top 5
  const top5 = sortedBrands.slice(0, 5);

  // 4. Soma todo o restante na categoria "OUTROS"
  const othersCount = sortedBrands
    .slice(5)
    .reduce((acc, curr) => acc + curr.value, 0);

  // 5. Monta o array final
  const chartData = [...top5];
  if (othersCount > 0) {
    chartData.push({ name: "OUTROS", value: othersCount });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-blue-600">Carregando Locus...</div>
      </div>
    );
  }

  // Se não estiver logado, mostra tela de login (fullscreen, sobrepondo layout)
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-100">
         <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
            <h1 className="mb-6 text-3xl font-bold text-center text-blue-800">Locus Web</h1>
            <h2 className="mb-4 text-center text-lg text-gray-600">Acesso Administrativo</h2>
            
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="admin@locus.com"
                />
              </div>

              <div className="mb-6">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="********"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Entrar no Sistema
              </button>
            </form>
         </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Visão Geral do Patrimônio</h1>
        <p className="text-slate-500">Acompanhe as estatísticas do seu inventário em tempo real.</p>
      </header>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Box size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total de Itens</p>
            <p className="text-3xl font-bold text-slate-800">{totalItems}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Calibração Vencida</p>
            <p className="text-3xl font-bold text-slate-800">{overdueItems}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Novos Hoje</p>
            <p className="text-3xl font-bold text-slate-800">{todayItems}</p>
          </div>
        </div>
      </div>

      {/* Main Content: Chart & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição por Marca</h3>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => {
                      const color = entry.name === "OUTROS" ? "#e5e7eb" : COLORS[index % COLORS.length];
                      return <Cell key={`cell-${index}`} fill={color} stroke="none" />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                Sem dados suficientes para o gráfico
              </div>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex flex-col gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Ações Rápidas</h3>
            
            <div className="space-y-4">
              <Link href="/items/new" className="block w-full">
                <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-semibold transition-all shadow-blue-100 shadow-lg">
                  <PlusCircle size={20} />
                  Novo Item
                </button>
              </Link>

              <button 
                onClick={exportToExcel}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-lg font-semibold transition-all shadow-emerald-100 shadow-lg"
              >
                <FileDown size={20} />
                Exportar Excel
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
               <p className="text-sm text-slate-500 mb-2">Dica do Sistema:</p>
               <p className="text-xs text-slate-400">
                 Mantenha o cadastro de calibrações atualizado para receber alertas preventivos.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
