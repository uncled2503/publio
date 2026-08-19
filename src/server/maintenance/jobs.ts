import { prisma } from "@/server/db/prisma";
import { getStorageProvider } from "@/server/storage";
import { SocialAccountService } from "@/server/services/social-account-service";
import { getPublishPostTargetQueue, schedulePostTargetPublish } from "@/server/queue/queues";
import { logger } from "@/server/observability/logger";

const RECONCILE_GRACE_MS = 10 * 60 * 1000;
const MEDIA_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Safety net for BullMQ's own persistence: a delayed job that's still in
 * Redis survives worker downtime and just waits, but if the job itself was
 * ever lost (Redis data loss, a scheduling bug that never actually
 * enqueued one) the PostTarget would sit in QUEUED forever with nothing
 * watching it. Finds targets clearly past their scheduled time with no
 * corresponding job and re-enqueues them immediately. Never touches
 * Post/PostTarget status directly — that's the publish job's job.
 */
export async function reconcileStuckTargets(): Promise<{ checked: number; reenqueued: number }> {
  const cutoff = new Date(Date.now() - RECONCILE_GRACE_MS);
  const stuck = await prisma.postTarget.findMany({
    where: { status: "QUEUED", scheduledAt: { not: null, lt: cutoff } },
  });

  const queue = getPublishPostTargetQueue();
  let reenqueued = 0;
  for (const target of stuck) {
    const job = await queue.getJob(target.id);
    if (job) continue; // legitimately still pending or already running

    logger.warn("maintenance.reconcile.orphaned_target", {
      postTargetId: target.id,
      postId: target.postId,
      scheduledAt: target.scheduledAt,
    });
    await schedulePostTargetPublish(target.id, new Date());
    reenqueued++;
  }

  return { checked: stuck.length, reenqueued };
}

/**
 * Proactively re-checks every connected/expiring Instagram token against
 * Meta so a revoked/expired token surfaces as REAUTH_REQUIRED on the
 * Accounts page before the user's next scheduled post fails on it.
 */
export async function validateConnectedTokens(): Promise<{ checked: number; nowInvalid: number }> {
  const accounts = await prisma.socialAccount.findMany({
    where: { tokenStatus: { in: ["CONNECTED", "EXPIRING"] } },
    select: { id: true },
  });

  let nowInvalid = 0;
  for (const account of accounts) {
    const updated = await SocialAccountService.validateAndSync(account.id);
    if (updated.tokenStatus !== "CONNECTED" && updated.tokenStatus !== "EXPIRING") nowInvalid++;
  }

  return { checked: accounts.length, nowInvalid };
}

/**
 * MediaService.softDelete only ever sets deletedAt (and only after
 * confirming nothing references the asset) — nothing actually freed the
 * R2 object. After a retention window, delete the real object(s) and the
 * row. A storage failure leaves the row for the next run to retry rather
 * than losing track of it.
 */
export async function cleanupDeletedMedia(): Promise<{ purged: number }> {
  const cutoff = new Date(Date.now() - MEDIA_RETENTION_MS);
  const assets = await prisma.mediaAsset.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
  });

  const storage = getStorageProvider();
  let purged = 0;
  for (const asset of assets) {
    try {
      await storage.deleteObject(asset.storageKey);
      const metadata = asset.metadata as { thumbnailKey?: string } | null;
      if (metadata?.thumbnailKey) await storage.deleteObject(metadata.thumbnailKey);
    } catch (error) {
      logger.error("maintenance.cleanup.storage_delete_failed", {
        mediaAssetId: asset.id,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    purged++;
  }

  return { purged };
}
