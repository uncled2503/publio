"use client";

import { useTransition } from "react";
import type { WorkspaceRole } from "@prisma/client";
import { Trash2 } from "lucide-react";

import { removeMemberAction, updateMemberRoleAction } from "@/server/actions/workspace-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function MemberRow({
  workspaceSlug,
  memberId,
  name,
  email,
  role,
  isSelf,
  canManage,
  isLastOwner,
}: {
  workspaceSlug: string;
  memberId: string;
  name: string | null;
  email: string;
  role: WorkspaceRole;
  isSelf: boolean;
  canManage: boolean;
  isLastOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const canEditThisRow = canManage && !isLastOwner;

  function handleRoleChange(newRole: WorkspaceRole) {
    startTransition(() => {
      updateMemberRoleAction(workspaceSlug, memberId, newRole).catch((err: unknown) => {
        window.alert(err instanceof Error ? err.message : "Não foi possível alterar a função.");
      });
    });
  }

  function handleRemove() {
    if (!window.confirm(`Remover ${name ?? email} deste workspace?`)) return;
    startTransition(() => {
      removeMemberAction(workspaceSlug, memberId).catch((err: unknown) => {
        window.alert(err instanceof Error ? err.message : "Não foi possível remover este membro.");
      });
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="size-8">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name ?? email} {isSelf ? <span className="text-xs text-muted-foreground">(você)</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <select
        value={role}
        disabled={!canEditThisRow || pending}
        onChange={(e) => handleRoleChange(e.target.value as WorkspaceRole)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm disabled:opacity-50"
      >
        <option value="MEMBER">Membro</option>
        <option value="ADMIN">Admin</option>
        <option value="OWNER">Owner</option>
      </select>
      {canManage && !isLastOwner ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive"
          disabled={pending}
          onClick={handleRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <span className="w-8" />
      )}
    </div>
  );
}
