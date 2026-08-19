"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { SocialAccountService } from "@/server/services/social-account-service";

/** Disconnecting is more disruptive than connecting, so it requires ADMIN+ (§8). */
export async function disconnectInstagramAction(workspaceSlug: string, socialAccountId: string) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug, "ADMIN");

  await SocialAccountService.disconnect(workspace.id, user.id, socialAccountId);

  revalidatePath(`/app/${workspaceSlug}/accounts`);
}
