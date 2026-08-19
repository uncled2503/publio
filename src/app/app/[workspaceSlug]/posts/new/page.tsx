import type { Metadata } from "next";
import type { PostType } from "@prisma/client";
import { Image as ImageIcon, GalleryHorizontal, Clapperboard } from "lucide-react";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { createPostAction } from "@/server/actions/post-actions";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nova publicação — Publio" };

const OPTIONS: Array<{ type: PostType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: "IMAGE", label: "Imagem", description: "Uma única foto.", icon: ImageIcon },
  { type: "CAROUSEL", label: "Carrossel", description: "De 2 a 10 fotos ou vídeos.", icon: GalleryHorizontal },
  { type: "REEL", label: "Reel", description: "Um único vídeo.", icon: Clapperboard },
];

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  await requireWorkspaceMember(workspaceSlug);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova publicação</h1>
        <p className="text-sm text-muted-foreground">Escolha o tipo de publicação para começar.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {OPTIONS.map(({ type, label, description, icon: Icon }) => (
          <form key={type} action={createPostAction.bind(null, workspaceSlug, type)}>
            <button type="submit" className="w-full text-left">
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                  <Icon className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
