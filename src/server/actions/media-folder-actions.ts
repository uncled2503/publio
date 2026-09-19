"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { MediaFolderService } from "@/server/services/media-folder-service";

export async function createFolderAction(workspaceSlug: string, name: string, parentId: string | null) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  const folder = await MediaFolderService.create({
    workspaceId: workspace.id,
    actorUserId: user.id,
    name,
    parentId,
  });

  revalidatePath(`/app/${workspaceSlug}/media`);
  return folder;
}

export async function renameFolderAction(workspaceSlug: string, folderId: string, name: string) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await MediaFolderService.rename({ workspaceId: workspace.id, actorUserId: user.id, folderId, name });

  revalidatePath(`/app/${workspaceSlug}/media`);
}

export async function deleteFolderAction(workspaceSlug: string, folderId: string) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await MediaFolderService.delete({ workspaceId: workspace.id, actorUserId: user.id, folderId });

  revalidatePath(`/app/${workspaceSlug}/media`);
}

export async function moveMediaToFolderAction(
  workspaceSlug: string,
  mediaAssetIds: string[],
  folderId: string | null,
) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await MediaFolderService.moveMedia({ workspaceId: workspace.id, actorUserId: user.id, mediaAssetIds, folderId });

  revalidatePath(`/app/${workspaceSlug}/media`);
}

export async function reorderFolderMediaAction(
  workspaceSlug: string,
  folderId: string | null,
  orderedMediaAssetIds: string[],
) {
  const { workspace } = await requireWorkspaceMember(workspaceSlug);

  await MediaFolderService.reorderMedia({ workspaceId: workspace.id, folderId, orderedMediaAssetIds });

  revalidatePath(`/app/${workspaceSlug}/media`);
}
