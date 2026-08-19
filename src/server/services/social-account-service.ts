import { prisma } from "@/server/db/prisma";
import { tokenVault } from "@/server/security/token-vault";
import { AuditService } from "@/server/services/audit-service";
import {
  getInstagramProvider,
  REQUIRED_INSTAGRAM_SCOPES,
  type InstagramProfile,
  type OAuthTokenSet,
} from "@/server/instagram";

export const SocialAccountService = {
  async listForWorkspace(workspaceId: string) {
    return prisma.socialAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        profilePictureUrl: true,
        accountType: true,
        tokenStatus: true,
        tokenExpiresAt: true,
        connectedAt: true,
        disconnectedAt: true,
        lastValidatedAt: true,
        instagramUserId: true,
      },
    });
  },

  async getForWorkspace(workspaceId: string, socialAccountId: string) {
    return prisma.socialAccount.findFirst({
      where: { id: socialAccountId, workspaceId },
    });
  },

  /**
   * Called by the OAuth callback route after a successful token exchange.
   * Upserts on (workspaceId, platform, instagramUserId) so reconnecting an
   * already-known account updates it in place instead of creating a
   * duplicate row.
   */
  async connect(params: {
    workspaceId: string;
    actorUserId: string;
    profile: InstagramProfile;
    tokenSet: OAuthTokenSet;
  }) {
    const encryptedToken = tokenVault.encrypt(params.tokenSet.accessToken);

    const account = await prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_instagramUserId: {
          workspaceId: params.workspaceId,
          platform: "INSTAGRAM",
          instagramUserId: params.profile.instagramUserId,
        },
      },
      update: {
        username: params.profile.username,
        displayName: params.profile.name,
        profilePictureUrl: params.profile.profilePictureUrl,
        accountType: params.profile.accountType,
        accessTokenEncrypted: encryptedToken,
        tokenExpiresAt: params.tokenSet.expiresAt,
        tokenStatus: "CONNECTED",
        permissions: [...REQUIRED_INSTAGRAM_SCOPES],
        disconnectedAt: null,
        lastValidatedAt: new Date(),
      },
      create: {
        workspaceId: params.workspaceId,
        platform: "INSTAGRAM",
        instagramUserId: params.profile.instagramUserId,
        username: params.profile.username,
        displayName: params.profile.name,
        profilePictureUrl: params.profile.profilePictureUrl,
        accountType: params.profile.accountType,
        accessTokenEncrypted: encryptedToken,
        tokenExpiresAt: params.tokenSet.expiresAt,
        tokenStatus: "CONNECTED",
        permissions: [...REQUIRED_INSTAGRAM_SCOPES],
        lastValidatedAt: new Date(),
      },
    });

    await AuditService.log({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: "instagram.connected",
      resourceType: "social_account",
      resourceId: account.id,
      metadata: { username: params.profile.username, instagramUserId: params.profile.instagramUserId },
    });

    return account;
  },

  async disconnect(workspaceId: string, actorUserId: string, socialAccountId: string) {
    const account = await prisma.socialAccount.findFirst({
      where: { id: socialAccountId, workspaceId },
    });
    if (!account) throw new Error("Social account not found in this workspace.");

    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        tokenStatus: "DISCONNECTED",
        disconnectedAt: new Date(),
        // Overwrite rather than leave a live token sitting at rest once the
        // user has explicitly disconnected the account.
        accessTokenEncrypted: tokenVault.encrypt(""),
      },
    });

    await AuditService.log({
      workspaceId,
      actorUserId,
      action: "instagram.disconnected",
      resourceType: "social_account",
      resourceId: account.id,
      metadata: { username: account.username },
    });
  },

  /** Only for server-side use (worker, validation jobs) — never returned from an API/action. */
  async getDecryptedAccessToken(socialAccountId: string): Promise<string> {
    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: socialAccountId },
      select: { accessTokenEncrypted: true },
    });
    return tokenVault.decrypt(account.accessTokenEncrypted);
  },

  /** Re-checks a token against Meta and updates tokenStatus/lastValidatedAt accordingly. */
  async validateAndSync(socialAccountId: string) {
    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: socialAccountId },
    });
    if (account.tokenStatus === "DISCONNECTED") return account;

    const provider = getInstagramProvider();
    const accessToken = tokenVault.decrypt(account.accessTokenEncrypted);
    const valid = await provider.validateToken(accessToken);

    const updated = await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        tokenStatus: valid ? "CONNECTED" : "REAUTH_REQUIRED",
        lastValidatedAt: new Date(),
      },
    });

    if (!valid && account.tokenStatus === "CONNECTED") {
      await AuditService.log({
        workspaceId: account.workspaceId,
        action: "instagram.disconnected",
        resourceType: "social_account",
        resourceId: account.id,
        metadata: { reason: "token_validation_failed" },
      });
    }

    return updated;
  },
};
