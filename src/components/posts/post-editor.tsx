"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PostType } from "@prisma/client";
import { Image as ImageIcon, GalleryHorizontal, Clapperboard, FileVideo, Check, Trash2 } from "lucide-react";

import { updatePostAction, deletePostAction } from "@/server/actions/post-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostStatusBadge } from "@/components/posts/post-status-badge";
import { cn } from "@/lib/utils";
import type { PostStatus } from "@prisma/client";

interface MediaOption {
  id: string;
  publicUrl: string;
  mimeType: string;
  originalFilename: string;
}

interface AccountOption {
  id: string;
  username: string;
  profilePictureUrl: string | null;
}

const TYPE_OPTIONS: Array<{ type: PostType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: "IMAGE", label: "Imagem", icon: ImageIcon },
  { type: "CAROUSEL", label: "Carrossel", icon: GalleryHorizontal },
  { type: "REEL", label: "Reel", icon: Clapperboard },
];

const MEDIA_LIMIT: Record<PostType, number> = { IMAGE: 1, CAROUSEL: 10, REEL: 1 };

export function PostEditor({
  workspaceSlug,
  post,
  availableMedia,
  availableAccounts,
}: {
  workspaceSlug: string;
  post: {
    id: string;
    status: PostStatus;
    postType: PostType;
    caption: string;
    mediaAssetIds: string[];
    socialAccountIds: string[];
  };
  availableMedia: MediaOption[];
  availableAccounts: AccountOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [postType, setPostType] = useState<PostType>(post.postType);
  const [caption, setCaption] = useState(post.caption);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>(post.mediaAssetIds);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(post.socialAccountIds);

  const isEditable = post.status === "DRAFT";
  const mediaById = useMemo(() => new Map(availableMedia.map((m) => [m.id, m])), [availableMedia]);
  const selectedMedia = selectedMediaIds.map((id) => mediaById.get(id)).filter((m): m is MediaOption => !!m);

  function toggleMedia(id: string) {
    if (!isEditable) return;
    setSelectedMediaIds((current) => {
      if (current.includes(id)) return current.filter((existing) => existing !== id);
      if (postType !== "CAROUSEL" && current.length >= 1) return [id];
      if (current.length >= MEDIA_LIMIT[postType]) return current;
      return [...current, id];
    });
  }

  function toggleAccount(id: string) {
    if (!isEditable) return;
    setSelectedAccountIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  }

  function handleTypeChange(type: PostType) {
    if (!isEditable) return;
    setPostType(type);
    setSelectedMediaIds((current) => current.slice(0, MEDIA_LIMIT[type]));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(() => {
      updatePostAction(workspaceSlug, post.id, {
        caption,
        postType,
        mediaAssetIds: selectedMediaIds,
        socialAccountIds: selectedAccountIds,
      })
        .then(() => {
          setSaved(true);
          router.refresh();
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Não foi possível salvar a publicação.");
        });
    });
  }

  function handleDelete() {
    if (!window.confirm("Excluir este rascunho? Essa ação não pode ser desfeita.")) return;
    startTransition(() => {
      deletePostAction(workspaceSlug, post.id).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Não foi possível excluir esta publicação.");
      });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Editar publicação</h1>
          <p className="text-sm text-muted-foreground">
            Legenda, mídia e contas de destino desta publicação.
          </p>
        </div>
        <PostStatusBadge status={post.status} />
      </div>

      {!isEditable ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          Esta publicação não está mais em rascunho e não pode ser editada.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label>Tipo de publicação</Label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  type="button"
                  variant={postType === type ? "default" : "outline"}
                  size="sm"
                  disabled={!isEditable}
                  onClick={() => handleTypeChange(type)}
                >
                  <Icon className="size-4" /> {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="caption">Legenda</Label>
            <Textarea
              id="caption"
              rows={6}
              maxLength={2200}
              value={caption}
              disabled={!isEditable}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva a legenda da publicação..."
            />
            <p className="text-right text-xs text-muted-foreground">{caption.length}/2200</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              Mídia {postType === "CAROUSEL" ? "(2 a 10, na ordem escolhida)" : "(1 item)"}
            </Label>
            {availableMedia.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma mídia disponível. Envie arquivos na página de Mídia primeiro.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {availableMedia.map((asset) => {
                  const selectedIndex = selectedMediaIds.indexOf(asset.id);
                  const isSelected = selectedIndex !== -1;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={!isEditable}
                      onClick={() => toggleMedia(asset.id)}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-md border-2 bg-muted",
                        isSelected ? "border-primary" : "border-transparent",
                      )}
                    >
                      {asset.mimeType.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external R2 URL
                        <img src={asset.publicUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <FileVideo className="size-6 text-muted-foreground" />
                        </div>
                      )}
                      {isSelected ? (
                        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {postType === "CAROUSEL" ? selectedIndex + 1 : <Check className="size-3" />}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Contas de destino</Label>
            {availableAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma conta do Instagram conectada. Conecte uma na página de Contas.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {availableAccounts.map((account) => {
                  const isSelected = selectedAccountIds.includes(account.id);
                  return (
                    <button
                      key={account.id}
                      type="button"
                      disabled={!isEditable}
                      onClick={() => toggleAccount(account.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <Avatar className="size-7">
                        <AvatarImage src={account.profilePictureUrl ?? undefined} alt={account.username} />
                        <AvatarFallback>{account.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1">@{account.username}</span>
                      {isSelected ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={!isEditable || pending}>
              {pending ? "Salvando..." : "Salvar rascunho"}
            </Button>
            {saved && !pending ? <span className="text-sm text-success">Salvo.</span> : null}
            {isEditable ? (
              <Button variant="ghost" className="ml-auto text-destructive" onClick={handleDelete} disabled={pending}>
                <Trash2 className="size-4" /> Excluir
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Pré-visualização</Label>
          <Card className="overflow-hidden py-0">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Avatar className="size-6">
                <AvatarImage
                  src={availableAccounts.find((a) => selectedAccountIds.includes(a.id))?.profilePictureUrl ?? undefined}
                />
                <AvatarFallback>IG</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">
                {availableAccounts.find((a) => selectedAccountIds.includes(a.id))?.username
                  ? `@${availableAccounts.find((a) => selectedAccountIds.includes(a.id))!.username}`
                  : "sua_conta"}
              </span>
            </div>
            <div className="flex aspect-square items-center justify-center bg-muted">
              {selectedMedia.length === 0 ? (
                <span className="text-xs text-muted-foreground">Sem mídia selecionada</span>
              ) : selectedMedia[0]!.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- external R2 URL
                <img src={selectedMedia[0]!.publicUrl} alt="" className="size-full object-cover" />
              ) : (
                <FileVideo className="size-10 text-muted-foreground" />
              )}
            </div>
            <CardContent className="p-3">
              <p className="whitespace-pre-wrap text-xs">
                <span className="font-medium">
                  {availableAccounts.find((a) => selectedAccountIds.includes(a.id))?.username ?? "sua_conta"}
                </span>{" "}
                {caption || <span className="text-muted-foreground">Sem legenda</span>}
              </p>
              {postType === "CAROUSEL" && selectedMedia.length > 1 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{selectedMedia.length} itens no carrossel</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
