import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { env } from "@/server/config/env";
import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { getInstagramProvider, InstagramProviderError } from "@/server/instagram";
import { SocialAccountService } from "@/server/services/social-account-service";
import { logger } from "@/server/observability/logger";
import { OAUTH_STATE_COOKIE } from "@/app/api/integrations/instagram/connect/route";

function redirectUri(): string {
  return env.INSTAGRAM_REDIRECT_URI || `${env.APP_URL}/api/integrations/instagram/callback`;
}

function accountsUrl(workspaceSlug: string, params: Record<string, string>) {
  const url = new URL(`/app/${workspaceSlug}/accounts`, env.APP_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const rawState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!rawState) {
    // No workspace context to redirect back to — send to the generic app entry.
    return NextResponse.redirect(new URL("/app?error=oauth_session_expired", env.APP_URL));
  }

  const { nonce, workspaceSlug } = JSON.parse(rawState) as { nonce: string; workspaceSlug: string };

  // Re-verifies membership from the authenticated session — the
  // workspaceSlug from the cookie is only a hint about where to redirect,
  // never trusted as authorization by itself (§27).
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(accountsUrl(workspaceSlug, { error: "oauth_denied" }));
  }
  if (!code || !state || state !== nonce) {
    return NextResponse.redirect(accountsUrl(workspaceSlug, { error: "oauth_state_mismatch" }));
  }

  try {
    const provider = getInstagramProvider();
    const { shortLivedToken } = await provider.exchangeAuthorizationCode(code, redirectUri());
    const longLived = await provider.exchangeForLongLivedToken(shortLivedToken);
    const profile = await provider.getAccountProfile(longLived.accessToken);

    if (profile.accountType !== "BUSINESS" && profile.accountType !== "CREATOR") {
      logger.warn("instagram.oauth.unsupported_account_type", {
        workspaceId: workspace.id,
        accountType: profile.accountType,
      });
      return NextResponse.redirect(accountsUrl(workspaceSlug, { error: "unsupported_account_type" }));
    }

    await SocialAccountService.connect({
      workspaceId: workspace.id,
      actorUserId: user.id,
      profile,
      tokenSet: longLived,
    });

    logger.info("instagram.connected", { workspaceId: workspace.id, instagramUserId: profile.instagramUserId });
    return NextResponse.redirect(accountsUrl(workspaceSlug, { connected: "1" }));
  } catch (error) {
    const providerError = error instanceof InstagramProviderError ? error : null;
    logger.error("instagram.oauth.callback_failed", {
      workspaceId: workspace.id,
      code: providerError?.code,
      message: error instanceof Error ? error.message : String(error),
      providerErrorCode: providerError?.providerErrorCode,
      providerErrorType: providerError?.providerErrorType,
      raw: providerError?.raw,
    });
    return NextResponse.redirect(accountsUrl(workspaceSlug, { error: "connection_failed" }));
  }
}
