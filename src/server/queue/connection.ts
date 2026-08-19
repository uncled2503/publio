import IORedis from "ioredis";

import { env } from "@/server/config/env";

/**
 * Single shared Redis connection for BullMQ, in both the Next.js process
 * (enqueuing jobs) and the worker process (running them). BullMQ requires
 * `maxRetriesPerRequest: null` on the connection it's handed — without it,
 * its blocking commands (used for job polling) fail after ioredis's
 * default retry budget is exhausted. `rediss://` (Upstash, Redis Cloud)
 * is auto-detected from the URL scheme, no separate TLS flag needed.
 */
const globalForRedis = globalThis as unknown as { redisConnection?: IORedis };

export function getRedisConnection(): IORedis {
  if (!globalForRedis.redisConnection) {
    globalForRedis.redisConnection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return globalForRedis.redisConnection;
}
