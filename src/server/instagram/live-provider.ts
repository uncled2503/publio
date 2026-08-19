import { env } from "@/server/config/env";
import { logger } from "@/server/observability/logger";
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
import { AUTHORIZE_HOST, OAUTH_HOST, GRAPH_HOST, graphClient, graphUrl } from "./graph-client";

/** See docs/adr/ADR-005-instagram-oauth-flow.md for why these two scopes. */
export const REQUIRED_INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
] as const;

function secondsToDate(expiresInSeconds: number): Date {
  return new Date(Date.now() + expiresInSeconds * 1000);
}

/**
 * Real implementation of InstagramProvider, calling the Meta Graph API for
 * Instagram (Business Login for Instagram flow). Used when
 * SOCIAL_PROVIDER_MODE=live. See ADR-005 for the exact endpoint contract
 * this was implemented against.
 */
export class LiveInstagramProvider implements InstagramProvider {
  generateAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: env.INSTAGRAM_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: REQUIRED_INSTAGRAM_SCOPES.join(","),
      state,
    });
    return `${AUTHORIZE_HOST}/oauth/authorize?${params.toString()}`;
  }

  async exchangeAuthorizationCode(
    code: string,
    redirectUri: string,
  ): Promise<{ shortLivedToken: string; instagramUserId: string }> {
    const result = (await graphClient.post(`${OAUTH_HOST}/oauth/access_token`, {
      client_id: env.INSTAGRAM_CLIENT_ID,
      client_secret: env.INSTAGRAM_CLIENT_SECRET,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    })) as { access_token: string; user_id: string | number };

    return {
      shortLivedToken: result.access_token,
      instagramUserId: String(result.user_id),
    };
  }

  async exchangeForLongLivedToken(shortLivedToken: string): Promise<OAuthTokenSet> {
    const result = (await graphClient.get(`${GRAPH_HOST}/access_token`, {
      grant_type: "ig_exchange_token",
      client_secret: env.INSTAGRAM_CLIENT_SECRET,
      access_token: shortLivedToken,
    })) as { access_token: string; expires_in: number };

    return {
      accessToken: result.access_token,
      expiresAt: secondsToDate(result.expires_in),
    };
  }

  async refreshOrRenewToken(currentLongLivedToken: string): Promise<OAuthTokenSet> {
    const result = (await graphClient.get(`${GRAPH_HOST}/refresh_access_token`, {
      grant_type: "ig_refresh_token",
      access_token: currentLongLivedToken,
    })) as { access_token: string; expires_in: number };

    return {
      accessToken: result.access_token,
      expiresAt: secondsToDate(result.expires_in),
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getAccountProfile(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async getAccountProfile(accessToken: string): Promise<InstagramProfile> {
    const result = (await graphClient.get(graphUrl("/me"), {
      fields: "user_id,username,name,account_type,profile_picture_url",
      access_token: accessToken,
    })) as {
      user_id: string;
      username: string;
      name?: string;
      account_type?: string;
      profile_picture_url?: string;
    };

    // Meta's actual values here are BUSINESS, MEDIA_CREATOR, or PERSONAL —
    // NOT "CREATOR" (confirmed against a live account on 2026-08-19; the
    // original ADR-005 research got this one wrong). PERSONAL falls through
    // to null and is rejected by the OAuth callback.
    const accountType =
      result.account_type === "BUSINESS" || result.account_type === "MEDIA_CREATOR"
        ? result.account_type
        : null;

    if (accountType === null) {
      logger.warn("instagram.oauth.unrecognized_account_type", {
        rawAccountType: result.account_type,
        instagramUserId: result.user_id,
      });
    }

    return {
      instagramUserId: result.user_id,
      username: result.username,
      name: result.name ?? null,
      accountType,
      profilePictureUrl: result.profile_picture_url ?? null,
    };
  }

  async checkPermissions(accessToken: string, requested: readonly string[]): Promise<string[]> {
    // The Instagram Login flow does not expose a separate "list granted
    // scopes" endpoint the way Facebook Login's /me/permissions does — a
    // successful profile fetch is the practical signal that the token is
    // valid and the basic scope is active. This is a documented
    // simplification; verify against a live app in docs/meta-live-test.md
    // (REQUIRES_META_CREDENTIALS) before relying on partial-scope detection.
    const valid = await this.validateToken(accessToken);
    return valid ? [...requested] : [];
  }

  async createMediaContainer(params: CreateImageContainerParams): Promise<string> {
    const result = (await graphClient.post(graphUrl(`/${params.igUserId}/media`), {
      image_url: params.imageUrl,
      caption: params.caption,
      access_token: params.accessToken,
    })) as { id: string };
    return result.id;
  }

  async createCarouselItemContainer(params: CreateCarouselItemParams): Promise<string> {
    if (!params.imageUrl && !params.videoUrl) {
      throw new InstagramProviderError(
        "INSTAGRAM_MEDIA_INVALID",
        "Carousel item requires an image or video URL.",
        false,
      );
    }
    const result = (await graphClient.post(graphUrl(`/${params.igUserId}/media`), {
      image_url: params.imageUrl,
      video_url: params.videoUrl,
      is_carousel_item: true,
      access_token: params.accessToken,
    })) as { id: string };
    return result.id;
  }

  async createCarouselContainer(params: CreateCarouselContainerParams): Promise<string> {
    const result = (await graphClient.post(graphUrl(`/${params.igUserId}/media`), {
      media_type: "CAROUSEL",
      children: params.childrenContainerIds.join(","),
      caption: params.caption,
      access_token: params.accessToken,
    })) as { id: string };
    return result.id;
  }

  async createReelContainer(params: CreateReelContainerParams): Promise<string> {
    const result = (await graphClient.post(graphUrl(`/${params.igUserId}/media`), {
      video_url: params.videoUrl,
      media_type: "REELS",
      caption: params.caption,
      access_token: params.accessToken,
    })) as { id: string };
    return result.id;
  }

  async checkContainerStatus(containerId: string, accessToken: string): Promise<ContainerStatus> {
    const result = (await graphClient.get(graphUrl(`/${containerId}`), {
      fields: "status_code",
      access_token: accessToken,
    })) as { status_code: ContainerStatus };
    return result.status_code;
  }

  async publishContainer(
    igUserId: string,
    containerId: string,
    accessToken: string,
  ): Promise<{ externalPostId: string }> {
    const result = (await graphClient.post(graphUrl(`/${igUserId}/media_publish`), {
      creation_id: containerId,
      access_token: accessToken,
    })) as { id: string };
    return { externalPostId: result.id };
  }

  async getPermalink(mediaId: string, accessToken: string): Promise<string | null> {
    try {
      const result = (await graphClient.get(graphUrl(`/${mediaId}`), {
        fields: "permalink",
        access_token: accessToken,
      })) as { permalink?: string };
      return result.permalink ?? null;
    } catch {
      return null;
    }
  }

  async getPublishingLimit(
    igUserId: string,
    accessToken: string,
  ): Promise<PublishingLimitStatus | null> {
    try {
      const result = (await graphClient.get(graphUrl(`/${igUserId}/content_publishing_limit`), {
        fields: "config,quota_usage",
        access_token: accessToken,
      })) as {
        data?: Array<{
          quota_usage: number;
          config: { quota_total: number; quota_duration: number };
        }>;
      };
      const entry = result.data?.[0];
      if (!entry) return null;
      return {
        quotaUsage: entry.quota_usage,
        quotaTotal: entry.config.quota_total,
        quotaDurationSeconds: entry.config.quota_duration,
      };
    } catch {
      // Non-critical — the local InstagramRateLimitService counter is the
      // source of truth for gating; this is only a cross-check for the UI.
      return null;
    }
  }
}
