import { redirect, notFound } from "next/navigation";
import type { WorkspaceRole } from "@prisma/client";

import { auth } from "@/server/auth";
import { WorkspaceService } from "@/server/services/workspace-service";
import { roleAtLeast } from "@/server/domain/rbac";

/**
 * Every server component / route handler / server action that touches
 * workspace-scoped data MUST go through one of these two functions instead
 * of trusting a workspaceId that came from the client. This is the single
 * choke point implementing §26/§27 of the spec (IDOR prevention).
 */

export class InsufficientRoleError extends Error {
  constructor(public readonly required: WorkspaceRole) {
    super(`This action requires the ${required} role or higher.`);
    this.name = "InsufficientRoleError";
  }
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

export async function requireWorkspaceMember(slug: string, minimumRole?: WorkspaceRole) {
  const user = await requireUser();

  const result = await WorkspaceService.getForMember(slug, user.id);
  if (!result) {
    // 404 rather than 403: don't confirm the workspace exists to a caller
    // who isn't a member of it (§27 IDOR prevention).
    notFound();
  }

  if (minimumRole && !roleAtLeast(result.role, minimumRole)) {
    // The workspace genuinely exists and they're a member of it, so a 404
    // would be confusing here — throw instead and let the nearest
    // error.tsx boundary render an "insufficient permissions" message.
    throw new InsufficientRoleError(minimumRole);
  }

  return {
    user,
    workspace: result.workspace,
    role: result.role,
    membershipId: result.membershipId,
  };
}
