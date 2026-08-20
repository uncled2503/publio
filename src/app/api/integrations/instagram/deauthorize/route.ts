import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/server/config/env";
import { verifySignedRequest } from "@/server/instagram/signed-request";
import { SocialAccountService } from "@/server/services/social-account-service";
import { logger } from "@/server/observability/logger";

/**
 * Meta calls this when a user removes Publio's access from their
 * Instagram/Facebook app settings — configured as the "Deauthorize
 * callback URL" in Instagram Business Login settings. Must accept
 * `signed_request` as application/x-www-form-urlencoded and respond 200,
 * or Meta will retry.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const signedRequest = form.get("signed_request");

  if (typeof signedRequest !== "string") {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const payload = verifySignedRequest(signedRequest, env.INSTAGRAM_CLIENT_SECRET);
  if (!payload) {
    logger.warn("instagram.deauthorize.invalid_signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const disconnectedCount = await SocialAccountService.disconnectByInstagramUserId(
    payload.user_id,
    "meta_deauthorize_callback",
  );

  logger.info("instagram.deauthorize.processed", {
    instagramUserId: payload.user_id,
    disconnectedCount,
  });

  return NextResponse.json({ status: "ok" });
}
