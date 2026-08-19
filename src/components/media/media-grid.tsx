"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MediaProcessingStatus } from "@prisma/client";
import { FileVideo, Trash2 } from "lucide-react";

import { deleteMediaAction } from "@/server/actions/media-actions";
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
