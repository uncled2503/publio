"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileVideo, GripVertical, Plus, Trash2, CalendarClock } from "lucide-react";

import { bulkScheduleFolderAction } from "@/server/actions/bulk-schedule-actions";
import { reorderFolderMediaAction } from "@/server/actions/media-folder-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface BulkScheduleVideo {
  id: string;
  originalFilename: string;
  thumbnailUrl: string | null;
  publicUrl: string;
}

export interface BulkScheduleAccount {
  id: string;
  username: string;
  profilePictureUrl: string | null;
}

/** "YYYY-MM-DD" for tomorrow, in the visitor's local time — a sane default; the server resolves the actual moment in the workspace timezone. */
function tomorrowDateValue(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function BulkScheduleDialog({
  workspaceSlug,
  folderId,
  videos: initialVideos,
  accounts,
  workspaceTimezone,
}: {
  workspaceSlug: string;
  folderId: string;
  videos: BulkScheduleVideo[];
  accounts: BulkScheduleAccount[];
  workspaceTimezone: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ count: number } | null>(null);

  const [videos, setVideos] = useState(initialVideos);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [startDate, setStartDate] = useState(tomorrowDateValue());
  const [times, setTimes] = useState<string[]>(["09:00", "14:00", "20:00"]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [captionMode, setCaptionMode] = useState<"SHARED" | "PER_VIDEO">("SHARED");
  const [sharedCaption, setSharedCaption] = useState("");
  const [captionsByMediaId, setCaptionsByMediaId] = useState<Record<string, string>>({});

  function toggleAccount(id: string) {
    setSelectedAccountIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setVideos((current) => {
      const next = [...current];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved!);
      reorderFolderMediaAction(workspaceSlug, folderId, next.map((v) => v.id)).catch(() => {
        // Best-effort persistence — local order still reflects the user's intent for this submission.
      });
      return next;
    });
    setDragIndex(null);
  }

  function handleSubmit() {
    setError(null);
    setResult(null);

    const parsedTimes = times.map(parseTime);
    if (parsedTimes.some((t) => t === null) || parsedTimes.length === 0) {
      setError("Verifique os horários informados (formato HH:mm).");
      return;
    }
    if (selectedAccountIds.length === 0) {
      setError("Selecione ao menos uma conta de destino.");
      return;
    }

    startTransition(() => {
      bulkScheduleFolderAction(workspaceSlug, folderId, {
        socialAccountIds: selectedAccountIds,
        startDate,
        timesOfDay: parsedTimes as Array<{ hour: number; minute: number }>,
        captionMode,
        sharedCaption: captionMode === "SHARED" ? sharedCaption : undefined,
        captionsByMediaId: captionMode === "PER_VIDEO" ? captionsByMediaId : undefined,
      })
        .then((res) => {
          setResult({ count: res.createdPostIds.length });
          router.refresh();
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Não foi possível agendar esta pasta.");
        });
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setResult(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm" disabled={videos.length === 0}>
          <CalendarClock className="size-4" /> Agendar esta pasta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar pasta em lote</DialogTitle>
          <DialogDescription>
            {videos.length} vídeo{videos.length === 1 ? "" : "s"} serão distribuídos automaticamente no calendário,
            começando na data escolhida, nos horários definidos abaixo — repetindo os horários a cada dia até
            terminar a pasta.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm">
            {result.count} vídeo{result.count === 1 ? "" : "s"} agendado{result.count === 1 ? "" : "s"} com sucesso.
            Veja em <a href={`/app/${workspaceSlug}/calendar`} className="underline underline-offset-2">Calendário</a>.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Ordem de publicação (arraste para reordenar)</Label>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                {videos.map((video, index) => (
                  <div
                    key={video.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                      dragIndex === index ? "opacity-50" : "hover:bg-accent/50",
                    )}
                  >
                    <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                    <span className="w-5 shrink-0 text-xs text-muted-foreground">{index + 1}.</span>
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external R2 URL
                      <img src={video.thumbnailUrl} alt="" className="size-8 shrink-0 rounded object-cover" />
                    ) : (
                      <FileVideo className="size-8 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{video.originalFilename}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bulk-start-date">Data de início ({workspaceTimezone})</Label>
                <Input
                  id="bulk-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Horários por dia</Label>
                <div className="flex flex-col gap-2">
                  {times.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) =>
                          setTimes((current) => current.map((t, i) => (i === index ? e.target.value : t)))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        disabled={times.length <= 1}
                        onClick={() => setTimes((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => setTimes((current) => [...current, "12:00"])}
                  >
                    <Plus className="size-4" /> Adicionar horário
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Contas de destino</Label>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta conectada.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {accounts.map((account) => {
                    const isSelected = selectedAccountIds.includes(account.id);
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleAccount(account.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          isSelected ? "border-primary bg-primary/5" : "border-border",
                        )}
                      >
                        <Avatar className="size-6">
                          <AvatarImage src={account.profilePictureUrl ?? undefined} alt={account.username} />
                          <AvatarFallback>{account.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1">@{account.username}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Legenda</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={captionMode === "SHARED" ? "default" : "outline"}
                    onClick={() => setCaptionMode("SHARED")}
                  >
                    Mesma para todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={captionMode === "PER_VIDEO" ? "default" : "outline"}
                    onClick={() => setCaptionMode("PER_VIDEO")}
                  >
                    Individual por vídeo
                  </Button>
                </div>
              </div>

              {captionMode === "SHARED" ? (
                <Textarea
                  rows={4}
                  maxLength={2200}
                  value={sharedCaption}
                  onChange={(e) => setSharedCaption(e.target.value)}
                  placeholder="Escreva a legenda que será usada em todos os vídeos desta pasta..."
                />
              ) : (
                <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
                  {videos.map((video) => (
                    <div key={video.id} className="flex flex-col gap-1">
                      <span className="truncate text-xs text-muted-foreground">{video.originalFilename}</span>
                      <Textarea
                        rows={2}
                        maxLength={2200}
                        value={captionsByMediaId[video.id] ?? ""}
                        onChange={(e) =>
                          setCaptionsByMediaId((current) => ({ ...current, [video.id]: e.target.value }))
                        }
                        placeholder="Legenda deste vídeo..."
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Agendando..." : "Agendar pasta"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
