"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";

import { deleteWorkspaceAction } from "@/server/actions/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DeleteWorkspaceSection({
  workspaceSlug,
  workspaceName,
}: {
  workspaceSlug: string;
  workspaceName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (confirmation !== workspaceSlug) return;
    if (!window.confirm(`Excluir "${workspaceName}" permanentemente? Isso apaga tudo: publicações, mídia e contas conectadas.`)) {
      return;
    }
    setError(null);
    startTransition(() => {
      deleteWorkspaceAction(workspaceSlug, confirmation).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Não foi possível excluir o workspace.");
      });
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <TriangleAlert className="size-4" /> Zona de risco
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Excluir este workspace remove permanentemente todas as publicações, mídia, contas
          conectadas e membros. Não pode ser desfeito.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-slug">
            Digite <strong>{workspaceSlug}</strong> para confirmar
          </Label>
          <Input
            id="confirm-slug"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="max-w-sm"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          variant="outline"
          className="w-fit border-destructive text-destructive hover:bg-destructive/10"
          disabled={confirmation !== workspaceSlug || pending}
          onClick={handleDelete}
        >
          {pending ? "Excluindo..." : "Excluir workspace"}
        </Button>
      </CardContent>
    </Card>
  );
}
