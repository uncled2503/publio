import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/workspace-context";
import { WorkspaceService } from "@/server/services/workspace-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AppIndexPage() {
  const user = await requireUser();
  const memberships = await WorkspaceService.listForUser(user.id);

  if (memberships.length === 0) {
    redirect("/onboarding");
  }
  if (memberships.length === 1) {
    redirect(`/app/${memberships[0]!.workspace.slug}`);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Escolha um workspace</h1>
      <div className="flex flex-col gap-2">
        {memberships.map(({ workspace, role }) => (
          <Link key={workspace.id} href={`/app/${workspace.slug}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {workspace.name}
                  <span className="text-xs font-normal text-muted-foreground">{role}</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <CardContent className="p-0 pt-2">
        <Link
          href="/onboarding"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Criar novo workspace
        </Link>
      </CardContent>
    </div>
  );
}
