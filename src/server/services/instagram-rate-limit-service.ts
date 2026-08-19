import { prisma } from "@/server/db/prisma";
import { InstagramProviderError } from "@/server/instagram";

/**
 * Meta's documented cap: 100 API-published posts per Instagram account per
 * rolling 24h window (docs/adr/ADR-005-instagram-oauth-flow.md). Kept as a
 * single named constant rather than scattered through the codebase (§19).
 */
const DAILY_PUBLISH_LIMIT = 100;
const WARNING_THRESHOLD_RATIO = 0.8;

export const InstagramRateLimitService = {
  async getUsage(socialAccountId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const used = await prisma.publishAttempt.count({
      where: {
        status: "SUCCESS",
        finishedAt: { gte: since },
        postTarget: { socialAccountId },
      },
    });

    return {
      used,
      limit: DAILY_PUBLISH_LIMIT,
      approachingLimit: used >= DAILY_PUBLISH_LIMIT * WARNING_THRESHOLD_RATIO,
      atLimit: used >= DAILY_PUBLISH_LIMIT,
    };
  },

  /** Throws a retryable INSTAGRAM_RATE_LIMITED error if the account is at its daily cap. */
  async assertCanPublish(socialAccountId: string): Promise<void> {
    const usage = await this.getUsage(socialAccountId);
    if (usage.atLimit) {
      throw new InstagramProviderError(
        "INSTAGRAM_RATE_LIMITED",
        `This Instagram account has reached Meta's publishing limit (${usage.limit} posts/24h). This will be retried automatically once the window rolls over.`,
        true,
      );
    }
  },
};
