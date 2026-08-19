"use client";

import { useActionState } from "react";

import { createWorkspaceAction } from "@/server/actions/workspace-actions";
import type { FormActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: FormActionState = { error: null };

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspaceAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crie seu workspace</CardTitle>
        <CardDescription>
          Um workspace agrupa suas contas do Instagram, sua equipe e seus conteúdos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome do workspace</Label>
            <Input id="name" name="name" placeholder="Minha Empresa" required />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando..." : "Continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
