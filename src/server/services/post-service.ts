import type { PostType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { AuditService } from "@/server/services/audit-service";

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
};
