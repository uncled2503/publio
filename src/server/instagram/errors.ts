import { InstagramProviderError, type InstagramErrorCode } from "./types";

interface MetaErrorPayload {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Maps a raw Meta Graph API error (or transport failure) onto Publio's
 * internal error taxonomy (§44). Codes below are Meta's well-documented,
 * stable error codes (OAuthException family, permission errors, rate
 * limiting, invalid parameter). Anything not recognized here is treated as
 * a *non-retryable* unknown error rather than guessed at — see
 * docs/instagram-publishing.md for how to extend this table once more
 * codes are observed against a live app.
 */
export function normalizeProviderError(
  httpStatus: number,
  body: unknown,
  fallbackMessage = "Instagram request failed",
): InstagramProviderError {
  const payload = (body ?? {}) as MetaErrorPayload;
  const err = payload.error;
  const code = err?.code;
  const subcode = err?.error_subcode;
  const type = err?.type;
  const message = err?.message ?? fallbackMessage;

  const reauthCodes = new Set([190]);
  const reauthSubcodes = new Set([458, 459, 460, 463, 464, 467]);
  if (code !== undefined && reauthCodes.has(code)) {
    return new InstagramProviderError(
      "INSTAGRAM_REAUTH_REQUIRED",
      "The Instagram connection has expired or was revoked and needs to be reconnected.",
      false,
      String(code),
      type,
      body,
    );
  }
  if (subcode !== undefined && reauthSubcodes.has(subcode)) {
    return new InstagramProviderError(
      "INSTAGRAM_REAUTH_REQUIRED",
      "The Instagram connection has expired or was revoked and needs to be reconnected.",
      false,
      String(code),
      type,
      body,
    );
  }

  const permissionCodes = new Set([10, 200, 299]);
  if (code !== undefined && permissionCodes.has(code)) {
    return new InstagramProviderError(
      "INSTAGRAM_PERMISSION_MISSING",
      "Publio doesn't have permission to publish to this Instagram account. Reconnect and grant the requested permissions.",
      false,
      String(code),
      type,
      body,
    );
  }

  const rateLimitCodes = new Set([4, 9, 17, 32, 613]);
  if (code !== undefined && rateLimitCodes.has(code)) {
    return new InstagramProviderError(
      "INSTAGRAM_RATE_LIMITED",
      "Instagram's publishing rate limit was reached. This will be retried automatically.",
      true,
      String(code),
      type,
      body,
    );
  }

  const invalidMediaCodes = new Set([100, 2207001, 2207003, 2207026, 2207032, 2207052, 2207053]);
  if (code !== undefined && invalidMediaCodes.has(code)) {
    return new InstagramProviderError(
      "INSTAGRAM_MEDIA_INVALID",
      "Instagram rejected this media as incompatible with the selected post type.",
      false,
      String(code),
      type,
      body,
    );
  }

  if (httpStatus >= 500 || httpStatus === 429) {
    return new InstagramProviderError(
      "INSTAGRAM_TEMPORARY_ERROR",
      "Instagram is temporarily unavailable. This will be retried automatically.",
      true,
      code !== undefined ? String(code) : undefined,
      type,
      body,
    );
  }

  // Unrecognized 4xx: don't guess — treat as non-retryable so it surfaces
  // to a human instead of burning retry attempts against a permanent error.
  return new InstagramProviderError(
    "PUBLISHING_UNKNOWN_STATE" satisfies InstagramErrorCode,
    message,
    false,
    code !== undefined ? String(code) : undefined,
    type,
    body,
  );
}

export function normalizeTransportError(error: unknown): InstagramProviderError {
  return new InstagramProviderError(
    "INSTAGRAM_TEMPORARY_ERROR",
    "Could not reach Instagram. This will be retried automatically.",
    true,
    undefined,
    "transport_error",
    error instanceof Error ? { message: error.message } : error,
  );
}
