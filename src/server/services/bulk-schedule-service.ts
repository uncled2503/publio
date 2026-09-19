import { DateTime } from "luxon";

import { prisma } from "@/server/db/prisma";
import { AuditService } from "@/server/services/audit-service";
import { PostService } from "@/server/services/post-service";

export interface BulkScheduleSlot {
  hour: number;
  minute: number;
}

export type BulkScheduleCaptionMode = "SHARED" | "PER_VIDEO";

export class EmptyFolderError extends Error {
  constructor() {
    super("Esta pasta não tem vídeos prontos para agendar.");
    this.name = "EmptyFolderError";
  }
}

export class InvalidBulkScheduleError extends Error {}

const MIN_LEAD_TIME_MS = 5 * 60 * 1000;

/**
 * Turns one media folder into a run of individually-scheduled REEL posts —
 * N videos/day at fixed times of day, continuing on the following days
 * until the folder is exhausted. Deliberately composed on top of
 * PostService's own draft/update/schedule steps (rather than writing
 * separate Post-creation logic) so every generated post goes through the
 * exact same validation and state machine a manually-created post does.
 */
export const BulkScheduleService = {
  async scheduleFolder(params: {
    workspaceId: string;
    actorUserId: string;
    folderId: string;
    socialAccountIds: string[];
    startDate: string; // "YYYY-MM-DD", interpreted in `timezone`
    timezone: string;
    timesOfDay: BulkScheduleSlot[];
    captionMode: BulkScheduleCaptionMode;
    sharedCaption?: string;
    captionsByMediaId?: Record<string, string>;
  }): Promise<{ createdPostIds: string[] }> {
    if (params.timesOfDay.length === 0) {
      throw new InvalidBulkScheduleError("Adicione ao menos um horário do dia.");
    }
    if (params.socialAccountIds.length === 0) {
      throw new InvalidBulkScheduleError("Selecione ao menos uma conta de destino.");
    }

    const folder = await prisma.mediaFolder.findFirst({
      where: { id: params.folderId, workspaceId: params.workspaceId },
    });
    if (!folder) throw new Error("Pasta não encontrada neste workspace.");

    const videos = await prisma.mediaAsset.findMany({
      where: {
        workspaceId: params.workspaceId,
        folderId: params.folderId,
        deletedAt: null,
        processingStatus: "READY",
        mimeType: { startsWith: "video/" },
      },
      orderBy: { position: "asc" },
    });
    if (videos.length === 0) throw new EmptyFolderError();

    const startDay = DateTime.fromISO(params.startDate, { zone: params.timezone }).startOf("day");
    if (!startDay.isValid) {
      throw new InvalidBulkScheduleError(`Data de início inválida: ${startDay.invalidReason ?? ""}`);
    }

    // Pre-compute (and validate) every scheduledAt up front so a bad date
    // fails loudly before a single post is created — never a partial batch.
    const schedule = videos.map((video, index) => {
      const dayOffset = Math.floor(index / params.timesOfDay.length);
      const slot = params.timesOfDay[index % params.timesOfDay.length]!;
      const scheduledAt = startDay.plus({ days: dayOffset }).set({ hour: slot.hour, minute: slot.minute, second: 0, millisecond: 0 });
      return { video, scheduledAt };
    });

    const firstInvalid = schedule.find(({ scheduledAt }) => scheduledAt.toMillis() < Date.now() + MIN_LEAD_TIME_MS);
    if (firstInvalid) {
      throw new InvalidBulkScheduleError(
        `O horário calculado para "${firstInvalid.video.originalFilename}" (${firstInvalid.scheduledAt.toFormat("dd/LL/yyyy HH:mm")}) já passou ou é muito próximo. Escolha uma data de início mais à frente.`,
      );
    }

    const createdPostIds: string[] = [];

    try {
      for (const { video, scheduledAt } of schedule) {
        const post = await PostService.createDraft({
          workspaceId: params.workspaceId,
          createdById: params.actorUserId,
          postType: "REEL",
        });
        createdPostIds.push(post.id);

        const caption =
          params.captionMode === "SHARED"
            ? (params.sharedCaption ?? "")
            : (params.captionsByMediaId?.[video.id] ?? "");

        await PostService.updateDraft({
          workspaceId: params.workspaceId,
          actorUserId: params.actorUserId,
          postId: post.id,
          caption,
          postType: "REEL",
          mediaAssetIds: [video.id],
          socialAccountIds: params.socialAccountIds,
        });

        await PostService.schedulePost({
          workspaceId: params.workspaceId,
          actorUserId: params.actorUserId,
          postId: post.id,
          scheduledAt: scheduledAt.toJSDate(),
          timezone: params.timezone,
        });
      }
    } catch (error) {
      await cleanupPartialBatch(params.workspaceId, params.actorUserId, createdPostIds);
      throw error;
    }

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "post.bulk_scheduled",
      resourceType: "media_folder",
      resourceId: params.folderId,
      metadata: { count: createdPostIds.length, socialAccountIds: params.socialAccountIds, startDate: params.startDate },
    });

    return { createdPostIds };
  },
};

/** Best-effort rollback of whatever this run managed to create before it failed. */
async function cleanupPartialBatch(workspaceId: string, actorUserId: string, postIds: string[]): Promise<void> {
  for (const postId of postIds) {
    try {
      await PostService.cancelPost({ workspaceId, actorUserId, postId });
    } catch {
      try {
        await PostService.deleteDraft(workspaceId, postId);
      } catch {
        // Already gone or in a state we can't touch — leave it for manual cleanup.
      }
    }
  }
}
