"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { MediaService } from "@/server/services/media-service";

export async function requestMediaUploadAction(
  workspaceSlug: string,
  filename: string,
  mimeType: string,
) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  return MediaService.createUploadTarget({
    workspaceId: workspace.id,
    uploadedById: user.id,
    originalFilename: filename,
    mimeType,
  });
}

export async function confirmMediaUploadAction(workspaceSlug: string, mediaAssetId: string) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await MediaService.confirmUpload(workspace.id, user.id, mediaAssetId);
  revalidatePath(`/app/${workspaceSlug}/media`);
}

export async function deleteMediaAction(workspaceSlug: string, mediaAssetId: string) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  await MediaService.softDelete(workspace.id, user.id, mediaAssetId);
  revalidatePath(`/app/${workspaceSlug}/media`);
}
