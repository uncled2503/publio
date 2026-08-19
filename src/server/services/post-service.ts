import type { PostStatus, PostTargetStatus, PostType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { AuditService } from "@/server/services/audit-service";
import { assertPostTransition, nextPostStatuses } from "@/server/domain/post-state-machine";
import {
  assertPostTargetTransition,
  aggregatePostStatusFromTargets,
} from "@/server/domain/post-target-state-machine";
import {
  schedulePostTargetPublish,
  cancelScheduledPublish,
} from "@/server/queue/queues";

const MEDIA_COUNT_RANGE: Record<PostType, { min: number; max: number }> = {
  IMAGE: { min: 1, max: 1 },
  CAROUSEL: { min: 2, max: 10 },
  REEL: { min: 1, max: 1 },
};

export class PostNotEditableError extends Error {
  constructor() {
    super("Esta publicação não está mais em rascunho e não pode ser editada.");
    this.name = "PostNotEditableError";
  }
}

export class InvalidMediaSelectionError extends Error {}
export class PostNotSchedulableError extends Error {}
export class PostNotCancelableError extends Error {}

const MIN_LEAD_TIME_MS = 5 * 60 * 1000;

export const PostService = {
  async listForWorkspace(workspaceId: string) {
    return prisma.post.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      include: {
        media: { orderBy: { position: "asc" }, include: { mediaAsset: true } },
        targets: { include: { socialAccount: true } },
      },
    });
  },

  async getForWorkspace(workspaceId: string, postId: string) {
    return prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: {
        media: { orderBy: { position: "asc" }, include: { mediaAsset: true } },
        targets: { include: { socialAccount: true } },
      },
    });
  },

  async createDraft(params: { workspaceId: string; createdById: string; postType: PostType }) {
    const post = await prisma.post.create({
      data: {
        workspaceId: params.workspaceId,
        createdById: params.createdById,
        postType: params.postType,
      },
    });

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.createdById,
      action: "post.created",
      resourceType: "post",
      resourceId: post.id,
      metadata: { postType: params.postType },
    });

    return post;
  },

  /**
   * Full draft update — caption, media selection (ordered), and target
   * accounts, all in one call so the editor can save as a single unit.
   * Only ever touches a post still in DRAFT (§6: no code may edit a post
   * that has already entered the scheduling/publishing pipeline).
   */
  async updateDraft(params: {
    workspaceId: string;
    actorUserId: string;
    postId: string;
    caption: string;
    postType: PostType;
    mediaAssetIds: string[];
    socialAccountIds: string[];
  }) {
    const post = await prisma.post.findFirst({
      where: { id: params.postId, workspaceId: params.workspaceId },
    });
    if (!post) throw new Error("Post not found in this workspace.");
    if (post.status !== "DRAFT") throw new PostNotEditableError();

    const range = MEDIA_COUNT_RANGE[params.postType];
    if (params.mediaAssetIds.length < range.min || params.mediaAssetIds.length > range.max) {
      throw new InvalidMediaSelectionError(
        range.min === range.max
          ? `Esse tipo de publicação exige exatamente ${range.min} mídia${range.min > 1 ? "s" : ""}.`
          : `Esse tipo de publicação aceita entre ${range.min} e ${range.max} mídias.`,
      );
    }

    const assets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: params.mediaAssetIds },
        workspaceId: params.workspaceId,
        deletedAt: null,
        processingStatus: "READY",
      },
    });
    if (assets.length !== params.mediaAssetIds.length) {
      throw new InvalidMediaSelectionError(
        "Uma ou mais mídias selecionadas não estão disponíveis (ainda processando, inválida ou removida).",
      );
    }
    if (params.postType === "REEL" && !assets[0]?.mimeType.startsWith("video/")) {
      throw new InvalidMediaSelectionError("Reels exigem um vídeo.");
    }
    if (params.postType === "IMAGE" && !assets[0]?.mimeType.startsWith("image/")) {
      throw new InvalidMediaSelectionError("Publicações de imagem exigem uma foto.");
    }

    const targets = await prisma.socialAccount.findMany({
      where: {
        id: { in: params.socialAccountIds },
        workspaceId: params.workspaceId,
        tokenStatus: { in: ["CONNECTED", "EXPIRING"] },
      },
    });
    if (targets.length !== params.socialAccountIds.length) {
      throw new InvalidMediaSelectionError(
        "Uma ou mais contas selecionadas não estão conectadas.",
      );
    }

    const assetById = new Map(assets.map((a) => [a.id, a]));

    await prisma.$transaction([
      prisma.post.update({
        where: { id: post.id },
        data: { caption: params.caption, postType: params.postType },
      }),
      prisma.postMedia.deleteMany({ where: { postId: post.id } }),
      prisma.postMedia.createMany({
        data: params.mediaAssetIds.map((mediaAssetId, index) => ({
          postId: post.id,
          mediaAssetId,
          position: index,
          mediaType: assetById.get(mediaAssetId)!.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE",
        })),
      }),
      prisma.postTarget.deleteMany({ where: { postId: post.id } }),
      prisma.postTarget.createMany({
        data: params.socialAccountIds.map((socialAccountId) => ({
          postId: post.id,
          socialAccountId,
        })),
      }),
    ]);

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "post.updated",
      resourceType: "post",
      resourceId: post.id,
    });

    return this.getForWorkspace(params.workspaceId, post.id);
  },

  async deleteDraft(workspaceId: string, postId: string) {
    const post = await prisma.post.findFirst({ where: { id: postId, workspaceId } });
    if (!post) throw new Error("Post not found in this workspace.");
    if (post.status !== "DRAFT") throw new PostNotEditableError();

    await prisma.post.delete({ where: { id: post.id } });
  },

  async assertReadyToQueue(postId: string): Promise<void> {
    const post = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      include: { media: true, targets: true },
    });
    if (post.media.length === 0) {
      throw new InvalidMediaSelectionError("Adicione mídia antes de agendar ou publicar.");
    }
    if (post.targets.length === 0) {
      throw new InvalidMediaSelectionError("Selecione ao menos uma conta de destino.");
    }
  },

  /** DRAFT -> SCHEDULED. `scheduledAt` is already-resolved UTC; `timezone` is stored for display only. */
  async schedulePost(params: {
    workspaceId: string;
    actorUserId: string;
    postId: string;
    scheduledAt: Date;
    timezone: string;
  }) {
    const post = await prisma.post.findFirst({
      where: { id: params.postId, workspaceId: params.workspaceId },
      include: { targets: true },
    });
    if (!post) throw new Error("Post not found in this workspace.");
    assertPostTransition(post.status, "SCHEDULED");

    if (params.scheduledAt.getTime() < Date.now() + MIN_LEAD_TIME_MS) {
      throw new PostNotSchedulableError(
        "Escolha um horário pelo menos 5 minutos no futuro.",
      );
    }
    await this.assertReadyToQueue(post.id);

    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "SCHEDULED",
        scheduledAt: params.scheduledAt,
        timezone: params.timezone,
        publishMode: "SCHEDULED",
      },
    });
    await prisma.postTarget.updateMany({
      where: { postId: post.id },
      data: { scheduledAt: params.scheduledAt },
    });
    for (const target of post.targets) {
      await schedulePostTargetPublish(target.id, params.scheduledAt);
    }

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "post.scheduled",
      resourceType: "post",
      resourceId: post.id,
      metadata: { scheduledAt: params.scheduledAt.toISOString(), timezone: params.timezone },
    });
  },

  /** DRAFT -> QUEUED, publish-target jobs enqueued with zero delay. */
  async publishNow(params: { workspaceId: string; actorUserId: string; postId: string }) {
    const post = await prisma.post.findFirst({
      where: { id: params.postId, workspaceId: params.workspaceId },
      include: { targets: true },
    });
    if (!post) throw new Error("Post not found in this workspace.");
    assertPostTransition(post.status, "QUEUED");
    await this.assertReadyToQueue(post.id);

    const now = new Date();
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "QUEUED", scheduledAt: now, publishMode: "NOW" },
    });
    for (const target of post.targets) {
      await schedulePostTargetPublish(target.id, now);
    }

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "post.publish_now_requested",
      resourceType: "post",
      resourceId: post.id,
    });
  },

  /** Only while still SCHEDULED and nothing has started running yet. */
  async reschedulePost(params: {
    workspaceId: string;
    actorUserId: string;
    postId: string;
    scheduledAt: Date;
    timezone: string;
  }) {
    const post = await prisma.post.findFirst({
      where: { id: params.postId, workspaceId: params.workspaceId },
      include: { targets: true },
    });
    if (!post) throw new Error("Post not found in this workspace.");
    if (post.status !== "SCHEDULED") {
      throw new PostNotSchedulableError("Só é possível reagendar uma publicação agendada.");
    }
    if (params.scheduledAt.getTime() < Date.now() + MIN_LEAD_TIME_MS) {
      throw new PostNotSchedulableError("Escolha um horário pelo menos 5 minutos no futuro.");
    }

    await prisma.post.update({
      where: { id: post.id },
      data: { scheduledAt: params.scheduledAt, timezone: params.timezone },
    });

    for (const target of post.targets) {
      if (target.status !== "QUEUED") continue; // already running/settled — leave it alone
      await cancelScheduledPublish(target.id);
      await prisma.postTarget.update({
        where: { id: target.id },
        data: { scheduledAt: params.scheduledAt },
      });
      await schedulePostTargetPublish(target.id, params.scheduledAt);
    }

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "post.rescheduled",
      resourceType: "post",
      resourceId: post.id,
      metadata: { scheduledAt: params.scheduledAt.toISOString(), timezone: params.timezone },
    });
  },

  /** DRAFT/SCHEDULED/QUEUED/FAILED -> CANCELED, and removes any not-yet-run publish jobs. */
  async cancelPost(params: { workspaceId: string; actorUserId: string; postId: string }) {
    const post = await prisma.post.findFirst({
      where: { id: params.postId, workspaceId: params.workspaceId },
      include: { targets: true },
    });
    if (!post) throw new Error("Post not found in this workspace.");
    try {
      assertPostTransition(post.status, "CANCELED");
    } catch {
      throw new PostNotCancelableError(
        "Esta publicação não pode mais ser cancelada (já foi publicada ou está publicando agora).",
      );
    }

    await prisma.post.update({
      where: { id: post.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });

    for (const target of post.targets) {
      await cancelScheduledPublish(target.id);
      if (canTransitionTarget(target.status, "CANCELED")) {
        await prisma.postTarget.update({ where: { id: target.id }, data: { status: "CANCELED" } });
      }
    }

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "post.canceled",
      resourceType: "post",
      resourceId: post.id,
    });
  },

  /**
   * Recomputes Post.status from its targets' current statuses and walks
   * the Post state machine there one hop at a time (§6 — nothing may set
   * Post.status without going through assertPostTransition). Called by the
   * publish-post-target worker after every target status change.
   */
  async syncStatusFromTargets(postId: string): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { targets: true },
    });
    if (!post || post.targets.length === 0) return;
    if (post.targets.some((t) => t.status === "CANCELED") && post.targets.every((t) => t.status === "CANCELED")) {
      return; // already handled by cancelPost — don't fight it from here
    }

    const target = aggregatePostStatusFromTargets(post.targets.map((t) => t.status));
    let current = post.status;
    const path = shortestPostStatusPath(current, target);
    if (!path) return; // no valid path (e.g. post was CANCELED out-of-band) — leave it alone

    for (const next of path) {
      assertPostTransition(current, next);
      current = next;
    }
    if (current === post.status) return;

    await prisma.post.update({ where: { id: post.id }, data: { status: current } });
  },
};

function canTransitionTarget(from: PostTargetStatus, to: PostTargetStatus): boolean {
  try {
    assertPostTargetTransition(from, to);
    return true;
  } catch {
    return false;
  }
}

/** BFS over the Post state machine graph — small (9 states), so brute force is plenty fast. */
function shortestPostStatusPath(from: PostStatus, to: PostStatus): PostStatus[] | null {
  if (from === to) return [];
  const queue: Array<{ status: PostStatus; path: PostStatus[] }> = [{ status: from, path: [] }];
  const seen = new Set<PostStatus>([from]);
  while (queue.length > 0) {
    const { status, path } = queue.shift()!;
    for (const next of nextPostStatuses(status)) {
      if (seen.has(next)) continue;
      const nextPath = [...path, next];
      if (next === to) return nextPath;
      seen.add(next);
      queue.push({ status: next, path: nextPath });
    }
  }
  return null;
}
