/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User, signOut } from "firebase/auth";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { LocusItem } from "@/types";
import { User as UserIcon, LogOut } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [recentItems, setRecentItems] = useState<LocusItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchRecentItems = async () => {
      if (!user) return;
      setLoadingItems(true);
      try {
        const itemsQuery = query(
          collection(db, "items"),
          where("createdBy", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const snapshot = await getDocs(itemsQuery);
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LocusItem[];
        setRecentItems(items);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchRecentItems();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-slate-500 text-sm">Carregando perfil...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">
        Meu Perfil
      </h1>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-6">
        <div className="flex flex-col items-center md:items-start gap-4 md:w-1/3">
          <div className="h-24 w-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Foto do usuário"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-10 w-10 text-slate-400" />
            )}
          </div>
          <div className="text-center md:text-left">
            <div className="text-lg font-semibold text-slate-900">
              {user.displayName || "Usuário sem nome"}
            </div>
            <div className="text-sm text-slate-500">{user.email}</div>
            <div className="mt-2 text-xs text-slate-400 font-mono break-all">
              UID: {user.uid}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 inline-flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </button>
        </div>

        <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Últimos itens cadastrados por você
          </h2>

          {loadingItems && (
            <div className="text-sm text-slate-500">Carregando itens...</div>
          )}

          {!loadingItems && recentItems.length === 0 && (
            <div className="text-sm text-slate-500">
              Você ainda não cadastrou nenhum item.
            </div>
          )}

          {!loadingItems && recentItems.length > 0 && (
            <ul className="space-y-3">
              {recentItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col border border-slate-100 rounded-lg px-3 py-2.5 bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono text-slate-500">
                        {item.assetCode}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {item.brand}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {item.description}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
