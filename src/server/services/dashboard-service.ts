import { prisma } from "@/server/db/prisma";

export const DashboardService = {
  async getSummary(workspaceId: string) {
    const [connectedAccounts, scheduledPosts, recentlyPublished, failedTargets, upcoming] =
      await Promise.all([
        prisma.socialAccount.count({
          where: { workspaceId, tokenStatus: "CONNECTED" },
        }),
        prisma.post.count({
          where: {
            workspaceId,
            status: { in: ["SCHEDULED", "QUEUED", "PREPARING", "PROCESSING_MEDIA", "PUBLISHING"] },
          },
        }),
        prisma.post.count({
          where: {
            workspaceId,
            status: "PUBLISHED",
            updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.post.count({ where: { workspaceId, status: "FAILED" } }),
        prisma.post.findMany({
          where: { workspaceId, status: { in: ["SCHEDULED", "QUEUED"] } },
          orderBy: { scheduledAt: "asc" },
          take: 5,
          include: {
            media: { include: { mediaAsset: true }, orderBy: { position: "asc" }, take: 1 },
          },
        }),
      ]);

    const accountsNeedingReauth = await prisma.socialAccount.findMany({
      where: {
        workspaceId,
        tokenStatus: { in: ["REAUTH_REQUIRED", "PERMISSION_REVOKED", "ERROR"] },
      },
      select: { id: true, username: true, tokenStatus: true },
    });

    return {
      connectedAccounts,
      scheduledPosts,
      recentlyPublished,
      failedTargets,
      upcoming,
      accountsNeedingReauth,
    };
  },
};
