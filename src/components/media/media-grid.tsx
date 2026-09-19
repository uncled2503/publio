"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaProcessingStatus } from "@prisma/client";
import { FileVideo, Trash2, Clock, GripVertical, FolderInput, CheckSquare, Square } from "lucide-react";

import { deleteMediaAction, keepMediaAction } from "@/server/actions/media-actions";
import { moveMediaToFolderAction, reorderFolderMediaAction } from "@/server/actions/media-folder-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaProcessingBadge } from "@/components/media/media-processing-badge";
import { cn } from "@/lib/utils";

export interface MediaAssetView {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  processingStatus: MediaProcessingStatus;
  validationErrors: string[];
  publicUrl: string;
  thumbnailUrl: string | null;
  scheduledDeletionAt: string | null;
  deletionExempt: boolean;
}

export interface MediaFolderOption {
  id: string;
  name: string;
}

function daysRemaining(scheduledDeletionAt: string): number {
  const ms = new Date(scheduledDeletionAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

const POLL_INTERVAL_MS = 3000;

export function MediaGrid({
  workspaceSlug,
  assets: initialAssets,
  canDelete,
  currentFolderId = null,
  folders = [],
}: {
  workspaceSlug: string;
  assets: MediaAssetView[];
  canDelete: boolean;
  currentFolderId?: string | null;
  folders?: MediaFolderOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assets, setAssets] = useState(initialAssets);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => setAssets(initialAssets), [initialAssets]);

  const hasInFlight = assets.some(
    (a) => a.processingStatus === "PENDING" || a.processingStatus === "PROCESSING",
  );

  useEffect(() => {
    if (!hasInFlight) return;
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasInFlight, router]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function moveSelection(folderId: string | null) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(() => {
      moveMediaToFolderAction(workspaceSlug, ids, folderId)
        .then(() => {
          setSelectedIds(new Set());
          setSelectionMode(false);
          router.refresh();
        })
        .catch((err: unknown) => {
          window.alert(err instanceof Error ? err.message : "Não foi possível mover a mídia selecionada.");
        });
    });
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...assets];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved!);
    setAssets(next);
    setDragIndex(null);
    startTransition(() => {
      reorderFolderMediaAction(workspaceSlug, currentFolderId, next.map((a) => a.id)).catch(() => {
        router.refresh();
      });
    });
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Nenhuma mídia aqui ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant={selectionMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSelectionMode((v) => !v);
            setSelectedIds(new Set());
          }}
        >
          {selectionMode ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
          {selectionMode ? "Cancelar seleção" : "Selecionar"}
        </Button>

        {selectionMode && selectedIds.size > 0 ? (
          <>
            <span className="text-sm text-muted-foreground">{selectedIds.size} selecionada(s)</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={pending}>
                  <FolderInput className="size-4" /> Mover para pasta
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => moveSelection(null)}>Sem pasta</DropdownMenuItem>
                {folders
                  .filter((f) => f.id !== currentFolderId)
                  .map((folder) => (
                    <DropdownMenuItem key={folder.id} onSelect={() => moveSelection(folder.id)}>
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((asset, index) => {
          const isSelected = selectedIds.has(asset.id);
          return (
            <Card
              key={asset.id}
              draggable={!selectionMode}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className={cn("overflow-hidden py-0", dragIndex === index && "opacity-50")}
            >
              <div
                className="relative flex aspect-square items-center justify-center bg-muted"
                onClick={() => (selectionMode ? toggleSelected(asset.id) : undefined)}
                role={selectionMode ? "button" : undefined}
              >
                {!selectionMode ? (
                  <span className="absolute left-1 top-1 rounded bg-black/40 p-0.5 text-white/80">
                    <GripVertical className="size-3.5" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "absolute left-1 top-1 flex size-5 items-center justify-center rounded border bg-background",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {isSelected ? <CheckSquare className="size-3.5" /> : null}
                  </span>
                )}
                {asset.mimeType === "image/jpeg" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset
                  <img
                    src={asset.publicUrl}
                    alt={asset.originalFilename}
                    className="size-full object-cover"
                  />
                ) : asset.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.originalFilename}
                    className="size-full object-cover"
                  />
                ) : (
                  <FileVideo className="size-10 text-muted-foreground" />
                )}
              </div>
              <CardContent className="flex flex-col gap-2 p-3">
                <p className="truncate text-xs font-medium" title={asset.originalFilename}>
                  {asset.originalFilename}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <MediaProcessingBadge status={asset.processingStatus} />
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <FolderInput className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() =>
                            startTransition(() => {
                              moveMediaToFolderAction(workspaceSlug, [asset.id], null)
                                .then(() => router.refresh())
                                .catch(() => undefined);
                            })
                          }
                        >
                          Sem pasta
                        </DropdownMenuItem>
                        {folders
                          .filter((f) => f.id !== currentFolderId)
                          .map((folder) => (
                            <DropdownMenuItem
                              key={folder.id}
                              onSelect={() =>
                                startTransition(() => {
                                  moveMediaToFolderAction(workspaceSlug, [asset.id], folder.id)
                                    .then(() => router.refresh())
                                    .catch(() => undefined);
                                })
                              }
                            >
                              {folder.name}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(`Remover "${asset.originalFilename}"?`)) return;
                          startTransition(() => {
                            deleteMediaAction(workspaceSlug, asset.id).catch((error: unknown) => {
                              window.alert(error instanceof Error ? error.message : "Não foi possível remover esta mídia.");
                            });
                          });
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {asset.processingStatus === "INVALID" && asset.validationErrors.length > 0 ? (
                  <p className="text-xs text-destructive">{asset.validationErrors[0]}</p>
                ) : null}
                {asset.scheduledDeletionAt && !asset.deletionExempt ? (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-warning/10 px-2 py-1.5">
                    <span className="flex items-center gap-1 text-[11px] text-warning-foreground">
                      <Clock className="size-3" />
                      Excluída em {daysRemaining(asset.scheduledDeletionAt)} dia
                      {daysRemaining(asset.scheduledDeletionAt) === 1 ? "" : "s"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      disabled={pending}
                      onClick={() => {
                        startTransition(() => {
                          keepMediaAction(workspaceSlug, asset.id).catch((error: unknown) => {
                            window.alert(error instanceof Error ? error.message : "Não foi possível manter esta mídia.");
                          });
                        });
                      }}
                    >
                      Manter mídia
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
