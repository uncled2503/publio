import type { PostStatus } from "@prisma/client";

/**
 * Explicit state machine for `Post.status` (§6 of the spec). No code may
 * assign `post.status` directly outside of code that has gone through
 * `assertPostTransition` first — this is what keeps "a beautiful app that
 * occasionally double-publishes" from happening (§88).
 *
 * Post.status is the coarse, user-facing status. The authoritative,
 * per-account publishing pipeline lives on PostTarget
 * (see post-target-state-machine.ts) and is aggregated back onto the post
 * by PostService.syncStatusFromTargets.
 */
const ALLOWED_TRANSITIONS: Record<PostStatus, readonly PostStatus[]> = {
  DRAFT: ["SCHEDULED", "QUEUED", "CANCELED"],
  SCHEDULED: ["QUEUED", "DRAFT", "CANCELED"],
  QUEUED: ["PREPARING", "CANCELED"],
  PREPARING: ["PROCESSING_MEDIA", "FAILED", "CANCELED"],
  PROCESSING_MEDIA: ["PUBLISHING", "FAILED", "CANCELED"],
  PUBLISHING: ["PUBLISHED", "FAILED"],
  PUBLISHED: [],
  FAILED: ["QUEUED", "CANCELED"],
  CANCELED: [],
};

export class InvalidPostTransitionError extends Error {
  constructor(
    public readonly from: PostStatus,
    public readonly to: PostStatus,
  ) {
    super(`Cannot transition post from ${from} to ${to}`);
    this.name = "InvalidPostTransitionError";
  }
}

export function canTransitionPost(from: PostStatus, to: PostStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertPostTransition(from: PostStatus, to: PostStatus): void {
  if (!canTransitionPost(from, to)) {
    throw new InvalidPostTransitionError(from, to);
  }
}

export function isTerminalPostStatus(status: PostStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
