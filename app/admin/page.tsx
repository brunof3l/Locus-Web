/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Shield, User as UserIcon } from "lucide-react";

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  isAdmin?: boolean;
  photoUrl?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const loadedUsers: AppUser[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<AppUser, "id">;
          return {
            id: doc.id,
            ...data,
          };
        });
        setUsers(loadedUsers);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  if (loadingUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-slate-500 text-sm">Carregando usuários...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalUsers = users.length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Gestão de Usuários
            </h1>
            <p className="text-sm text-slate-500">
              Visualize os usuários cadastrados no sistema.
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-600">
          Total de usuários:{" "}
          <span className="font-semibold text-slate-900">{totalUsers}</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loadingUsers ? (
          <div className="p-6 text-sm text-slate-500">Carregando lista...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        {u.photoUrl ? (
                          <img
                            src={u.photoUrl}
                            alt={u.name || u.email || "Usuário"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {u.name || "Sem nome"}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {u.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {u.email || "Sem e-mail"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {u.isAdmin ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        Usuário
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

