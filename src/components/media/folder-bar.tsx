"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Folder, FolderPlus, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { createFolderAction, renameFolderAction, deleteFolderAction } from "@/server/actions/media-folder-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FolderBarProps {
  workspaceSlug: string;
  breadcrumb: Array<{ id: string; name: string }>;
  currentFolderId: string | null;
  childFolders: Array<{ id: string; name: string }>;
}

function folderHref(workspaceSlug: string, folderId: string | null): string {
  return folderId
    ? `/app/${workspaceSlug}/media?folder=${folderId}`
    : `/app/${workspaceSlug}/media`;
}

export function FolderBar({ workspaceSlug, breadcrumb, currentFolderId, childFolders }: FolderBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    startTransition(() => {
      createFolderAction(workspaceSlug, name, currentFolderId)
        .then(() => {
          setNewName("");
          setCreating(false);
          router.refresh();
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Não foi possível criar a pasta.");
        });
    });
  }

  function handleRename(folderId: string, currentName: string) {
    const name = window.prompt("Novo nome da pasta:", currentName);
    if (!name || name.trim() === currentName) return;
    startTransition(() => {
      renameFolderAction(workspaceSlug, folderId, name.trim())
        .then(() => router.refresh())
        .catch((err: unknown) => {
          window.alert(err instanceof Error ? err.message : "Não foi possível renomear a pasta.");
        });
    });
  }

  function handleDelete(folderId: string, name: string) {
    if (!window.confirm(`Excluir a pasta "${name}"? Subpastas também serão excluídas; os vídeos não são apagados, apenas ficam sem pasta.`)) {
      return;
    }
    startTransition(() => {
      deleteFolderAction(workspaceSlug, folderId)
        .then(() => {
          if (folderId === currentFolderId) router.push(folderHref(workspaceSlug, null));
          router.refresh();
        })
        .catch((err: unknown) => {
          window.alert(err instanceof Error ? err.message : "Não foi possível excluir a pasta.");
        });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href={folderHref(workspaceSlug, null)} className="flex items-center gap-1 hover:text-foreground">
          <Folder className="size-4" /> Mídia
        </Link>
        {breadcrumb.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            <Link href={folderHref(workspaceSlug, crumb.id)} className="hover:text-foreground">
              {crumb.name}
            </Link>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {childFolders.map((folder) => (
          <div
            key={folder.id}
            className="group flex items-center gap-1 rounded-md border border-border bg-card pl-1 pr-2 py-1"
          >
            <Link
              href={folderHref(workspaceSlug, folder.id)}
              className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent/50"
            >
              <Folder className="size-4 text-muted-foreground" />
              {folder.name}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleRename(folder.id, folder.name)}>
                  <Pencil className="size-4" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(folder.id, folder.name)}>
                  <Trash2 className="size-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {creating ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={newName}
              placeholder="Nome da pasta"
              className="h-9 w-40"
              disabled={pending}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
            />
            <Button size="sm" disabled={pending || !newName.trim()} onClick={handleCreate}>
              Criar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <FolderPlus className="size-4" /> Nova pasta
          </Button>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
