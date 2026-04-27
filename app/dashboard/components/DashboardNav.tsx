"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/dashboard",              label: "🏠 Dashboard" },
  { href: "/dashboard/transactions", label: "💳 Tranzacții" },
  { href: "/dashboard/upload",       label: "📤 Upload" },
  { href: "/dashboard/banks",        label: "🏦 Bănci" },
  { href: "/dashboard/categories",   label: "🗂️ Categorii" },
  { href: "/dashboard/currencies",   label: "💱 Valute" },
  { href: "/dashboard/settings",     label: "⚙️ Setări" },
];

export default function DashboardNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, supabase } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => router.push("/dashboard")}
          className="text-lg font-bold text-teal-600 shrink-0"
        >
          💰 Vibe Budget
        </button>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-gray-500 text-sm hidden lg:block">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium transition-all"
          >
            Ieșire
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                isActive
                  ? "bg-teal-50 text-teal-700 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
