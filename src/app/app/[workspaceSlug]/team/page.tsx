import type { Metadata } from "next";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { WorkspaceService } from "@/server/services/workspace-service";
import { roleAtLeast } from "@/server/domain/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import { MemberRow } from "@/components/team/member-row";

export const metadata: Metadata = { title: "Equipe — Publio" };

export default async function TeamPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace, role, user } = await requireWorkspaceMember(workspaceSlug);

  const members = await WorkspaceService.listMembers(workspace.id);
  const canManage = roleAtLeast(role, "ADMIN");
  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted-foreground">
          Quem tem acesso ao workspace <strong>{workspace.name}</strong>.
        </p>
      </div>

      {canManage ? <InviteMemberForm workspaceSlug={workspaceSlug} /> : null}

      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              workspaceSlug={workspaceSlug}
              memberId={member.id}
              name={member.user.name}
              email={member.user.email}
              role={member.role}
              isSelf={member.user.id === user.id}
              canManage={canManage}
              isLastOwner={member.role === "OWNER" && ownerCount <= 1}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
