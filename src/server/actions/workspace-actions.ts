"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { WorkspaceRole } from "@prisma/client";

import { requireUser, requireWorkspaceMember } from "@/server/auth/workspace-context";
import { WorkspaceService } from "@/server/services/workspace-service";
import type { FormActionState } from "@/server/actions/auth-actions";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Give your workspace a name.").max(80),
});

export async function createWorkspaceAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireUser();

  const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const workspace = await WorkspaceService.createWorkspace(user.id, parsed.data.name);
  redirect(`/app/${workspace.slug}`);
}

const inviteMemberSchema = z.object({
  email: z.string().email("Enter a valid email."),
  role: z.enum(["MEMBER", "ADMIN", "OWNER"]),
});

export async function inviteMemberAction(
  workspaceSlug: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const { user, workspace, role } = await requireWorkspaceMember(workspaceSlug);

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await WorkspaceService.addMemberByEmail(
      workspace.id,
      role,
      user.id,
      parsed.data.email,
      parsed.data.role,
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add member." };
  }

  revalidatePath(`/app/${workspaceSlug}/team`);
  return { error: null };
}

export async function removeMemberAction(workspaceSlug: string, memberId: string) {
  const { user, workspace, role } = await requireWorkspaceMember(workspaceSlug);

  await WorkspaceService.removeMember(workspace.id, role, user.id, memberId);

  revalidatePath(`/app/${workspaceSlug}/team`);
}

export async function updateMemberRoleAction(
  workspaceSlug: string,
  memberId: string,
  newRole: WorkspaceRole,
) {
  const { user, workspace, role } = await requireWorkspaceMember(workspaceSlug);

  await WorkspaceService.updateMemberRole(workspace.id, role, user.id, memberId, newRole);

  revalidatePath(`/app/${workspaceSlug}/team`);
}

const updateWorkspaceSchema = z.object({
  name: z.string().min(2, "Give your workspace a name.").max(80),
  timezone: z.string().min(1, "Choose a timezone."),
});

export async function updateWorkspaceSettingsAction(
  workspaceSlug: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const { user, workspace, role } = await requireWorkspaceMember(workspaceSlug);

  const parsed = updateWorkspaceSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await WorkspaceService.updateWorkspace(workspace.id, role, user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update workspace." };
  }

  revalidatePath(`/app/${workspaceSlug}/settings`);
  return { error: null };
}

export async function deleteWorkspaceAction(workspaceSlug: string, confirmationText: string) {
  const { workspace, role } = await requireWorkspaceMember(workspaceSlug);

  await WorkspaceService.deleteWorkspace(workspace.id, role, confirmationText);

  redirect("/app");
}
