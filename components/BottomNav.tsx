"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, UserCircle, PlusCircle } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-1px_3px_rgba(15,23,42,0.08)] md:hidden">
      <nav className="max-w-xl mx-auto px-6 pt-2 pb-3 flex items-end justify-between gap-6">
        <Link
          href="/"
          className="flex flex-1 flex-col items-center gap-1 text-xs"
        >
          <LayoutDashboard
            className={`h-5 w-5 ${
              isActive("/") ? "text-blue-600" : "text-slate-500"
            }`}
          />
          <span
            className={
              isActive("/")
                ? "text-[11px] font-semibold text-blue-600"
                : "text-[11px] text-slate-500"
            }
          >
            Dashboard
          </span>
        </Link>

        <Link
          href="/items"
          className="flex flex-1 flex-col items-center gap-1 text-xs"
        >
          <Package
            className={`h-5 w-5 ${
              isActive("/items") ? "text-blue-600" : "text-slate-500"
            }`}
          />
          <span
            className={
              isActive("/items")
                ? "text-[11px] font-semibold text-blue-600"
                : "text-[11px] text-slate-500"
            }
          >
            Itens
          </span>
        </Link>

        <Link href="/items/new" className="flex flex-col items-center gap-1">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/40">
            <PlusCircle className="h-7 w-7" />
          </span>
          <span className="text-[11px] font-semibold text-blue-600">
            SCAN/NOVO
          </span>
        </Link>

        <Link
          href="/profile"
          className="flex flex-1 flex-col items-center gap-1 text-xs"
        >
          <UserCircle
            className={`h-5 w-5 ${
              isActive("/profile") ? "text-blue-600" : "text-slate-500"
            }`}
          />
          <span
            className={
              isActive("/profile")
                ? "text-[11px] font-semibold text-blue-600"
                : "text-[11px] text-slate-500"
            }
          >
            Perfil
          </span>
        </Link>
      </nav>
    </div>
  );
}

