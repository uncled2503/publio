import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/server/config/env";
import { encodeMockToken } from "@/server/instagram";

/**
 * Stands in for Meta's real consent screen when SOCIAL_PROVIDER_MODE=mock
 * (§79). Lets a developer "approve" a fake Instagram Business account
 * without ever calling Meta, so the full connect → publish flow can be
 * exercised locally. Never reachable in live mode (the mock provider is
 * simply never constructed when SOCIAL_PROVIDER_MODE=live).
 */
export async function GET(request: NextRequest) {
  if (env.SOCIAL_PROVIDER_MODE !== "mock") {
    return NextResponse.json({ error: "Mock consent is only available in mock mode." }, { status: 404 });
  }

  const state = request.nextUrl.searchParams.get("state") ?? "";
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri") ?? "";

  const demoIgUserId = `demo${Math.random().toString().slice(2, 10)}`;
  const code = encodeMockToken({
    igUserId: demoIgUserId,
    username: `empresa_demo_${demoIgUserId.slice(-4)}`,
    accountType: "BUSINESS",
    issuedAt: Date.now(),
  });

  const approveUrl = new URL(redirectUri);
  approveUrl.searchParams.set("code", code);
  approveUrl.searchParams.set("state", state);

  const denyUrl = new URL(redirectUri);
  denyUrl.searchParams.set("error", "access_denied");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Instagram (simulado) — Publio</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fafafa; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: white; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px; max-width: 360px; text-align: center; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    p { color: #666; font-size: 14px; margin-bottom: 24px; }
    a.button { display: block; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
    .approve { background: #111; color: white; }
    .deny { background: #f2f2f2; color: #111; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; padding: 4px 8px; border-radius: 999px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">MODO SIMULADO — nenhuma chamada real à Meta</span>
    <h1>Autorizar Publio</h1>
    <p>Conta de demonstração: <strong>@empresa_demo_${demoIgUserId.slice(-4)}</strong> (Business)</p>
    <a class="button approve" href="${approveUrl.toString()}">Autorizar</a>
    <a class="button deny" href="${denyUrl.toString()}">Cancelar</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
