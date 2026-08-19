import Link from "next/link";
import type { Metadata } from "next";
import { AtSign, CalendarClock, CheckCircle2, TriangleAlert, Plus } from "lucide-react";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { DashboardService } from "@/server/services/dashboard-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dashboard — Publio" };

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceMember(workspaceSlug);
  const summary = await DashboardService.getSummary(workspace.id);

  const needsAttention = summary.accountsNeedingReauth.length > 0 || summary.failedTargets > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Button asChild>
          <Link href={`/app/${workspace.slug}/posts/new`}>
            <Plus /> Nova publicação
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contas conectadas" value={summary.connectedAccounts} icon={AtSign} />
        <StatCard label="Agendadas" value={summary.scheduledPosts} icon={CalendarClock} />
        <StatCard
          label="Publicadas (7 dias)"
          value={summary.recentlyPublished}
          icon={CheckCircle2}
        />
        <StatCard label="Com erro" value={summary.failedTargets} icon={TriangleAlert} />
      </div>

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
