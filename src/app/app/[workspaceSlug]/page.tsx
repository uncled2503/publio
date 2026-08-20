import Link from "next/link";
import type { Metadata } from "next";
import {
  AtSign,
  CalendarClock,
  CheckCircle2,
  TriangleAlert,
  Plus,
  Check,
  Circle,
} from "lucide-react";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { DashboardService } from "@/server/services/dashboard-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard — Publio" };

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warning" | "success" | "destructive";
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <div className={cn("flex size-9 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function firstName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.split(" ")[0] ?? null;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);
  const summary = await DashboardService.getSummary(workspace.id);

  const needsAttention = summary.accountsNeedingReauth.length > 0 || summary.failedTargets > 0;
  const isGettingStarted = summary.connectedAccounts === 0 || summary.scheduledPosts + summary.recentlyPublished === 0;

  const checklist = [
    { done: summary.connectedAccounts > 0, label: "Conectar uma conta do Instagram", href: `/app/${workspace.slug}/accounts` },
    { done: summary.scheduledPosts + summary.recentlyPublished > 0, label: "Criar sua primeira publicação", href: `/app/${workspace.slug}/posts/new` },
    { done: false, label: "Convidar sua equipe", href: `/app/${workspace.slug}/team` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName(user.name) ? `Olá, ${firstName(user.name)}` : "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">{workspace.name}</p>
        </div>
        <Button asChild>
          <Link href={`/app/${workspace.slug}/posts/new`}>
            <Plus /> Nova publicação
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contas conectadas" value={summary.connectedAccounts} icon={AtSign} tone="primary" />
        <StatCard label="Agendadas" value={summary.scheduledPosts} icon={CalendarClock} tone="warning" />
        <StatCard
          label="Publicadas (7 dias)"
          value={summary.recentlyPublished}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Com erro" value={summary.failedTargets} icon={TriangleAlert} tone="destructive" />
      </div>

      {isGettingStarted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Primeiros passos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {checklist.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
              >
                {step.done ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground">
                    <Check className="size-3" />
                  </span>
                ) : (
                  <Circle className="size-5 text-muted-foreground" />
                )}
                <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {needsAttention ? (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4 text-warning" />
              Atenção necessária
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {summary.accountsNeedingReauth.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between text-sm">
                <span>
                  Instagram <strong>@{acc.username}</strong> precisa ser reconectado.
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/app/${workspace.slug}/accounts`}>Reconectar</Link>
                </Button>
              </div>
            ))}
            {summary.failedTargets > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span>{summary.failedTargets} publicação(ões) falharam e precisam de revisão.</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/app/${workspace.slug}/posts?status=FAILED`}>Ver</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas publicações</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma publicação agendada ainda. Conecte uma conta do Instagram e crie sua
                primeira publicação para começar.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/app/${workspace.slug}/accounts`}>Conectar Instagram</Link>
                </Button>
                <Button asChild>
                  <Link href={`/app/${workspace.slug}/posts/new`}>Criar publicação</Link>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {summary.upcoming.map((post) => (
                <li key={post.id} className="flex items-center justify-between py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {post.caption.slice(0, 60) || "(sem legenda)"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "Sem data"}
                    </span>
                  </div>
                  <Badge variant="secondary">{post.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
