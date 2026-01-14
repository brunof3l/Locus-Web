/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  type User,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { auth, db, firebaseConfig } from "@/lib/firebase";
import { Shield, User as UserIcon, Eye, EyeOff } from "lucide-react";

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
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const [creatingLoading, setCreatingLoading] = useState(false);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword || !newRole) {
      setCreatingError("Preencha todos os campos.");
      return;
    }

    setCreatingLoading(true);
    setCreatingError(null);

    let secondaryApp;

    try {
      const existingSecondary = getApps().find(
        (appInstance) => appInstance.name === "SecondaryApp"
      );

      secondaryApp =
        existingSecondary || initializeApp(firebaseConfig, "SecondaryApp");

      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newEmail,
        newPassword
      );

      const newUser = userCredential.user;

      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        displayName: newName,
        name: newName,
        email: newEmail,
        role: newRole,
        createdAt: Date.now(),
        isAdmin: false,
      });

      setIsCreating(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("");
      setShowPassword(false);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : null;
      setCreatingError(
        message || "Erro ao criar usuário. Tente novamente."
      );
    } finally {
      try {
        if (secondaryApp) {
          const secondaryAuth = getAuth(secondaryApp);
          await signOut(secondaryAuth);
          if (secondaryApp.name === "SecondaryApp") {
            await deleteApp(secondaryApp);
          }
        }
      } catch {
      }
      setCreatingLoading(false);
    }
  };

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
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">
            Total de usuários:{" "}
            <span className="font-semibold text-slate-900">{totalUsers}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setCreatingError(null);
            }}
            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Novo Usuário
          </button>
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

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Novo Usuário
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!creatingLoading) {
                    setIsCreating(false);
                    setCreatingError(null);
                  }
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Fechar
              </button>
            </div>

            {creatingError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {creatingError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Nome do funcionário"
                  disabled={creatingLoading}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  placeholder="email@empresa.com"
                  disabled={creatingLoading}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder="Senha temporária"
                    disabled={creatingLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Cargo/Função
                </label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: Técnico, Enfermeiro, Gerente"
                  disabled={creatingLoading}
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!creatingLoading) {
                      setIsCreating(false);
                      setCreatingError(null);
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  disabled={creatingLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={creatingLoading}
                >
                  {creatingLoading ? "Criando..." : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
