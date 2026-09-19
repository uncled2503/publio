"use server";

import { revalidatePath } from "next/cache";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { BulkScheduleService, type BulkScheduleSlot, type BulkScheduleCaptionMode } from "@/server/services/bulk-schedule-service";

export async function bulkScheduleFolderAction(
  workspaceSlug: string,
  folderId: string,
  config: {
    socialAccountIds: string[];
    startDate: string;
    timesOfDay: BulkScheduleSlot[];
    captionMode: BulkScheduleCaptionMode;
    sharedCaption?: string;
    captionsByMediaId?: Record<string, string>;
  },
) {
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug);

  const result = await BulkScheduleService.scheduleFolder({
    workspaceId: workspace.id,
    actorUserId: user.id,
    folderId,
    timezone: workspace.timezone,
    ...config,
  });

  revalidatePath(`/app/${workspaceSlug}/media`);
  revalidatePath(`/app/${workspaceSlug}/posts`);
  revalidatePath(`/app/${workspaceSlug}/calendar`);

  return result;
}
