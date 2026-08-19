import { Worker, type Job } from "bullmq";

import { assertProductionSafety } from "@/server/config/env";
import { getRedisConnection } from "@/server/queue/connection";
import {
  QUEUE_NAMES,
  MAINTENANCE_JOB_NAMES,
  registerMaintenanceSchedules,
  type MediaProcessingJobData,
  type PublishPostTargetJobData,
  type MaintenanceJobData,
} from "@/server/queue/queues";
import { processMediaAsset } from "@/server/media/media-processing-job";
import { publishPostTarget } from "@/server/publishing/publish-post-target-job";
import {
  reconcileStuckTargets,
  validateConnectedTokens,
  cleanupDeletedMedia,
} from "@/server/maintenance/jobs";
import { logger } from "@/server/observability/logger";

/**
 * Standalone worker process — run with `npm run worker`. This is
 * deliberately NOT part of the Next.js app; it's a long-running Node
 * process meant to run continuously (on your own machine per
 * docs/adr/ADR-006, or on any always-on host later). Vercel serverless
 * functions cannot host this.
 */

assertProductionSafety();

const connection = getRedisConnection();

const mediaProcessingWorker = new Worker<MediaProcessingJobData>(
  QUEUE_NAMES.mediaProcessing,
  async (job: Job<MediaProcessingJobData>) => {
    logger.info("worker.media_processing.started", { jobId: job.id, mediaAssetId: job.data.mediaAssetId });
    await processMediaAsset(job.data.mediaAssetId);
  },
  { connection, concurrency: 4 },
);

mediaProcessingWorker.on("completed", (job) => {
  logger.info("worker.media_processing.completed", { jobId: job.id, mediaAssetId: job.data.mediaAssetId });
});

mediaProcessingWorker.on("failed", (job, err) => {
  logger.error("worker.media_processing.failed", {
    jobId: job?.id,
    mediaAssetId: job?.data.mediaAssetId,
    attemptsMade: job?.attemptsMade,
    message: err.message,
  });
});

const publishPostTargetWorker = new Worker<PublishPostTargetJobData>(
  QUEUE_NAMES.publishPostTarget,
  async (job: Job<PublishPostTargetJobData>) => {
    logger.info("worker.publish.started", { jobId: job.id, postTargetId: job.data.postTargetId });
    await publishPostTarget(job.data.postTargetId);
  },
  // Concurrency 1: publishing is I/O-bound but rate-limit-sensitive against
  // Meta's API — no need to parallelize within a single worker process.
  { connection, concurrency: 1 },
);

publishPostTargetWorker.on("completed", (job) => {
  logger.info("worker.publish.completed", { jobId: job.id, postTargetId: job.data.postTargetId });
});

publishPostTargetWorker.on("failed", (job, err) => {
  logger.error("worker.publish.failed", {
    jobId: job?.id,
    postTargetId: job?.data.postTargetId,
    attemptsMade: job?.attemptsMade,
    message: err.message,
  });
});

const maintenanceWorker = new Worker<MaintenanceJobData>(
  QUEUE_NAMES.maintenance,
  async (job: Job<MaintenanceJobData>) => {
    logger.info("worker.maintenance.started", { jobId: job.id, name: job.name });
    switch (job.name) {
      case MAINTENANCE_JOB_NAMES.reconcile:
        return reconcileStuckTargets();
      case MAINTENANCE_JOB_NAMES.validateTokens:
        return validateConnectedTokens();
      case MAINTENANCE_JOB_NAMES.cleanupMedia:
        return cleanupDeletedMedia();
      default:
        logger.warn("worker.maintenance.unknown_job", { name: job.name });
        return null;
    }
  },
  { connection, concurrency: 1 },
);

maintenanceWorker.on("completed", (job, result) => {
  logger.info("worker.maintenance.completed", { jobId: job.id, name: job.name, result });
});

maintenanceWorker.on("failed", (job, err) => {
  logger.error("worker.maintenance.failed", { jobId: job?.id, name: job?.name, message: err.message });
});

registerMaintenanceSchedules()
  .then(() => logger.info("worker.started", { queues: Object.values(QUEUE_NAMES) }))
  .catch((error: unknown) => {
    logger.error("worker.maintenance_schedule_registration_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });

async function shutdown(signal: string) {
  logger.info("worker.shutting_down", { signal });
  await mediaProcessingWorker.close();
  await publishPostTargetWorker.close();
  await maintenanceWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
