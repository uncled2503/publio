import type { WorkspaceRole } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { randomSlugSuffix, slugify } from "@/server/domain/slug";
import { canManageMembers, canDeleteWorkspace } from "@/server/domain/rbac";
import { AuditService } from "@/server/services/audit-service";

export class WorkspaceAccessError extends Error {
  constructor(message = "You do not have access to this workspace.") {
    super(message);
    this.name = "WorkspaceAccessError";
  }
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "workspace";
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.workspace.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${randomSlugSuffix()}`;
  }
  return `${base}-${randomSlugSuffix()}-${randomSlugSuffix()}`;
}

export const WorkspaceService = {
  async createWorkspace(userId: string, name: string) {
    const slug = await uniqueSlug(name);

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { name, slug },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId, role: "OWNER" },
      });
      await tx.subscription.create({
        data: { workspaceId: ws.id, plan: "FREE", status: "TRIALING" },
      });
      return ws;
    });

    await AuditService.log({
      workspaceId: workspace.id,
      actorUserId: userId,
      action: "workspace.created",
      resourceType: "workspace",
      resourceId: workspace.id,
      metadata: { name },
    });

    return workspace;
  },

  async listForUser(userId: string) {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => ({ workspace: m.workspace, role: m.role }));
  },

  /**
   * The only sanctioned way to resolve a workspace + the caller's role in
   * it. Never resolve a workspace by id/slug alone and trust a client-sent
   * workspaceId elsewhere in the codebase (§27 — IDOR prevention).
   */
  async getForMember(slug: string, userId: string) {
    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return null;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    });
    if (!membership) return null;

    return { workspace, role: membership.role, membershipId: membership.id };
  },

  async listMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  async addMemberByEmail(
    workspaceId: string,
    actorRole: WorkspaceRole,
    actorUserId: string,
    email: string,
    role: WorkspaceRole,
  ) {
    if (!canManageMembers(actorRole)) {
      throw new WorkspaceAccessError("Only admins and owners can add members.");
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new Error("No Publio account exists for that email yet. Ask them to sign up first.");
    }

    const member = await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: { role },
      create: { workspaceId, userId: user.id, role },
    });

    await AuditService.log({
      workspaceId,
      actorUserId,
      action: "workspace.member_added",
      resourceType: "workspace_member",
      resourceId: member.id,
      metadata: { email, role },
    });

    return member;
  },

  async removeMember(
    workspaceId: string,
    actorRole: WorkspaceRole,
    actorUserId: string,
    memberId: string,
  ) {
    if (!canManageMembers(actorRole)) {
      throw new WorkspaceAccessError("Only admins and owners can remove members.");
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new Error("Member not found in this workspace.");
    if (member.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        throw new Error("A workspace must keep at least one owner.");
      }
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    await AuditService.log({
      workspaceId,
      actorUserId,
      action: "workspace.member_removed",
      resourceType: "workspace_member",
      resourceId: memberId,
    });
  },

  async updateMemberRole(
    workspaceId: string,
    actorRole: WorkspaceRole,
    actorUserId: string,
    memberId: string,
    role: WorkspaceRole,
  ) {
    if (!canManageMembers(actorRole)) {
      throw new WorkspaceAccessError("Only admins and owners can change roles.");
    }

    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new Error("Member not found in this workspace.");

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });

    await AuditService.log({
      workspaceId,
      actorUserId,
      action: "workspace.member_role_changed",
      resourceType: "workspace_member",
      resourceId: memberId,
      metadata: { from: member.role, to: role },
    });

    return updated;
  },

  async updateWorkspace(
    workspaceId: string,
    actorRole: WorkspaceRole,
    actorUserId: string,
    data: { name?: string; timezone?: string },
  ) {
    if (!canManageMembers(actorRole)) {
      throw new WorkspaceAccessError("Only admins and owners can update workspace settings.");
    }
    if (data.timezone) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: data.timezone });
      } catch {
        throw new Error(`"${data.timezone}" is not a valid timezone.`);
      }
    }

    const workspace = await prisma.workspace.update({ where: { id: workspaceId }, data });

    await AuditService.log({
      workspaceId,
      actorUserId,
      action: "workspace.updated",
      resourceType: "workspace",
      resourceId: workspaceId,
      metadata: data,
    });

    return workspace;
  },

  /** Cascades to every workspace-scoped row via the schema's onDelete: Cascade FKs. */
  async deleteWorkspace(workspaceId: string, actorRole: WorkspaceRole, workspaceSlugConfirmation: string) {
    if (!canDeleteWorkspace(actorRole)) {
      throw new WorkspaceAccessError("Only the workspace owner can delete it.");
    }
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    if (workspaceSlugConfirmation !== workspace.slug) {
      throw new Error("Confirmation text does not match the workspace slug.");
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
  },
};
