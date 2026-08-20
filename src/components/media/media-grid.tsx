"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaProcessingStatus } from "@prisma/client";
import { FileVideo, Trash2, Clock } from "lucide-react";

import { deleteMediaAction, keepMediaAction } from "@/server/actions/media-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaProcessingBadge } from "@/components/media/media-processing-badge";

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

function daysRemaining(scheduledDeletionAt: string): number {
  const ms = new Date(scheduledDeletionAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

const POLL_INTERVAL_MS = 3000;

export function MediaGrid({
  workspaceSlug,
  assets,
  canDelete,
}: {
  workspaceSlug: string;
  assets: MediaAssetView[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hasInFlight = assets.some(
    (a) => a.processingStatus === "PENDING" || a.processingStatus === "PROCESSING",
  );

  useEffect(() => {
    if (!hasInFlight) return;
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasInFlight, router]);

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Nenhuma mídia enviada ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {assets.map((asset) => (
        <Card key={asset.id} className="overflow-hidden py-0">
          <div className="flex aspect-square items-center justify-center bg-muted">
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
            <div className="flex items-center justify-between">
              <MediaProcessingBadge status={asset.processingStatus} />
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
      ))}
    </div>
  );
}
