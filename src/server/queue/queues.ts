import { Queue } from "bullmq";

import { getRedisConnection } from "./connection";

/**
 * Central registry of queue names and their job payload shapes — one
 * registry, not queue names scattered through the codebase.
 */
export const QUEUE_NAMES = {
  mediaProcessing: "media-processing",
  publishPostTarget: "publish-post-target",
  maintenance: "maintenance",
} as const;

export interface MediaProcessingJobData {
  mediaAssetId: string;
}

export interface PublishPostTargetJobData {
  postTargetId: string;
}

/** No payload — each maintenance job scans the DB itself when it runs. */
export type MaintenanceJobData = Record<string, never>;

export const MAINTENANCE_JOB_NAMES = {
  reconcile: "reconcile",
  validateTokens: "validate-tokens",
  cleanupMedia: "cleanup-media",
} as const;

const queues = new Map<string, Queue>();

function getQueue<T extends object>(name: string): Queue<T> {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getRedisConnection() });
    queues.set(name, queue);
  }
  return queue as Queue<T>;
}

export function getMediaProcessingQueue(): Queue<MediaProcessingJobData> {
  return getQueue<MediaProcessingJobData>(QUEUE_NAMES.mediaProcessing);
}

export async function enqueueMediaProcessing(mediaAssetId: string): Promise<void> {
  await getMediaProcessingQueue().add(
    "process",
    { mediaAssetId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 60 * 60 },
      removeOnFail: { age: 24 * 60 * 60 },
    },
  );
}

export function getPublishPostTargetQueue(): Queue<PublishPostTargetJobData> {
  return getQueue<PublishPostTargetJobData>(QUEUE_NAMES.publishPostTarget);
}

/**
 * Schedules (or immediately queues, for `publishAt <= now`) the job that
 * actually publishes one PostTarget. Uses a deterministic jobId
 * (the PostTarget's own id) so a reschedule/cancel can find and remove the
 * exact pending job instead of tracking a separate BullMQ job id anywhere.
 */
export async function schedulePostTargetPublish(
  postTargetId: string,
  publishAt: Date,
): Promise<void> {
  const delay = Math.max(0, publishAt.getTime() - Date.now());
  await getPublishPostTargetQueue().add(
    "publish",
    { postTargetId },
    {
      jobId: postTargetId,
      delay,
      attempts: 4,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: { age: 24 * 60 * 60 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  );
}

/** Removes a not-yet-started publish job — used on cancel/reschedule. No-op if it already ran. */
export async function cancelScheduledPublish(postTargetId: string): Promise<void> {
  const job = await getPublishPostTargetQueue().getJob(postTargetId);
  if (job) await job.remove();
}

export function getMaintenanceQueue(): Queue<MaintenanceJobData> {
  return getQueue<MaintenanceJobData>(QUEUE_NAMES.maintenance);
}

/**
 * Registers the three recurring maintenance jobs (§Phase 10 — reconciliation,
 * token validation, media cleanup) as BullMQ job schedulers. Idempotent:
 * upsertJobScheduler keyed by name replaces any existing schedule rather
 * than piling up duplicates on every worker restart, so this is safe to
 * call unconditionally at worker startup.
 */
export async function registerMaintenanceSchedules(): Promise<void> {
  const queue = getMaintenanceQueue();
  await queue.upsertJobScheduler(
    MAINTENANCE_JOB_NAMES.reconcile,
    { every: 5 * 60 * 1000 },
    { name: MAINTENANCE_JOB_NAMES.reconcile, data: {} },
  );
  await queue.upsertJobScheduler(
    MAINTENANCE_JOB_NAMES.validateTokens,
    { every: 6 * 60 * 60 * 1000 },
    { name: MAINTENANCE_JOB_NAMES.validateTokens, data: {} },
  );
  await queue.upsertJobScheduler(
    MAINTENANCE_JOB_NAMES.cleanupMedia,
    { every: 24 * 60 * 60 * 1000 },
    { name: MAINTENANCE_JOB_NAMES.cleanupMedia, data: {} },
  );
}
