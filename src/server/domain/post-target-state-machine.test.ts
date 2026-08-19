import { describe, expect, it } from "vitest";
import type { PostTargetStatus } from "@prisma/client";

import {
  aggregatePostStatusFromTargets,
  assertPostTargetTransition,
  canTransitionPostTarget,
  InvalidPostTargetTransitionError,
} from "./post-target-state-machine";

describe("post target state machine", () => {
  it("allows the happy path", () => {
    const path: PostTargetStatus[] = [
      "QUEUED",
      "PREPARING",
      "PROCESSING_MEDIA",
      "PUBLISHING",
      "PUBLISHED",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransitionPostTarget(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("reaches MISSED_SCHEDULE from QUEUED and can recover from it", () => {
    expect(canTransitionPostTarget("QUEUED", "MISSED_SCHEDULE")).toBe(true);
    expect(canTransitionPostTarget("MISSED_SCHEDULE", "QUEUED")).toBe(true);
    expect(canTransitionPostTarget("MISSED_SCHEDULE", "CANCELED")).toBe(true);
  });

  it("supports retry from FAILED back to QUEUED", () => {
    expect(canTransitionPostTarget("FAILED", "QUEUED")).toBe(true);
  });

  it("never leaves a terminal state", () => {
    for (const to of ["QUEUED", "PREPARING", "FAILED"] as PostTargetStatus[]) {
      expect(canTransitionPostTarget("PUBLISHED", to)).toBe(false);
      expect(canTransitionPostTarget("CANCELED", to)).toBe(false);
    }
  });

  it("rejects illegal jumps with a typed error", () => {
    expect(() => assertPostTargetTransition("QUEUED", "PUBLISHED")).toThrow(
      InvalidPostTargetTransitionError,
    );
  });
});

describe("aggregatePostStatusFromTargets", () => {
  it("is PUBLISHED only when every target is PUBLISHED", () => {
    expect(aggregatePostStatusFromTargets(["PUBLISHED"])).toBe("PUBLISHED");
    expect(aggregatePostStatusFromTargets(["PUBLISHED", "QUEUED"])).not.toBe("PUBLISHED");
  });

  it("surfaces PUBLISHING while any target is publishing", () => {
    expect(aggregatePostStatusFromTargets(["PUBLISHED", "PUBLISHING"])).toBe("PUBLISHING");
  });

  it("treats FAILED and MISSED_SCHEDULE as FAILED at the post level", () => {
    expect(aggregatePostStatusFromTargets(["QUEUED", "FAILED"])).toBe("FAILED");
    expect(aggregatePostStatusFromTargets(["QUEUED", "MISSED_SCHEDULE"])).toBe("FAILED");
  });

  it("throws on an empty target list rather than guessing a status", () => {
    expect(() => aggregatePostStatusFromTargets([])).toThrow();
  });
});
