"use client";

import { useActionState } from "react";

import { inviteMemberAction } from "@/server/actions/workspace-actions";
import type { FormActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const initialState: FormActionState = { error: null };

export function InviteMemberForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [state, formAction, pending] = useActionState(
    inviteMemberAction.bind(null, workspaceSlug),
    initialState,
  );

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Convidar por email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="pessoa@empresa.com"
              required
              className="w-64"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Função</Label>
            <select
              id="role"
              name="role"
              defaultValue="MEMBER"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="MEMBER">Membro</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adicionando..." : "Adicionar"}
          </Button>
        </form>
        {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">
          A pessoa precisa já ter uma conta no Publio com esse email.
        </p>
      </CardContent>
    </Card>
  );
}
