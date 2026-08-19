"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  FileStack,
  Images,
  AtSign,
  Users,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "", icon: LayoutDashboard },
  { label: "Calendário", href: "/calendar", icon: CalendarDays },
  { label: "Publicações", href: "/posts", icon: FileStack },
  { label: "Mídia", href: "/media", icon: Images },
  { label: "Contas", href: "/accounts", icon: AtSign },
  { label: "Equipe", href: "/team", icon: Users },
  { label: "Configurações", href: "/settings", icon: Settings },
] as const;

export function SidebarNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const base = `/app/${workspaceSlug}`;

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
