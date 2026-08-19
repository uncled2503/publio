import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/workspace-context";
import { WorkspaceService } from "@/server/services/workspace-service";
import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";

export const metadata: Metadata = { title: "Criar workspace — Publio" };

export default async function OnboardingPage() {
  const user = await requireUser();

  const existing = await WorkspaceService.listForUser(user.id);
  if (existing.length > 0) {
    redirect(`/app/${existing[0]!.workspace.slug}`);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
