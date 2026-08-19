import { PrismaClient } from "@prisma/client";

import { env } from "@/server/config/env";

// Reuse a single PrismaClient across hot reloads in dev so we don't exhaust
// Postgres connections on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
