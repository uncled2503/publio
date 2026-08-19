/**
 * Types for the Instagram integration layer. Nothing outside
 * src/server/instagram/** should construct a Meta Graph API URL, parse a
 * Meta error payload, or know an endpoint path — everything goes through
 * the `InstagramProvider` interface defined here (§7 of the spec).
 *
 * Contract verified against Meta's official docs — see
 * docs/adr/ADR-005-instagram-oauth-flow.md for the source endpoints.
 */

export interface OAuthTokenSet {
  accessToken: string;
  /** null for short-lived tokens, which the caller never persists. */
  expiresAt: Date | null;
}

export interface InstagramProfile {
  instagramUserId: string;
  username: string;
  name: string | null;
  accountType: "BUSINESS" | "CREATOR" | null;
  profilePictureUrl: string | null;
}

/** Meta's container processing states (GET /{container-id}?fields=status_code). */
export type ContainerStatus = "IN_PROGRESS" | "FINISHED" | "PUBLISHED" | "ERROR" | "EXPIRED";

export interface CreateImageContainerParams {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption?: string;
}

export interface CreateCarouselItemParams {
  igUserId: string;
  accessToken: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface CreateCarouselContainerParams {
  igUserId: string;
  accessToken: string;
  childrenContainerIds: string[];
  caption?: string;
}

export interface CreateReelContainerParams {
  igUserId: string;
  accessToken: string;
  videoUrl: string;
  caption?: string;
}

export interface PublishingLimitStatus {
  quotaUsage: number;
  quotaTotal: number;
  quotaDurationSeconds: number;
}

/**
 * Internal, UI-safe error taxonomy (§44). Every failure the provider can
 * produce is normalized into one of these before it leaves this module —
 * callers (worker, services, UI) never see a raw Meta error shape.
 */
export type InstagramErrorCode =
  | "INSTAGRAM_REAUTH_REQUIRED"
  | "INSTAGRAM_PERMISSION_MISSING"
  | "INSTAGRAM_MEDIA_INVALID"
  | "INSTAGRAM_RATE_LIMITED"
  | "INSTAGRAM_TEMPORARY_ERROR"
  | "PUBLISHING_UNKNOWN_STATE";

export class InstagramProviderError extends Error {
  constructor(
    public readonly code: InstagramErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly providerErrorCode?: string,
    public readonly providerErrorType?: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "InstagramProviderError";
  }
}

export interface InstagramProvider {
  generateAuthorizationUrl(state: string, redirectUri: string): string;
  exchangeAuthorizationCode(
    code: string,
    redirectUri: string,
  ): Promise<{ shortLivedToken: string; instagramUserId: string }>;
  exchangeForLongLivedToken(shortLivedToken: string): Promise<OAuthTokenSet>;
  refreshOrRenewToken(currentLongLivedToken: string): Promise<OAuthTokenSet>;
  validateToken(accessToken: string): Promise<boolean>;
  getAccountProfile(accessToken: string): Promise<InstagramProfile>;
  checkPermissions(accessToken: string, requested: readonly string[]): Promise<string[]>;

  createMediaContainer(params: CreateImageContainerParams): Promise<string>;
  createCarouselItemContainer(params: CreateCarouselItemParams): Promise<string>;
  createCarouselContainer(params: CreateCarouselContainerParams): Promise<string>;
  createReelContainer(params: CreateReelContainerParams): Promise<string>;
  checkContainerStatus(
    containerId: string,
    accessToken: string,
  ): Promise<ContainerStatus>;
  publishContainer(
    igUserId: string,
    containerId: string,
    accessToken: string,
  ): Promise<{ externalPostId: string }>;
  getPermalink(mediaId: string, accessToken: string): Promise<string | null>;
  getPublishingLimit(
    igUserId: string,
    accessToken: string,
  ): Promise<PublishingLimitStatus | null>;
}
