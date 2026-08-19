import { describe, expect, it } from "vitest";
import type { PostStatus } from "@prisma/client";

import {
  assertPostTransition,
  canTransitionPost,
  InvalidPostTransitionError,
  isTerminalPostStatus,
  nextPostStatuses,
} from "./post-state-machine";

const ALL_STATUSES: PostStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "QUEUED",
  "PREPARING",
  "PROCESSING_MEDIA",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "CANCELED",
];

describe("post state machine", () => {
  it("allows the documented happy path", () => {
    const path: PostStatus[] = [
      "DRAFT",
      "SCHEDULED",
      "QUEUED",
      "PREPARING",
      "PROCESSING_MEDIA",
      "PUBLISHING",
      "PUBLISHED",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransitionPost(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("allows retry from FAILED back to QUEUED", () => {
    expect(canTransitionPost("FAILED", "QUEUED")).toBe(true);
  });

  it("allows publish-now to skip SCHEDULED", () => {
    expect(canTransitionPost("DRAFT", "QUEUED")).toBe(true);
  });

  it("allows cancellation from every non-terminal state", () => {
    const cancelable: PostStatus[] = [
      "DRAFT",
      "SCHEDULED",
      "QUEUED",
      "PREPARING",
      "PROCESSING_MEDIA",
      "FAILED",
    ];
    for (const status of cancelable) {
      expect(canTransitionPost(status, "CANCELED")).toBe(true);
    }
  });

  it("never allows leaving PUBLISHED or CANCELED", () => {
    expect(isTerminalPostStatus("PUBLISHED")).toBe(true);
    expect(isTerminalPostStatus("CANCELED")).toBe(true);
    for (const status of ALL_STATUSES) {
      expect(canTransitionPost("PUBLISHED", status)).toBe(false);
      expect(canTransitionPost("CANCELED", status)).toBe(false);
    }
  });

  it("never allows skipping straight from PUBLISHING to anything but PUBLISHED/FAILED", () => {
    for (const status of ALL_STATUSES) {
      const allowed = status === "PUBLISHED" || status === "FAILED";
      expect(canTransitionPost("PUBLISHING", status)).toBe(allowed);
    }
  });

  it("rejects an arbitrary illegal jump and throws a typed error", () => {
    expect(canTransitionPost("DRAFT", "PUBLISHED")).toBe(false);
    expect(() => assertPostTransition("DRAFT", "PUBLISHED")).toThrow(InvalidPostTransitionError);
  });

  it("assertPostTransition is a no-op for legal transitions", () => {
    expect(() => assertPostTransition("QUEUED", "PREPARING")).not.toThrow();
  });

  it("nextPostStatuses agrees with canTransitionPost for every state", () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        expect(nextPostStatuses(from).includes(to)).toBe(canTransitionPost(from, to));
      }
    }
  });
});
