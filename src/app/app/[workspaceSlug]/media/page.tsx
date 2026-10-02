import type { Metadata } from "next";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { MediaFolderService } from "@/server/services/media-folder-service";
import { SocialAccountService } from "@/server/services/social-account-service";
import { getStorageProvider } from "@/server/storage";
import { MediaUploader } from "@/components/media/media-uploader";
import { MediaGrid, type MediaAssetView } from "@/components/media/media-grid";
import { FolderBar } from "@/components/media/folder-bar";
import { BulkScheduleDialog } from "@/components/media/bulk-schedule-dialog";
import { CancelFolderPostsButton } from "@/components/media/cancel-folder-posts-button";
import { BulkScheduleService } from "@/server/services/bulk-schedule-service";

export const metadata: Metadata = { title: "Mídia — Publio" };

interface ValidationShape {
  errors?: Array<{ message?: string }>;
}

interface MediaMetadataShape {
  thumbnailKey?: string;
}

export default async function MediaLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { folder: folderId } = await searchParams;
  const { workspace } = await requireWorkspaceMember(workspaceSlug);

  const currentFolderId = folderId ?? null;

  const [assets, breadcrumb, childFolders, allFolders, socialAccounts, cancelablePostCount] = await Promise.all([
    MediaFolderService.listMedia(workspace.id, currentFolderId),
    MediaFolderService.getBreadcrumb(workspace.id, currentFolderId),
    MediaFolderService.listChildren(workspace.id, currentFolderId),
    MediaFolderService.listAllFlat(workspace.id),
    SocialAccountService.listForWorkspace(workspace.id),
    currentFolderId ? BulkScheduleService.countCancelableFolderPosts(workspace.id, currentFolderId) : 0,
  ]);

  const storage = getStorageProvider();

  const views: MediaAssetView[] = assets.map((asset) => {
    const validation = asset.validation as ValidationShape | null;
    const metadata = asset.metadata as MediaMetadataShape | null;
    return {
      id: asset.id,
      originalFilename: asset.originalFilename,
      mimeType: asset.mimeType,
      sizeBytes: Number(asset.sizeBytes),
      width: asset.width,
      height: asset.height,
      durationSeconds: asset.durationSeconds,
      processingStatus: asset.processingStatus,
      validationErrors: (validation?.errors ?? []).map((e) => e.message ?? "").filter(Boolean),
      publicUrl: storage.getPublicUrl(asset.storageKey),
      thumbnailUrl: metadata?.thumbnailKey ? storage.getPublicUrl(metadata.thumbnailKey) : null,
      scheduledDeletionAt: asset.scheduledDeletionAt ? asset.scheduledDeletionAt.toISOString() : null,
      deletionExempt: asset.deletionExempt,
    };
  });

  const scheduleableVideos = assets
    .filter((a) => a.processingStatus === "READY" && a.mimeType.startsWith("video/"))
    .map((a) => {
      const metadata = a.metadata as MediaMetadataShape | null;
      return {
        id: a.id,
        originalFilename: a.originalFilename,
        publicUrl: storage.getPublicUrl(a.storageKey),
        thumbnailUrl: metadata?.thumbnailKey ? storage.getPublicUrl(metadata.thumbnailKey) : null,
      };
    });

  const connectedAccounts = socialAccounts
    .filter((a) => a.tokenStatus === "CONNECTED" || a.tokenStatus === "EXPIRING")
    .map((a) => ({ id: a.id, username: a.username, profilePictureUrl: a.profilePictureUrl }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mídia</h1>
          <p className="text-sm text-muted-foreground">
            Imagens JPEG e vídeos MP4/MOV disponíveis para suas publicações. Organize em pastas e agende uma pasta
            inteira de uma vez.
          </p>
        </div>
        {currentFolderId ? (
          <div className="flex items-center gap-2">
            <CancelFolderPostsButton
              workspaceSlug={workspaceSlug}
              folderId={currentFolderId}
              count={cancelablePostCount}
            />
            <BulkScheduleDialog
              workspaceSlug={workspaceSlug}
              folderId={currentFolderId}
              videos={scheduleableVideos}
              accounts={connectedAccounts}
              workspaceTimezone={workspace.timezone}
            />
          </div>
        ) : null}
      </div>

      <FolderBar
        workspaceSlug={workspaceSlug}
        breadcrumb={breadcrumb}
        currentFolderId={currentFolderId}
        childFolders={childFolders}
      />

      <MediaUploader workspaceSlug={workspace.slug} folderId={currentFolderId} />
      <MediaGrid
        workspaceSlug={workspace.slug}
        assets={views}
        canDelete
        currentFolderId={currentFolderId}
        folders={allFolders}
      />
    </div>
  );
}
