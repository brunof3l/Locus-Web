"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Users, UserCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (!user) return null; // Não mostra sidebar se não estiver logado

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Itens", href: "/items", icon: Package },
    { name: "Admin", href: "/admin", icon: Users },
    { name: "Perfil", href: "/profile", icon: UserCircle },
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight">Locus</h1>
        <p className="text-xs text-slate-400 mt-1">Gestão de Patrimônio</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.email}</p>
                <p className="text-xs truncate">Administrador</p>
            </div>
        </div>
      </div>
    </aside>
  );
}
