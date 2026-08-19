import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { SocialAccountService } from "@/server/services/social-account-service";
import { roleAtLeast } from "@/server/domain/rbac";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccountStatusBadge } from "@/components/accounts/account-status-badge";
import { DisconnectButton } from "@/components/accounts/disconnect-button";

export const metadata: Metadata = { title: "Contas sociais — Publio" };

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "A conexão com o Instagram foi cancelada.",
  oauth_state_mismatch: "A sessão de conexão expirou. Tente novamente.",
  oauth_session_expired: "A sessão de conexão expirou. Tente novamente.",
  unsupported_account_type:
    "Essa conta do Instagram precisa ser Business ou Creator para ser conectada.",
  connection_failed: "Não foi possível conectar essa conta. Tente novamente.",
};

export default async function AccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace, role } = await requireWorkspaceMember(workspaceSlug);
  const { connected, error } = await searchParams;

  const accounts = await SocialAccountService.listForWorkspace(workspace.id);
  const canDisconnect = roleAtLeast(role, "ADMIN");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas sociais</h1>
          <p className="text-sm text-muted-foreground">
            Conecte contas profissionais do Instagram via a API oficial da Meta.
          </p>
        </div>
        <Button asChild>
          {/* Plain <a>, not next/link's <Link>: this route ends in a
              redirect to a third-party origin (Instagram), and Link's
              client-side fetch navigation can't follow a cross-origin
              redirect — it hits CORS instead. */}
          <a href={`/api/integrations/instagram/connect?workspaceSlug=${workspace.slug}`}>
            <Plus /> Conectar Instagram
          </a>
        </Button>
      </div>

      {connected ? (
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-foreground">
          Conta do Instagram conectada com sucesso.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {ERROR_MESSAGES[error] ?? "Ocorreu um erro ao conectar sua conta."}
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma conta do Instagram conectada ainda.
            </p>
            <Button asChild>
              <a href={`/api/integrations/instagram/connect?workspaceSlug=${workspace.slug}`}>
                Conectar Instagram
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={account.profilePictureUrl ?? undefined} alt={account.username} />
                    <AvatarFallback>{account.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">@{account.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.accountType ?? "—"} · Conectado em{" "}
                      {new Date(account.connectedAt).toLocaleDateString("pt-BR")}
                      {account.lastValidatedAt
                        ? ` · Validado em ${new Date(account.lastValidatedAt).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AccountStatusBadge status={account.tokenStatus} />
                  {account.tokenStatus === "REAUTH_REQUIRED" ||
                  account.tokenStatus === "PERMISSION_REVOKED" ||
                  account.tokenStatus === "ERROR" ? (
                    <Button size="sm" asChild>
                      <a href={`/api/integrations/instagram/connect?workspaceSlug=${workspace.slug}`}>
                        Reconectar
                      </a>
                    </Button>
                  ) : null}
                  {canDisconnect && account.tokenStatus !== "DISCONNECTED" ? (
                    <DisconnectButton
                      workspaceSlug={workspace.slug}
                      socialAccountId={account.id}
                      username={account.username}
                    />
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
