"use client";

import { useTransition } from "react";

import { disconnectInstagramAction } from "@/server/actions/social-account-actions";
import { Button } from "@/components/ui/button";

export function DisconnectButton({
  workspaceSlug,
  socialAccountId,
  username,
}: {
  workspaceSlug: string;
  socialAccountId: string;
  username: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Desconectar @${username}? Publicações agendadas para esta conta vão falhar até reconectar.`)) {
          return;
        }
        startTransition(() => {
          void disconnectInstagramAction(workspaceSlug, socialAccountId);
        });
      }}
    >
      {pending ? "Desconectando..." : "Desconectar"}
    </Button>
  );
}
