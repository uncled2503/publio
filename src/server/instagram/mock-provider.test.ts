import { describe, expect, it, vi } from "vitest";

import { MockInstagramProvider } from "./mock-provider";
import { InstagramProviderError } from "./types";

describe("MockInstagramProvider", () => {
  it("round-trips the OAuth flow to a usable profile", async () => {
    const provider = new MockInstagramProvider();
    const authUrl = provider.generateAuthorizationUrl("nonce123", "https://app.test/callback");
    expect(authUrl).toContain("mock-consent");

    const { shortLivedToken, instagramUserId } = await provider.exchangeAuthorizationCode(
      "fake-code",
      "https://app.test/callback",
    );
    expect(instagramUserId).toBeTruthy();

    const longLived = await provider.exchangeForLongLivedToken(shortLivedToken);
    expect(longLived.expiresAt).toBeInstanceOf(Date);

    const profile = await provider.getAccountProfile(longLived.accessToken);
    expect(profile.instagramUserId).toBe(instagramUserId);
    expect(profile.accountType).toBe("BUSINESS");

    expect(await provider.validateToken(longLived.accessToken)).toBe(true);
    expect(await provider.validateToken("not-a-real-token")).toBe(false);
  });

  it("refreshes a token and keeps the same identity", async () => {
    const provider = new MockInstagramProvider();
    const { shortLivedToken } = await provider.exchangeAuthorizationCode("code", "https://app.test/callback");
    const longLived = await provider.exchangeForLongLivedToken(shortLivedToken);
    const profileBefore = await provider.getAccountProfile(longLived.accessToken);

    const refreshed = await provider.refreshOrRenewToken(longLived.accessToken);
    const profileAfter = await provider.getAccountProfile(refreshed.accessToken);

    expect(profileAfter.instagramUserId).toBe(profileBefore.instagramUserId);
  });

  it("simulates async container processing before FINISHED", async () => {
    vi.useFakeTimers();
    const provider = new MockInstagramProvider();
    const containerId = await provider.createMediaContainer({
      igUserId: "123",
      accessToken: "mock.token",
      imageUrl: "https://cdn.test/a.jpg",
    });

    expect(await provider.checkContainerStatus(containerId, "mock.token")).toBe("IN_PROGRESS");
    vi.advanceTimersByTime(3000);
    expect(await provider.checkContainerStatus(containerId, "mock.token")).toBe("FINISHED");
    vi.useRealTimers();
  });

  it("publishes and returns a permalink", async () => {
    const provider = new MockInstagramProvider();
    const { externalPostId } = await provider.publishContainer("123", "container_1", "mock.token");
    expect(externalPostId).toBeTruthy();
    expect(await provider.getPermalink(externalPostId, "mock.token")).toContain(externalPostId);
  });

  it("honors the FORCE_TEMP_ERROR test hook as retryable", async () => {
    const provider = new MockInstagramProvider();
    await expect(
      provider.createMediaContainer({
        igUserId: "123",
        accessToken: "mock.token",
        imageUrl: "https://cdn.test/a.jpg",
        caption: "hello FORCE_TEMP_ERROR",
      }),
    ).rejects.toMatchObject({ code: "INSTAGRAM_TEMPORARY_ERROR", retryable: true } satisfies Partial<InstagramProviderError>);
  });

  it("honors the FORCE_PERMANENT_ERROR test hook as non-retryable", async () => {
    const provider = new MockInstagramProvider();
    await expect(
      provider.createReelContainer({
        igUserId: "123",
        accessToken: "mock.token",
        videoUrl: "https://cdn.test/a.mp4",
        caption: "hello FORCE_PERMANENT_ERROR",
      }),
    ).rejects.toMatchObject({ code: "INSTAGRAM_MEDIA_INVALID", retryable: false } satisfies Partial<InstagramProviderError>);
  });
});
