import Link from "next/link";
import type { Metadata } from "next";
import { Plus, FileStack } from "lucide-react";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { PostService } from "@/server/services/post-service";
import { getStorageProvider } from "@/server/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PostStatusBadge } from "@/components/posts/post-status-badge";

export const metadata: Metadata = { title: "Publicações — Publio" };

const POST_TYPE_LABEL = { IMAGE: "Imagem", CAROUSEL: "Carrossel", REEL: "Reel" } as const;

export default async function PostsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceMember(workspaceSlug);

  const posts = await PostService.listForWorkspace(workspace.id);
  const storage = getStorageProvider();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Publicações</h1>
          <p className="text-sm text-muted-foreground">
            Rascunhos e publicações do Instagram desta workspace.
          </p>
        </div>
        <Button asChild>
          <Link href={`/app/${workspaceSlug}/posts/new`}>
            <Plus /> Nova publicação
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FileStack className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma publicação criada ainda.</p>
            <Button asChild>
              <Link href={`/app/${workspaceSlug}/posts/new`}>Criar publicação</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => {
            const cover = post.media[0];
            const coverMetadata = cover?.mediaAsset.metadata as { thumbnailKey?: string } | null;
            const coverImageUrl = cover
              ? cover.mediaAsset.mimeType.startsWith("image/")
                ? storage.getPublicUrl(cover.mediaAsset.storageKey)
                : coverMetadata?.thumbnailKey
                  ? storage.getPublicUrl(coverMetadata.thumbnailKey)
                  : null
              : null;
            return (
              <Link key={post.id} href={`/app/${workspaceSlug}/posts/${post.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external R2 URL
                        <img src={coverImageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <FileStack className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {post.caption || "Sem legenda"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {POST_TYPE_LABEL[post.postType]} · {post.targets.length}{" "}
                        conta{post.targets.length === 1 ? "" : "s"} ·{" "}
                        {new Date(post.updatedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <PostStatusBadge status={post.status} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
