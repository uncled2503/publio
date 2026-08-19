import { Worker, type Job } from "bullmq";

import { assertProductionSafety } from "@/server/config/env";
import { getRedisConnection } from "@/server/queue/connection";
import { QUEUE_NAMES, type MediaProcessingJobData } from "@/server/queue/queues";
import { processMediaAsset } from "@/server/media/media-processing-job";
import { logger } from "@/server/observability/logger";

/**
 * Standalone worker process — run with `npm run worker`. This is
 * deliberately NOT part of the Next.js app; it's a long-running Node
 * process meant to run continuously (on your own machine per
 * docs/adr/ADR-006, or on any always-on host later). Vercel serverless
 * functions cannot host this.
 *
 * Phase 6/7 add a `publish-post-target` worker here alongside this one.
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

logger.info("worker.started", { queues: Object.values(QUEUE_NAMES) });

async function shutdown(signal: string) {
  logger.info("worker.shutting_down", { signal });
  await mediaProcessingWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
