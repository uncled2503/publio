"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostType } from "@prisma/client";
import { DateTime } from "luxon";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { PostService } from "@/server/services/post-service";

/** `localDateTime` is "YYYY-MM-DDTHH:mm" from a <input type="datetime-local">, interpreted in `timezone`. */
function resolveScheduledAt(localDateTime: string, timezone: string): Date {
  const dt = DateTime.fromISO(localDateTime, { zone: timezone });
  if (!dt.isValid) {
    throw new Error(`Data/hora inválida: ${dt.invalidReason} ${dt.invalidExplanation ?? ""}`);
  }
  return dt.toJSDate();
}

export async function createPostAction(workspaceSlug: string, postType: PostType) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  const post = await PostService.createDraft({
    workspaceId: workspace.id,
    createdById: user.id,
    postType,
  });

  redirect(`/app/${workspaceSlug}/posts/${post.id}`);
}

export async function updatePostAction(
  workspaceSlug: string,
  postId: string,
  data: {
    caption: string;
    postType: PostType;
    mediaAssetIds: string[];
    socialAccountIds: string[];
  },
) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await PostService.updateDraft({
    workspaceId: workspace.id,
    actorUserId: user.id,
    postId,
    ...data,
  });

  revalidatePath(`/app/${workspaceSlug}/posts/${postId}`);
  revalidatePath(`/app/${workspaceSlug}/posts`);
}

export async function deletePostAction(workspaceSlug: string, postId: string) {
  const { workspace } = await requireWorkspaceMember(workspaceSlug);

  await PostService.deleteDraft(workspace.id, postId);

  revalidatePath(`/app/${workspaceSlug}/posts`);
  redirect(`/app/${workspaceSlug}/posts`);
}

export async function schedulePostAction(
  workspaceSlug: string,
  postId: string,
  localDateTime: string,
  timezone: string,
) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await PostService.schedulePost({
    workspaceId: workspace.id,
    actorUserId: user.id,
    postId,
    scheduledAt: resolveScheduledAt(localDateTime, timezone),
    timezone,
  });

  revalidatePath(`/app/${workspaceSlug}/posts/${postId}`);
  revalidatePath(`/app/${workspaceSlug}/posts`);
  revalidatePath(`/app/${workspaceSlug}/calendar`);
}

export async function reschedulePostAction(
  workspaceSlug: string,
  postId: string,
  localDateTime: string,
  timezone: string,
) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await PostService.reschedulePost({
    workspaceId: workspace.id,
    actorUserId: user.id,
    postId,
    scheduledAt: resolveScheduledAt(localDateTime, timezone),
    timezone,
  });

  revalidatePath(`/app/${workspaceSlug}/posts/${postId}`);
  revalidatePath(`/app/${workspaceSlug}/posts`);
  revalidatePath(`/app/${workspaceSlug}/calendar`);
}

export async function publishPostNowAction(workspaceSlug: string, postId: string) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await PostService.publishNow({ workspaceId: workspace.id, actorUserId: user.id, postId });

  revalidatePath(`/app/${workspaceSlug}/posts/${postId}`);
  revalidatePath(`/app/${workspaceSlug}/posts`);
  revalidatePath(`/app/${workspaceSlug}/calendar`);
}

export async function cancelPostAction(workspaceSlug: string, postId: string) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await PostService.cancelPost({ workspaceId: workspace.id, actorUserId: user.id, postId });

  revalidatePath(`/app/${workspaceSlug}/posts/${postId}`);
  revalidatePath(`/app/${workspaceSlug}/posts`);
  revalidatePath(`/app/${workspaceSlug}/calendar`);
}
