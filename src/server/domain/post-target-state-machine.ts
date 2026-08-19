import type { PostTargetStatus } from "@prisma/client";

/**
 * State machine for `PostTarget.status` — the per-Instagram-account
 * publishing pipeline that the worker actually drives (§6, §15, §68).
 *
 * MISSED_SCHEDULE is reached when a job runs and finds the target can no
 * longer be published blindly (e.g. the social account was disconnected
 * while the post was waiting) — see docs/job-queue.md "delayed publication
 * policy". From there the user chooses: publish now, reschedule, or cancel.
 */
const ALLOWED_TRANSITIONS: Record<PostTargetStatus, readonly PostTargetStatus[]> = {
  QUEUED: ["PREPARING", "CANCELED", "MISSED_SCHEDULE"],
  PREPARING: ["PROCESSING_MEDIA", "FAILED", "CANCELED"],
  PROCESSING_MEDIA: ["PUBLISHING", "FAILED", "CANCELED"],
  PUBLISHING: ["PUBLISHED", "FAILED"],
  PUBLISHED: [],
  FAILED: ["QUEUED", "CANCELED"],
  CANCELED: [],
  MISSED_SCHEDULE: ["QUEUED", "CANCELED"],
};

export class InvalidPostTargetTransitionError extends Error {
  constructor(
    public readonly from: PostTargetStatus,
    public readonly to: PostTargetStatus,
  ) {
    super(`Cannot transition post target from ${from} to ${to}`);
    this.name = "InvalidPostTargetTransitionError";
  }
}

export function canTransitionPostTarget(from: PostTargetStatus, to: PostTargetStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertPostTargetTransition(from: PostTargetStatus, to: PostTargetStatus): void {
  if (!canTransitionPostTarget(from, to)) {
    throw new InvalidPostTargetTransitionError(from, to);
  }
}

export function isTerminalPostTargetStatus(status: PostTargetStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/**
 * Aggregates a post's target statuses into a single Post.status.
 * With the v1 UI (one target per post) this is a direct mirror; the rule
 * is written generically so multi-target posts (§37 future networks, or
 * multiple Instagram accounts on one post) work without change.
 */
export function aggregatePostStatusFromTargets(
  targetStatuses: readonly PostTargetStatus[],
): "QUEUED" | "PREPARING" | "PROCESSING_MEDIA" | "PUBLISHING" | "PUBLISHED" | "FAILED" {
  if (targetStatuses.length === 0) {
    throw new Error("Cannot aggregate status from zero targets");
  }
  if (targetStatuses.every((s) => s === "PUBLISHED")) return "PUBLISHED";
  if (targetStatuses.some((s) => s === "PUBLISHING")) return "PUBLISHING";
  if (targetStatuses.some((s) => s === "PROCESSING_MEDIA")) return "PROCESSING_MEDIA";
  if (targetStatuses.some((s) => s === "PREPARING")) return "PREPARING";
  if (targetStatuses.some((s) => s === "FAILED" || s === "MISSED_SCHEDULE")) return "FAILED";
  return "QUEUED";
}
