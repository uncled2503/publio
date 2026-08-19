import Link from "next/link";
import { ChevronsUpDown, Plus, LogOut } from "lucide-react";

import { WorkspaceService } from "@/server/services/workspace-service";
import { signOutAction } from "@/server/actions/auth-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function WorkspaceTopbar({
  userId,
  userName,
  userEmail,
  currentWorkspaceName,
  currentWorkspaceSlug,
}: {
  userId: string;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  currentWorkspaceName: string;
  currentWorkspaceSlug: string;
}) {
  const memberships = await WorkspaceService.listForUser(userId);

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="justify-between gap-2 px-2">
            <span className="truncate font-semibold">{currentWorkspaceName}</span>
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {memberships.map(({ workspace }) => (
            <DropdownMenuItem key={workspace.id} asChild>
              <Link
                href={`/app/${workspace.slug}`}
                aria-current={workspace.slug === currentWorkspaceSlug}
              >
                {workspace.name}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/onboarding">
              <Plus /> Novo workspace
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="size-8">
              <AvatarFallback>{initials(userName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col">
              <span className="font-medium">{userName ?? "Sua conta"}</span>
              <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/app/${currentWorkspaceSlug}/settings`}>Configurações</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <DropdownMenuItem variant="destructive" asChild>
              <button type="submit" className="w-full text-left">
                <LogOut /> Sair
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
