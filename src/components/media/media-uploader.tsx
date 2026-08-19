"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { requestMediaUploadAction, confirmMediaUploadAction } from "@/server/actions/media-actions";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = ["image/jpeg", "video/mp4", "video/quicktime"];
const ACCEPT_ATTR = ".jpg,.jpeg,image/jpeg,.mp4,video/mp4,.mov,video/quicktime";

interface UploadItem {
  name: string;
  status: "uploading" | "processing" | "done" | "error";
  message?: string;
}

export function MediaUploader({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);

  async function uploadOne(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setItems((prev) => [
        ...prev,
        { name: file.name, status: "error", message: "Formato não suportado (use JPEG, MP4 ou MOV)." },
      ]);
      return;
    }

    setItems((prev) => [...prev, { name: file.name, status: "uploading" }]);

    try {
      const { mediaAssetId, uploadUrl } = await requestMediaUploadAction(
        workspaceSlug,
        file.name,
        file.type,
      );

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Falha no upload (HTTP ${putRes.status})`);
      }

      setItems((prev) =>
        prev.map((it) => (it.name === file.name ? { ...it, status: "processing" } : it)),
      );

      await confirmMediaUploadAction(workspaceSlug, mediaAssetId);

      setItems((prev) => prev.map((it) => (it.name === file.name ? { ...it, status: "done" } : it)));
    } catch (error) {
      setItems((prev) =>
        prev.map((it) =>
          it.name === file.name
            ? { ...it, status: "error", message: error instanceof Error ? error.message : "Erro no upload" }
            : it,
        ),
      );
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setItems([]);
    await Promise.all(Array.from(fileList).map(uploadOne));
    setBusy(false);
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy}>
        <Upload /> {busy ? "Enviando..." : "Enviar mídia"}
      </Button>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-2 text-muted-foreground">
              <span className="truncate">{item.name}</span>
              <span
                className={
                  item.status === "error"
                    ? "text-destructive"
                    : item.status === "done"
                      ? "text-success"
                      : ""
                }
              >
                {item.status === "uploading" && "Enviando..."}
                {item.status === "processing" && "Processando..."}
                {item.status === "done" && "Concluído"}
                {item.status === "error" && (item.message ?? "Erro")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
