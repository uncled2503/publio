import { prisma } from "@/server/db/prisma";
import { sanitizeMetadata } from "@/server/observability/sanitize";

export { sanitizeMetadata };

export type AuditAction =
  | "workspace.created"
  | "workspace.updated"
  | "workspace.member_added"
  | "workspace.member_removed"
  | "workspace.member_role_changed"
  | "instagram.connected"
  | "instagram.disconnected"
  | "instagram.reconnected"
  | "post.created"
  | "post.updated"
  | "post.scheduled"
  | "post.rescheduled"
  | "post.canceled"
  | "post.publish_now_requested"
  | "post.retry_requested"
  | "publish.started"
  | "publish.succeeded"
  | "publish.failed"
  | "media.uploaded"
  | "media.deleted"
  | "billing.checkout_started"
  | "billing.subscription_updated"
  | "admin.viewed_workspace";

interface AuditLogInput {
  workspaceId: string;
  actorUserId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export const AuditService = {
  async log(input: AuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: sanitizeMetadata(input.metadata ?? {}) as never,
      },
    });
  },

  async listForWorkspace(workspaceId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { name: true, email: true } } },
    });
  },
};
