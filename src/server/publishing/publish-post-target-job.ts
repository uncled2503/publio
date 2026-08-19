import { prisma } from "@/server/db/prisma";
import { getInstagramProvider, InstagramProviderError } from "@/server/instagram";
import { SocialAccountService } from "@/server/services/social-account-service";
import { InstagramRateLimitService } from "@/server/services/instagram-rate-limit-service";
import { PostService } from "@/server/services/post-service";
import { AuditService } from "@/server/services/audit-service";
import { assertPostTargetTransition } from "@/server/domain/post-target-state-machine";
import { getStorageProvider } from "@/server/storage";
import { logger } from "@/server/observability/logger";

/**
 * Meta's own guidance for container processing: poll at most once a
 * minute, for no more than 5 minutes (docs/adr/ADR-005-instagram-oauth-flow.md).
 */
const CONTAINER_POLL_INTERVAL_MS = 60_000;
const CONTAINER_MAX_ATTEMPTS = 5;

class PermanentPublishError extends Error {}

/**
 * Runs one PostTarget through the whole publish pipeline: build the
 * container(s) for the post's type, wait for Meta to finish processing
 * them, publish, and record the result. Triggered by a BullMQ job
 * (queues.ts `schedulePostTargetPublish`), one job per target — never
 * called directly from a request handler (§16: the request/response cycle
 * never talks to Meta directly).
 */
export async function publishPostTarget(postTargetId: string): Promise<void> {
  const target = await prisma.postTarget.findUnique({
    where: { id: postTargetId },
    include: {
      post: { include: { media: { orderBy: { position: "asc" }, include: { mediaAsset: true } } } },
      socialAccount: true,
    },
  });
  if (!target) {
    logger.warn("publish.target_missing", { postTargetId });
    return;
  }
  if (target.status !== "QUEUED") {
    // Stale/duplicate job (e.g. already canceled or already ran) — no-op.
    logger.info("publish.skipped_not_queued", { postTargetId, status: target.status });
    return;
  }

  const attemptNumber = (await prisma.publishAttempt.count({ where: { postTargetId } })) + 1;
  const attempt = await prisma.publishAttempt.create({
    data: { postTargetId, attemptNumber, status: "RUNNING" },
  });

  try {
    if (target.socialAccount.tokenStatus !== "CONNECTED" && target.socialAccount.tokenStatus !== "EXPIRING") {
      await transitionTarget(target.id, "MISSED_SCHEDULE");
      throw new PermanentPublishError(
        "A conta do Instagram foi desconectada antes da publicação ser executada.",
      );
    }

    await InstagramRateLimitService.assertCanPublish(target.socialAccountId);

    await transitionTarget(target.id, "PREPARING");
    const accessToken = await SocialAccountService.getDecryptedAccessToken(target.socialAccountId);
    const provider = getInstagramProvider();
    const igUserId = target.socialAccount.instagramUserId;
    const storage = getStorageProvider();
    const caption = target.post.caption;
    const media = target.post.media;

    await transitionTarget(target.id, "PROCESSING_MEDIA");

    let containerId: string;
    if (target.post.postType === "IMAGE") {
      containerId = await provider.createMediaContainer({
        igUserId,
        accessToken,
        imageUrl: storage.getPublicUrl(media[0]!.mediaAsset.storageKey),
        caption,
      });
    } else if (target.post.postType === "REEL") {
      containerId = await provider.createReelContainer({
        igUserId,
        accessToken,
        videoUrl: storage.getPublicUrl(media[0]!.mediaAsset.storageKey),
        caption,
      });
    } else {
      const childIds: string[] = [];
      for (const item of media) {
        const url = storage.getPublicUrl(item.mediaAsset.storageKey);
        const childId = await provider.createCarouselItemContainer({
          igUserId,
          accessToken,
          imageUrl: item.mediaType === "IMAGE" ? url : undefined,
          videoUrl: item.mediaType === "VIDEO" ? url : undefined,
        });
        childIds.push(childId);
      }
      containerId = await provider.createCarouselContainer({
        igUserId,
        accessToken,
        childrenContainerIds: childIds,
        caption,
      });
    }

    await prisma.postTarget.update({ where: { id: target.id }, data: { providerContainerId: containerId } });

    let finished = false;
    for (let i = 0; i < CONTAINER_MAX_ATTEMPTS && !finished; i++) {
      if (i > 0) await sleep(CONTAINER_POLL_INTERVAL_MS);
      const status = await provider.checkContainerStatus(containerId, accessToken);
      if (status === "FINISHED" || status === "PUBLISHED") {
        finished = true;
      } else if (status === "ERROR" || status === "EXPIRED") {
        throw new PermanentPublishError(`Instagram rejeitou o processamento da mídia (status: ${status}).`);
      }
    }
    if (!finished) {
      throw new InstagramProviderError(
        "INSTAGRAM_TEMPORARY_ERROR",
        "O Instagram ainda está processando esta mídia depois do tempo máximo de espera.",
        true,
      );
    }

    await transitionTarget(target.id, "PUBLISHING");
    const published = await provider.publishContainer(igUserId, containerId, accessToken);
    const permalink = await provider.getPermalink(published.externalPostId, accessToken);

    await prisma.postTarget.update({
      where: { id: target.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        externalPostId: published.externalPostId,
        externalPermalink: permalink,
      },
    });
    await prisma.publishAttempt.update({
      where: { id: attempt.id },
      data: { status: "SUCCESS", finishedAt: new Date(), providerRequestId: published.externalPostId },
    });

    await AuditService.log({
      workspaceId: target.post.workspaceId,
      action: "publish.succeeded",
      resourceType: "post",
      resourceId: target.post.id,
      metadata: { socialAccountId: target.socialAccountId, externalPostId: published.externalPostId },
    });
  } catch (error) {
    await handleFailure(target.id, target.post.id, target.post.workspaceId, attempt.id, error);
    throw error; // let BullMQ apply its retry/backoff policy
  } finally {
    await PostService.syncStatusFromTargets(target.post.id);
  }
}

async function transitionTarget(postTargetId: string, to: Parameters<typeof assertPostTargetTransition>[1]) {
  const current = await prisma.postTarget.findUniqueOrThrow({ where: { id: postTargetId } });
  assertPostTargetTransition(current.status, to);
  await prisma.postTarget.update({ where: { id: postTargetId }, data: { status: to } });
}

async function handleFailure(
  postTargetId: string,
  postId: string,
  workspaceId: string,
  attemptId: string,
  error: unknown,
): Promise<void> {
  const providerError = error instanceof InstagramProviderError ? error : null;
  const retryable = providerError?.retryable ?? !(error instanceof PermanentPublishError);
  const message = error instanceof Error ? error.message : String(error);

  await prisma.publishAttempt.update({
    where: { id: attemptId },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      providerErrorCode: providerError?.providerErrorCode,
      providerErrorType: providerError?.providerErrorType,
      errorMessage: message,
      retryable,
    },
  });

  const current = await prisma.postTarget.findUnique({ where: { id: postTargetId } });
  if (current && current.status !== "MISSED_SCHEDULE" && current.status !== "CANCELED") {
    await prisma.postTarget.update({
      where: { id: postTargetId },
      data: { status: "FAILED", lastErrorCode: providerError?.code, lastErrorMessage: message },
    });
  }

  logger.error("publish.failed", { postTargetId, postId, retryable, message });
  await AuditService.log({
    workspaceId,
    action: "publish.failed",
    resourceType: "post",
    resourceId: postId,
    metadata: { postTargetId, message },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
