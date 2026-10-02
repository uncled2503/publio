import Link from "next/link";
import type { Metadata } from "next";

import { requirePlatformAdmin } from "@/server/auth/require-platform-admin";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Admin — Publio" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformAdmin();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            Admin interno
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{user.email}</span>
          <Link href="/app" className="hover:text-foreground">
            Voltar ao site
          </Link>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
