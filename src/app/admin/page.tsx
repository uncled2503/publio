import {
  Users,
  Building2,
  CalendarClock,
  CheckCircle2,
  TriangleAlert,
  AtSign,
  ShieldAlert,
  UserPlus,
} from "lucide-react";

import { AdminService } from "@/server/services/admin-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

export default async function AdminOverviewPage() {
  const overview = await AdminService.getOverview();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Estado técnico da plataforma, em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Usuários" value={overview.totalUsers} icon={Users} tone="primary" />
        <StatCard label="Workspaces" value={overview.totalWorkspaces} icon={Building2} tone="primary" />
        <StatCard
          label="Novos usuários (7 dias)"
          value={overview.newUsersLast7Days}
          icon={UserPlus}
          tone="primary"
        />
        <StatCard
          label="Contas do Instagram conectadas"
          value={overview.connectedAccounts}
          icon={AtSign}
          tone="success"
        />
        <StatCard label="Posts publicados" value={overview.publishedPosts} icon={CheckCircle2} tone="success" />
        <StatCard label="Posts agendados/em fila" value={overview.scheduledPosts} icon={CalendarClock} tone="warning" />
        <StatCard label="Posts com falha" value={overview.failedPosts} icon={TriangleAlert} tone="destructive" />
        <StatCard
          label="Contas do Instagram precisando de atenção"
          value={overview.accountsNeedingAttention}
          icon={ShieldAlert}
          tone="destructive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cadastros recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.recentSignups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum usuário ainda.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {overview.recentSignups.map((user) => (
                <li key={user.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name ?? "(sem nome)"}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {user.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
