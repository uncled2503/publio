import type { Metadata } from "next";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { roleAtLeast } from "@/server/domain/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspaceSettingsForm } from "@/components/settings/workspace-settings-form";
import { DeleteWorkspaceSection } from "@/components/settings/delete-workspace-section";

export const metadata: Metadata = { title: "Configurações — Publio" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace, role } = await requireWorkspaceMember(workspaceSlug);

  const canManage = roleAtLeast(role, "ADMIN");
  const canDelete = role === "OWNER";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências do workspace.</p>
      </div>

      <Card>
        <CardContent>
          <WorkspaceSettingsForm
            workspaceSlug={workspaceSlug}
            currentName={workspace.name}
            currentTimezone={workspace.timezone}
            disabled={!canManage}
          />
        </CardContent>
      </Card>

      {canDelete ? <DeleteWorkspaceSection workspaceSlug={workspaceSlug} workspaceName={workspace.name} /> : null}
    </div>
  );
}
