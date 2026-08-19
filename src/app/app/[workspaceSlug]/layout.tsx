import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { WorkspaceTopbar } from "@/components/app/workspace-topbar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border p-3 md:flex">
        <div className="px-2 py-3 text-lg font-semibold tracking-tight">Publio</div>
        <SidebarNav workspaceSlug={workspace.slug} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTopbar
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
          currentWorkspaceName={workspace.name}
          currentWorkspaceSlug={workspace.slug}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
