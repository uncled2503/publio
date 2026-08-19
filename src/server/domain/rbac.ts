import type { WorkspaceRole } from "@prisma/client";

/**
 * Role hierarchy for the minimum viable RBAC (§4 of the spec). Higher rank
 * implies every permission of the ranks below it. New roles (EDITOR,
 * APPROVER, CLIENT, VIEWER) can be inserted here later without touching
 * call sites that use `roleAtLeast`.
 */
const ROLE_RANK: Record<WorkspaceRole, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

export function roleAtLeast(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return roleAtLeast(role, "ADMIN");
}

export function canManageBilling(role: WorkspaceRole): boolean {
  return roleAtLeast(role, "OWNER");
}

export function canDeleteWorkspace(role: WorkspaceRole): boolean {
  return role === "OWNER";
}

export function canManageContent(role: WorkspaceRole): boolean {
  return roleAtLeast(role, "MEMBER");
}
