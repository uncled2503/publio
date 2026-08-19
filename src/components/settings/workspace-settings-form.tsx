"use client";

import { useActionState } from "react";

import { updateWorkspaceSettingsAction } from "@/server/actions/workspace-actions";
import type { FormActionState } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FormActionState = { error: null };

const COMMON_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Fortaleza",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Lisbon",
  "Europe/London",
  "UTC",
];

export function WorkspaceSettingsForm({
  workspaceSlug,
  currentName,
  currentTimezone,
  disabled,
}: {
  workspaceSlug: string;
  currentName: string;
  currentTimezone: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateWorkspaceSettingsAction.bind(null, workspaceSlug),
    initialState,
  );

  const timezoneOptions = COMMON_TIMEZONES.includes(currentTimezone)
    ? COMMON_TIMEZONES
    : [currentTimezone, ...COMMON_TIMEZONES];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome do workspace</Label>
        <Input id="name" name="name" defaultValue={currentName} disabled={disabled} className="max-w-sm" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Fuso horário</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={currentTimezone}
          disabled={disabled}
          className="h-9 max-w-sm rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
        >
          {timezoneOptions.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Usado para agendar publicações e no calendário.
        </p>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {!disabled ? (
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Só admins e owners podem alterar essas configurações.
        </p>
      )}
    </form>
  );
}
