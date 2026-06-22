"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  FileText,
  LayoutDashboard,
  Kanban,
  Settings,
  LogOut,
  LifeBuoy,
  CheckCircle2,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",       href: "/dashboard", icon: LayoutDashboard },
  { label: "Job Discovery",   href: "/jobs",       icon: Search },
  { label: "Resume Recovery", href: "/profile",    icon: FileText },
  { label: "Tracker",         href: "/tracker",    icon: Kanban },
  { label: "Settings",        href: "/settings",   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[var(--sidebar-width)] bg-pmfit-navy flex flex-col z-40 shrink-0"
      style={{ "--sidebar-width": "240px" } as React.CSSProperties}
    >
      {/* Logo */}
      <div className="px-4 pt-6 pb-4">
        <Logo variant="top" size="md" dark href="/dashboard" />
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pmfit-purple/20 text-pmfit-purple text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-pmfit-purple animate-pulse" />
          High-Performance Mode
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <motion.div key={href} whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
              <Link
                href={href}
                className={active ? "sidebar-item-active" : "sidebar-item"}
              >
                <Icon size={18} className="shrink-0" />
                {label}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60"
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 space-y-1">
        <Link
          href="/jobs"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-pmfit-blue text-white text-[14px] font-semibold hover:brightness-110 transition-all"
        >
          <CheckCircle2 size={16} />
          Apply with PMFit
        </Link>
        <button className="sidebar-item w-full text-left">
          <LifeBuoy size={16} />
          Support
        </button>
        <button onClick={handleSignOut} className="sidebar-item w-full text-left">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
