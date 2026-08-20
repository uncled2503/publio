import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/server/config/env";
import { verifySignedRequest } from "@/server/instagram/signed-request";
import { SocialAccountService } from "@/server/services/social-account-service";
import { logger } from "@/server/observability/logger";

/**
 * Meta's Data Deletion Request callback — configured in Instagram Business
 * Login settings. Contract (developers.facebook.com/docs/development/
 * create-an-app/app-dashboard/data-deletion-callback): accept
 * `signed_request` as application/x-www-form-urlencoded, and respond
 * `{ url, confirmation_code }` where `url` is a page the person can check
 * for status.
 *
 * Scope of what gets deleted: the Instagram-derived data Publio holds for
 * that account — the encrypted access token and the connection itself.
 * Historical posts/media aren't Meta-sourced data and are handled by
 * Publio's own retention rules, not this callback.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const signedRequest = form.get("signed_request");

  if (typeof signedRequest !== "string") {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const payload = verifySignedRequest(signedRequest, env.INSTAGRAM_CLIENT_SECRET);
  if (!payload) {
    logger.warn("instagram.data_deletion.invalid_signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const confirmationCode = randomUUID();
  // Logs its own per-account "instagram.deauthorized_by_meta" audit entry
  // (real workspaceId per account) — no separate audit call needed here.
  const disconnectedCount = await SocialAccountService.disconnectByInstagramUserId(
    payload.user_id,
    "meta_data_deletion_callback",
  );

  logger.info("instagram.data_deletion.processed", {
    instagramUserId: payload.user_id,
    disconnectedCount,
    confirmationCode,
  });

  return NextResponse.json({
    url: `${env.APP_URL}/legal/data-deletion?id=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
