import { env } from "@/server/config/env";
import { normalizeProviderError, normalizeTransportError } from "./errors";

// The authorize step (browser redirect) and the token-exchange step (server
// POST) live on different hosts — Meta moved /oauth/authorize to
// www.instagram.com while /oauth/access_token stayed on api.instagram.com.
// Verified against the Meta App Dashboard's own generated authorize URL and
// developers.facebook.com/docs/instagram-platform (2026-08-19).
export const AUTHORIZE_HOST = "https://www.instagram.com";
export const OAUTH_HOST = "https://api.instagram.com";
export const GRAPH_HOST = "https://graph.instagram.com";

function apiVersion(): string {
  return env.META_GRAPH_API_VERSION;
}

export function graphUrl(path: string): string {
  return `${GRAPH_HOST}/${apiVersion()}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function request(
  method: "GET" | "POST",
  url: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<unknown> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }

  let response: Response;
  try {
    if (method === "GET") {
      response = await fetch(`${url}?${query.toString()}`, { method: "GET" });
    } else {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: query.toString(),
      });
    }
  } catch (error) {
    throw normalizeTransportError(error);
  }

  const body = await parseJsonSafe(response);
  if (!response.ok) {
    throw normalizeProviderError(response.status, body);
  }
  return body;
}

export const graphClient = {
  get: (url: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    request("GET", url, params),
  post: (url: string, params: Record<string, string | number | boolean | undefined> = {}) =>
    request("POST", url, params),
};
