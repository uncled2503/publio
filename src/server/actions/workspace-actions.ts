"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/workspace-context";
import { WorkspaceService } from "@/server/services/workspace-service";
import type { FormActionState } from "@/server/actions/auth-actions";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Give your workspace a name.").max(80),
});

export async function createWorkspaceAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireUser();

  const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const workspace = await WorkspaceService.createWorkspace(user.id, parsed.data.name);
  redirect(`/app/${workspace.slug}`);
}
