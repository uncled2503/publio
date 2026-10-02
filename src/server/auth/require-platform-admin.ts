import { notFound } from "next/navigation";

import { env } from "@/server/config/env";
import { requireUser } from "@/server/auth/workspace-context";

/**
 * Gate for the internal /admin area. Separate from workspace RBAC —
 * WorkspaceRole (OWNER/ADMIN/MEMBER) is scoped per workspace, there is no
 * platform-wide role table, so this checks the signed-in user's email
 * against a static allowlist (ADMIN_USER_EMAILS) instead. 404s rather than
 * 403s for the same reason requireWorkspaceMember does: don't confirm the
 * route's existence to a signed-in user who isn't on the list.
 */
export async function requirePlatformAdmin() {
  const user = await requireUser();

  const email = user.email?.toLowerCase();
  if (!email || !env.ADMIN_USER_EMAILS.includes(email)) {
    notFound();
  }

  return user;
}
