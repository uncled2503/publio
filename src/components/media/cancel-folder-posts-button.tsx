"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX } from "lucide-react";

import { cancelFolderPostsAction } from "@/server/actions/bulk-schedule-actions";
import { Button } from "@/components/ui/button";

export function CancelFolderPostsButton({
  workspaceSlug,
  folderId,
  count,
}: {
  workspaceSlug: string;
  folderId: string;
  count: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (count === 0) return null;

  const label = `${count} publicaç${count === 1 ? "ão" : "ões"}`;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Cancelar ${label} agendada${count === 1 ? "" : "s"} a partir desta pasta? Essa ação não pode ser desfeita.`,
          )
        ) {
          return;
        }
        startTransition(() => {
          cancelFolderPostsAction(workspaceSlug, folderId)
            .then(() => router.refresh())
            .catch(() => {
              window.alert("Não foi possível cancelar as publicações desta pasta.");
            });
        });
      }}
    >
      <CalendarX className="size-4" /> {pending ? "Cancelando..." : `Cancelar ${label}`}
    </Button>
  );
}
