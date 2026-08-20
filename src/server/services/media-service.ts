import { randomUUID } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { getStorageProvider } from "@/server/storage";
import { enqueueMediaProcessing } from "@/server/queue/queues";
import { AuditService } from "@/server/services/audit-service";
import { logger } from "@/server/observability/logger";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "video/mp4", "video/quicktime"] as const;
type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

export class UnsupportedMediaTypeError extends Error {
  constructor(mimeType: string) {
    super(`Tipo de arquivo "${mimeType}" não suportado. Envie uma imagem JPEG ou um vídeo MP4/MOV.`);
    this.name = "UnsupportedMediaTypeError";
  }
}

export class MediaInUseError extends Error {
  constructor() {
    super("Esta mídia está associada a uma ou mais publicações e não pode ser removida.");
    this.name = "MediaInUseError";
  }
}

function isAcceptedMimeType(value: string): value is AcceptedMimeType {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(value);
}

export const MediaService = {
  /**
   * Step 1 of §12's upload flow: create a pending MediaAsset row and hand
   * back a presigned URL. The browser PUTs directly to storage — the file
   * bytes never pass through our server.
   */
  async createUploadTarget(params: {
    workspaceId: string;
    uploadedById: string;
    originalFilename: string;
    mimeType: string;
  }) {
    if (!isAcceptedMimeType(params.mimeType)) {
      throw new UnsupportedMediaTypeError(params.mimeType);
    }

    // UUID storage key — never derived from the user-supplied filename
    // (§12: "nomes seguros", "UUID no storage key").
    const storageKey = `media/${params.workspaceId}/${randomUUID()}`;
    const storage = getStorageProvider();

    const asset = await prisma.mediaAsset.create({
      data: {
        workspaceId: params.workspaceId,
        uploadedById: params.uploadedById,
        storageProvider: "s3",
        storageKey,
        originalFilename: params.originalFilename.slice(0, 255),
        mimeType: params.mimeType,
        sizeBytes: BigInt(0),
        processingStatus: "PENDING",
      },
    });

    const uploadUrl = await storage.getUploadUrl({ key: storageKey, contentType: params.mimeType });

    return { mediaAssetId: asset.id, uploadUrl, storageKey };
  },

  /**
   * Step 2: called once the browser's direct PUT succeeds. Verifies the
   * object actually landed in storage (never trusts the client's word for
   * it) and enqueues async processing/validation.
   */
  async confirmUpload(workspaceId: string, actorUserId: string, mediaAssetId: string) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: mediaAssetId, workspaceId, deletedAt: null },
    });
    if (!asset) throw new Error("Media asset not found in this workspace.");

    const storage = getStorageProvider();
    const head = await storage.headObject(asset.storageKey);
    if (!head) {
      throw new Error("Upload not found in storage yet — the PUT may still be in flight or failed.");
    }

    await enqueueMediaProcessing(asset.id);

    await AuditService.log({
      workspaceId,
      actorUserId,
      action: "media.uploaded",
      resourceType: "media_asset",
      resourceId: asset.id,
      metadata: { originalFilename: asset.originalFilename, mimeType: asset.mimeType },
    });

    logger.info("media.upload.confirmed", { mediaAssetId: asset.id, workspaceId });

    return asset;
  },

  async listForWorkspace(workspaceId: string) {
    return prisma.mediaAsset.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  async getForWorkspace(workspaceId: string, mediaAssetId: string) {
    return prisma.mediaAsset.findFirst({
      where: { id: mediaAssetId, workspaceId, deletedAt: null },
    });
  },

  /**
   * User-initiated delete from the media library — immediate, not a grace
   * period: frees the R2 object and removes the row right away. Still
   * refuses to delete media a post is actively using (draft or otherwise
   * unpublished); once a post is fully published, that same media becomes
   * eligible for the 3-day auto-expiry instead (see scheduleDeletionIfUnused
   * / the cleanup-media maintenance job), not this path.
   */
  async deleteMedia(workspaceId: string, actorUserId: string, mediaAssetId: string) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: mediaAssetId, workspaceId, deletedAt: null },
    });
    if (!asset) throw new Error("Media asset not found in this workspace.");

    const usageCount = await prisma.postMedia.count({ where: { mediaAssetId: asset.id } });
    if (usageCount > 0) {
      throw new MediaInUseError();
    }

    await purgeMediaAsset(asset);

    await AuditService.log({
      workspaceId,
      actorUserId,
      action: "media.deleted",
      resourceType: "media_asset",
      resourceId: asset.id,
    });
  },

  /** Cancels a pending 3-day auto-expiry — the "Manter mídia" button. */
  async keepMedia(workspaceId: string, actorUserId: string, mediaAssetId: string) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: mediaAssetId, workspaceId, deletedAt: null },
    });
    if (!asset) throw new Error("Media asset not found in this workspace.");

    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { deletionExempt: true, scheduledDeletionAt: null },
    });

    await AuditService.log({
      workspaceId,
      actorUserId,
      action: "media.kept",
      resourceType: "media_asset",
      resourceId: asset.id,
    });
  },

  /**
   * Called whenever a post reaches PUBLISHED (PostService.syncStatusFromTargets).
   * Starts the 3-day countdown for each of its media assets, unless that
   * asset is still attached to some other post that hasn't concluded yet,
   * or is deletionExempt, or already has a countdown running.
   */
  async scheduleDeletionForPublishedPost(postId: string): Promise<void> {
    const media = await prisma.postMedia.findMany({
      where: { postId },
      select: { mediaAssetId: true },
    });

    for (const { mediaAssetId } of media) {
      const stillNeeded = await prisma.postMedia.count({
        where: {
          mediaAssetId,
          postId: { not: postId },
          post: { status: { notIn: ["PUBLISHED", "FAILED", "CANCELED"] } },
        },
      });
      if (stillNeeded > 0) continue;

      await prisma.mediaAsset.updateMany({
        where: { id: mediaAssetId, deletionExempt: false, scheduledDeletionAt: null },
        data: { scheduledDeletionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      });
    }
  },

  /** Reusing media that already had a countdown running cancels it — it's back in active use. */
  async cancelDeletionForMedia(mediaAssetIds: string[]): Promise<void> {
    if (mediaAssetIds.length === 0) return;
    await prisma.mediaAsset.updateMany({
      where: { id: { in: mediaAssetIds }, scheduledDeletionAt: { not: null } },
      data: { scheduledDeletionAt: null },
    });
  },
};

async function purgeMediaAsset(asset: { id: string; storageKey: string; metadata: unknown }): Promise<void> {
  const storage = getStorageProvider();
  await storage.deleteObject(asset.storageKey);
  const metadata = asset.metadata as { thumbnailKey?: string } | null;
  if (metadata?.thumbnailKey) {
    await storage.deleteObject(metadata.thumbnailKey);
  }
  await prisma.mediaAsset.delete({ where: { id: asset.id } });
}

export { purgeMediaAsset };
