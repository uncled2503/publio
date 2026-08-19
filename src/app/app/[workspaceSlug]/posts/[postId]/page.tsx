import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { PostService } from "@/server/services/post-service";
import { MediaService } from "@/server/services/media-service";
import { SocialAccountService } from "@/server/services/social-account-service";
import { getStorageProvider } from "@/server/storage";
import { PostEditor } from "@/components/posts/post-editor";

export const metadata: Metadata = { title: "Editar publicação — Publio" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; postId: string }>;
}) {
  const { workspaceSlug, postId } = await params;
  const { workspace } = await requireWorkspaceMember(workspaceSlug);

  const post = await PostService.getForWorkspace(workspace.id, postId);
  if (!post) notFound();

  const [mediaAssets, socialAccounts] = await Promise.all([
    MediaService.listForWorkspace(workspace.id),
    SocialAccountService.listForWorkspace(workspace.id),
  ]);

  const storage = getStorageProvider();

  return (
    <PostEditor
      workspaceSlug={workspaceSlug}
      post={{
        id: post.id,
        status: post.status,
        postType: post.postType,
        caption: post.caption,
        mediaAssetIds: post.media.map((m) => m.mediaAssetId),
        socialAccountIds: post.targets.map((t) => t.socialAccountId),
      }}
      availableMedia={mediaAssets
        .filter((a) => a.processingStatus === "READY")
        .map((a) => {
          const metadata = a.metadata as { thumbnailKey?: string } | null;
          return {
            id: a.id,
            publicUrl: storage.getPublicUrl(a.storageKey),
            thumbnailUrl: metadata?.thumbnailKey ? storage.getPublicUrl(metadata.thumbnailKey) : null,
            mimeType: a.mimeType,
            originalFilename: a.originalFilename,
          };
        })}
      availableAccounts={socialAccounts
        .filter((a) => a.tokenStatus === "CONNECTED" || a.tokenStatus === "EXPIRING")
        .map((a) => ({ id: a.id, username: a.username, profilePictureUrl: a.profilePictureUrl }))}
    />
  );
}
