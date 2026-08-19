import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTION_LABELS: Record<string, string> = {
  "workspace.created": "criou o workspace",
  "workspace.updated": "atualizou as configurações do workspace",
  "workspace.member_added": "adicionou um membro",
  "workspace.member_removed": "removeu um membro",
  "workspace.member_role_changed": "alterou a função de um membro",
  "instagram.connected": "conectou uma conta do Instagram",
  "instagram.disconnected": "desconectou uma conta do Instagram",
  "instagram.reconnected": "reconectou uma conta do Instagram",
  "post.created": "criou uma publicação",
  "post.updated": "editou uma publicação",
  "post.scheduled": "agendou uma publicação",
  "post.rescheduled": "reagendou uma publicação",
  "post.canceled": "cancelou uma publicação",
  "post.publish_now_requested": "pediu para publicar imediatamente",
  "post.retry_requested": "pediu para tentar novamente",
  "publish.started": "publicação iniciada",
  "publish.succeeded": "publicação concluída",
  "publish.failed": "publicação falhou",
  "media.uploaded": "enviou uma mídia",
  "media.deleted": "removeu uma mídia",
  "billing.checkout_started": "iniciou um checkout",
  "billing.subscription_updated": "atualizou a assinatura",
  "admin.viewed_workspace": "acesso administrativo",
};

export interface ActivityEntry {
  id: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: Date;
}

export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atividade recente</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 p-0">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma atividade registrada ainda.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <strong>{entry.actorName ?? entry.actorEmail ?? "Sistema"}</strong>{" "}
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {entry.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
