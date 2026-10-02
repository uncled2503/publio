import { prisma } from "@/server/db/prisma";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const AdminService = {
  async getOverview() {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    const [
      totalUsers,
      newUsersLast7Days,
      totalWorkspaces,
      publishedPosts,
      scheduledPosts,
      failedPosts,
      connectedAccounts,
      accountsNeedingAttention,
      recentSignups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.workspace.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({
        where: { status: { in: ["SCHEDULED", "QUEUED", "PREPARING", "PROCESSING_MEDIA", "PUBLISHING"] } },
      }),
      prisma.post.count({ where: { status: "FAILED" } }),
      prisma.socialAccount.count({ where: { tokenStatus: "CONNECTED" } }),
      prisma.socialAccount.count({
        where: { tokenStatus: { in: ["EXPIRING", "REAUTH_REQUIRED", "PERMISSION_REVOKED", "ERROR"] } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, email: true, createdAt: true },
      }),
    ]);

    return {
      totalUsers,
      newUsersLast7Days,
      totalWorkspaces,
      publishedPosts,
      scheduledPosts,
      failedPosts,
      connectedAccounts,
      accountsNeedingAttention,
      recentSignups,
    };
  },
};
