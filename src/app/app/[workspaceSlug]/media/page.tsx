import type { Metadata } from "next";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { MediaService } from "@/server/services/media-service";
import { getStorageProvider } from "@/server/storage";
import { MediaUploader } from "@/components/media/media-uploader";
import { MediaGrid, type MediaAssetView } from "@/components/media/media-grid";

export const metadata: Metadata = { title: "Mídia — Publio" };

interface ValidationShape {
  errors?: Array<{ message?: string }>;
}

interface MediaMetadataShape {
  thumbnailKey?: string;
}

export default async function MediaLibraryPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceMember(workspaceSlug);

  const assets = await MediaService.listForWorkspace(workspace.id);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mídia</h1>
          <p className="text-sm text-muted-foreground">
            Imagens JPEG e vídeos MP4/MOV disponíveis para suas publicações.
          </p>
        </div>
      </div>

      <MediaUploader workspaceSlug={workspace.slug} />
      <MediaGrid workspaceSlug={workspace.slug} assets={views} canDelete />
    </div>
  );
}
