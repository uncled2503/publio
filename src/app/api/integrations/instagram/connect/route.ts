import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { env } from "@/server/config/env";
import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { getInstagramProvider } from "@/server/instagram";

export const OAUTH_STATE_COOKIE = "ig_oauth_state";

function redirectUri(): string {
  return env.INSTAGRAM_REDIRECT_URI || `${env.APP_URL}/api/integrations/instagram/callback`;
}

/**
 * Starts the Instagram connect flow for a workspace. Any workspace member
 * may initiate a connection (§8) — disconnecting is more sensitive and
 * requires ADMIN (see the disconnect action).
 */
export async function GET(request: NextRequest) {
  const workspaceSlug = request.nextUrl.searchParams.get("workspaceSlug");
  if (!workspaceSlug) {
    return NextResponse.json({ error: "workspaceSlug is required" }, { status: 400 });
  }

  // Verifies the caller is authenticated and a member of this workspace
  // before we ever redirect to Meta — never trust workspaceSlug alone.
  await requireWorkspaceMember(workspaceSlug);

  const nonce = randomBytes(16).toString("hex");
  const provider = getInstagramProvider();
  const authorizationUrl = provider.generateAuthorizationUrl(nonce, redirectUri());

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, JSON.stringify({ nonce, workspaceSlug }), {
    httpOnly: true,
    secure: env.IS_PRODUCTION,
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  return NextResponse.redirect(authorizationUrl);
}
