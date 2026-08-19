import { Queue } from "bullmq";

import { getRedisConnection } from "./connection";

/**
 * Central registry of queue names and their job payload shapes. Phase 6/7
 * add `publishPostTarget` here alongside `mediaProcessing` — one registry,
 * not queue names scattered through the codebase.
 */
export const QUEUE_NAMES = {
  mediaProcessing: "media-processing",
} as const;

export interface MediaProcessingJobData {
  mediaAssetId: string;
}

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
