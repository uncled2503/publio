import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies and decodes a Meta `signed_request` payload — the format Meta
 * POSTs to the Deauthorize and Data Deletion Request callback URLs
 * configured in Instagram Business Login settings. Format:
 * `<base64url HMAC-SHA256 signature>.<base64url JSON payload>`, signed
 * with the app's client secret. See
 * developers.facebook.com/docs/facebook-login/guides/deauthorization/
 * (the Instagram Login callbacks reuse the same envelope).
 *
 * Returns null on any verification failure — callers must treat that as
 * "reject the request", never fall back to trusting the unverified payload.
 */
export function verifySignedRequest(
  signedRequest: string,
  appSecret: string,
): { user_id: string; algorithm: string; issued_at: number } | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;
  const [encodedSig, encodedPayload] = parts as [string, string];

  let expectedSig: Buffer;
  try {
    expectedSig = createHmac("sha256", appSecret).update(encodedPayload).digest();
  } catch {
    return null;
  }

  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(encodedSig, "base64url");
  } catch {
    return null;
  }

  if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      user_id?: string;
      algorithm?: string;
      issued_at?: number;
    };
    if (payload.algorithm !== "HMAC-SHA256" || !payload.user_id) return null;
    return { user_id: payload.user_id, algorithm: payload.algorithm, issued_at: payload.issued_at ?? 0 };
  } catch {
    return null;
  }
}
