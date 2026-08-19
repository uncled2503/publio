import { env } from "@/server/config/env";
import {
  type ContainerStatus,
  type CreateCarouselContainerParams,
  type CreateCarouselItemParams,
  type CreateImageContainerParams,
  type CreateReelContainerParams,
  type InstagramProfile,
  type InstagramProvider,
  type OAuthTokenSet,
  type PublishingLimitStatus,
  InstagramProviderError,
} from "./types";

/**
 * SOCIAL_PROVIDER_MODE=mock implementation (§79). No network calls are
 * made — OAuth, container creation and publishing are all simulated so
 * the full product flow (connect → compose → schedule → publish →
 * history) can be exercised locally and in CI without live Meta
 * credentials. This must never run when NODE_ENV=production
 * (enforced by assertProductionSafety() at server startup).
 *
 * Mock tokens are self-describing (base64 JSON) rather than backed by any
 * store, so the provider has no state of its own and works the same in
 * the Next.js process and the worker process.
 *
 * Test hooks: a caption containing "FORCE_TEMP_ERROR" or
 * "FORCE_PERMANENT_ERROR" makes container creation fail with a retryable
 * or permanent error, respectively — useful for exercising the retry and
 * failure UI without a live account. See docs/instagram-publishing.md.
 */

interface MockTokenPayload {
  igUserId: string;
  username: string;
  accountType: "BUSINESS" | "CREATOR";
  issuedAt: number;
}

function encodeToken(payload: MockTokenPayload): string {
  return `mock.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

function decodeToken(token: string): MockTokenPayload | null {
  if (!token.startsWith("mock.")) return null;
  try {
    return JSON.parse(Buffer.from(token.slice(5), "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function checkForceErrorHooks(...texts: Array<string | undefined>): void {
  const combined = texts.filter(Boolean).join(" ");
  if (combined.includes("FORCE_TEMP_ERROR")) {
    throw new InstagramProviderError(
      "INSTAGRAM_TEMPORARY_ERROR",
      "[mock] Simulated temporary Instagram error.",
      true,
    );
  }
  if (combined.includes("FORCE_PERMANENT_ERROR")) {
    throw new InstagramProviderError(
      "INSTAGRAM_MEDIA_INVALID",
      "[mock] Simulated permanent media error.",
      false,
    );
  }
}

export class MockInstagramProvider implements InstagramProvider {
  generateAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({ state, redirect_uri: redirectUri });
    return `${env.APP_URL}/api/integrations/instagram/mock-consent?${params.toString()}`;
  }

  async exchangeAuthorizationCode(
    code: string,
    _redirectUri: string,
  ): Promise<{ shortLivedToken: string; instagramUserId: string }> {
    // The mock consent route encodes the chosen demo identity into `code`.
    const decoded = decodeToken(code);
    const igUserId = decoded?.igUserId ?? randomId("mockuser");
    return { shortLivedToken: encodeToken({ ...defaultProfile(igUserId), issuedAt: Date.now() }), instagramUserId: igUserId };
  }

  async exchangeForLongLivedToken(shortLivedToken: string): Promise<OAuthTokenSet> {
    return { accessToken: shortLivedToken, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) };
  }

  async refreshOrRenewToken(currentLongLivedToken: string): Promise<OAuthTokenSet> {
    const decoded = decodeToken(currentLongLivedToken);
    if (!decoded) {
      throw new InstagramProviderError("INSTAGRAM_REAUTH_REQUIRED", "[mock] Invalid token.", false);
    }
    return {
      accessToken: encodeToken({ ...decoded, issuedAt: Date.now() }),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    return decodeToken(accessToken) !== null;
  }

  async getAccountProfile(accessToken: string): Promise<InstagramProfile> {
    const decoded = decodeToken(accessToken);
    if (!decoded) {
      throw new InstagramProviderError(
        "INSTAGRAM_REAUTH_REQUIRED",
        "[mock] Token could not be decoded.",
        false,
      );
    }
    return {
      instagramUserId: decoded.igUserId,
      username: decoded.username,
      name: decoded.username,
      accountType: decoded.accountType,
      profilePictureUrl: null,
    };
  }

  async checkPermissions(accessToken: string, requested: readonly string[]): Promise<string[]> {
    return (await this.validateToken(accessToken)) ? [...requested] : [];
  }

  async createMediaContainer(params: CreateImageContainerParams): Promise<string> {
    checkForceErrorHooks(params.caption, params.imageUrl);
    return `${randomId("mock_container")}_${Date.now()}`;
  }

  async createCarouselItemContainer(params: CreateCarouselItemParams): Promise<string> {
    checkForceErrorHooks(params.imageUrl, params.videoUrl);
    return `${randomId("mock_container_item")}_${Date.now()}`;
  }

  async createCarouselContainer(params: CreateCarouselContainerParams): Promise<string> {
    checkForceErrorHooks(params.caption);
    return `${randomId("mock_carousel")}_${Date.now()}`;
  }

  async createReelContainer(params: CreateReelContainerParams): Promise<string> {
    checkForceErrorHooks(params.caption, params.videoUrl);
    return `${randomId("mock_reel")}_${Date.now()}`;
  }

  async checkContainerStatus(containerId: string, _accessToken: string): Promise<ContainerStatus> {
    const createdAtMatch = containerId.match(/_(\d+)$/);
    const createdAt = createdAtMatch ? Number(createdAtMatch[1]) : Date.now();
    // Simulate ~2s of "processing" so polling logic has something real to do.
    return Date.now() - createdAt > 2000 ? "FINISHED" : "IN_PROGRESS";
  }

  async publishContainer(
    _igUserId: string,
    _containerId: string,
    _accessToken: string,
  ): Promise<{ externalPostId: string }> {
    return { externalPostId: randomId("mock_media") };
  }

  async getPermalink(mediaId: string, _accessToken: string): Promise<string | null> {
    return `https://www.instagram.com/p/${mediaId}/`;
  }

  async getPublishingLimit(
    _igUserId: string,
    _accessToken: string,
  ): Promise<PublishingLimitStatus | null> {
    return { quotaUsage: 3, quotaTotal: 100, quotaDurationSeconds: 24 * 60 * 60 };
  }
}

function defaultProfile(igUserId: string): Omit<MockTokenPayload, "issuedAt"> {
  return { igUserId, username: `demo_${igUserId.slice(0, 8)}`, accountType: "BUSINESS" };
}

export { encodeToken as encodeMockToken, decodeToken as decodeMockToken };
