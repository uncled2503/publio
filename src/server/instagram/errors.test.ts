import { describe, expect, it } from "vitest";

import { normalizeProviderError, normalizeTransportError } from "./errors";

function metaError(code: number, subcode?: number, type = "OAuthException") {
  return { error: { message: "test", type, code, error_subcode: subcode } };
}

describe("normalizeProviderError", () => {
  it("maps OAuthException 190 to INSTAGRAM_REAUTH_REQUIRED, non-retryable", () => {
    const err = normalizeProviderError(400, metaError(190));
    expect(err.code).toBe("INSTAGRAM_REAUTH_REQUIRED");
    expect(err.retryable).toBe(false);
  });

  it("maps a known reauth subcode even under a different top-level code", () => {
    const err = normalizeProviderError(400, metaError(400, 463));
    expect(err.code).toBe("INSTAGRAM_REAUTH_REQUIRED");
  });

  it("maps permission errors to INSTAGRAM_PERMISSION_MISSING, non-retryable", () => {
    const err = normalizeProviderError(403, metaError(200));
    expect(err.code).toBe("INSTAGRAM_PERMISSION_MISSING");
    expect(err.retryable).toBe(false);
  });

  it("maps rate-limit codes to INSTAGRAM_RATE_LIMITED, retryable", () => {
    const err = normalizeProviderError(429, metaError(4));
    expect(err.code).toBe("INSTAGRAM_RATE_LIMITED");
    expect(err.retryable).toBe(true);
  });

  it("maps invalid-parameter codes to INSTAGRAM_MEDIA_INVALID, non-retryable", () => {
    const err = normalizeProviderError(400, metaError(2207026));
    expect(err.code).toBe("INSTAGRAM_MEDIA_INVALID");
    expect(err.retryable).toBe(false);
  });

  it("treats 5xx / 429-without-known-code as temporary and retryable", () => {
    const err = normalizeProviderError(503, {});
    expect(err.code).toBe("INSTAGRAM_TEMPORARY_ERROR");
    expect(err.retryable).toBe(true);
  });

  it("treats unrecognized 4xx as non-retryable rather than guessing", () => {
    const err = normalizeProviderError(400, metaError(999999));
    expect(err.code).toBe("PUBLISHING_UNKNOWN_STATE");
    expect(err.retryable).toBe(false);
  });

  it("never leaks the raw error into the message shown to users", () => {
    const err = normalizeProviderError(400, metaError(190));
    expect(err.message).not.toContain("OAuthException");
  });
});

describe("normalizeTransportError", () => {
  it("is always retryable", () => {
    const err = normalizeTransportError(new Error("fetch failed"));
    expect(err.code).toBe("INSTAGRAM_TEMPORARY_ERROR");
    expect(err.retryable).toBe(true);
  });
});
