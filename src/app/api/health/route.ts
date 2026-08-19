import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { getRedisConnection } from "@/server/queue/connection";

/**
 * Unauthenticated liveness/readiness probe for uptime monitoring — checks
 * the two external dependencies the web app can't function without.
 * Deliberately reveals nothing about data, just up/down per dependency.
 */
export async function GET() {
  const [db, redis] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    getRedisConnection().ping(),
  ]);

  const checks = {
    database: db.status === "fulfilled",
    redis: redis.status === "fulfilled",
  };
  const healthy = checks.database && checks.redis;

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
