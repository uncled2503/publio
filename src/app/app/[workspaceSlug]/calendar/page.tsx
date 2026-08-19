import Link from "next/link";
import type { Metadata } from "next";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { requireWorkspaceMember } from "@/server/auth/workspace-context";
import { PostService } from "@/server/services/post-service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendário — Publio" };

const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-muted-foreground",
  SCHEDULED: "bg-warning",
  QUEUED: "bg-warning",
  PREPARING: "bg-warning",
  PROCESSING_MEDIA: "bg-warning",
  PUBLISHING: "bg-warning",
  PUBLISHED: "bg-success",
  FAILED: "bg-destructive",
  CANCELED: "bg-muted-foreground",
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceMember(workspaceSlug);
  const { month: monthParam } = await searchParams;

  const zone = workspace.timezone;
  const now = DateTime.now().setZone(zone);
  const parsedMonth = monthParam ? DateTime.fromISO(`${monthParam}-01`, { zone }) : null;
  const anchor = parsedMonth?.isValid ? parsedMonth : now;
  const monthStart = anchor.startOf("month");
  const monthEnd = anchor.endOf("month");

  // Luxon's weekday is 1=Monday..7=Sunday; walk back to the most recent
  // Sunday on/before monthStart so the grid is Sunday-first (WEEKDAY_LABELS).
  const daysBackToSunday = monthStart.weekday % 7; // Sun=7%7=0, Mon=1, ... Sat=6
  const start = monthStart.minus({ days: daysBackToSunday });
  const daysForwardToSaturday = 6 - (monthEnd.weekday % 7);
  const end = monthEnd.plus({ days: daysForwardToSaturday });

  const days: DateTime[] = [];
  for (let d = start; d <= end; d = d.plus({ days: 1 })) {
    days.push(d);
  }

  const posts = await PostService.listForWorkspace(workspace.id);
  const scheduledPosts = posts.filter((p) => p.scheduledAt !== null);

  const postsByDay = new Map<string, typeof scheduledPosts>();
  for (const post of scheduledPosts) {
    const key = DateTime.fromJSDate(post.scheduledAt!, { zone: "utc" }).setZone(zone).toISODate();
    if (!key) continue;
    const existing = postsByDay.get(key) ?? [];
    existing.push(post);
    postsByDay.set(key, existing);
  }

  const prevMonth = monthStart.minus({ months: 1 }).toFormat("yyyy-MM");
  const nextMonth = monthStart.plus({ months: 1 }).toFormat("yyyy-MM");
  const todayKey = now.toISODate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            Publicações agendadas, na fila e publicadas ({zone}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon">
            <Link href={`/app/${workspaceSlug}/calendar?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-32 text-center text-sm font-medium capitalize">
            {monthStart.setLocale("pt-BR").toFormat("LLLL yyyy")}
          </span>
          <Button asChild variant="outline" size="icon">
            <Link href={`/app/${workspaceSlug}/calendar?month=${nextMonth}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-muted px-2 py-1.5 text-center font-medium text-muted-foreground">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = day.toISODate()!;
          const isCurrentMonth = day.month === monthStart.month;
          const isToday = key === todayKey;
          const dayPosts = postsByDay.get(key) ?? [];

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-24 flex-col gap-1 bg-background p-1.5",
                !isCurrentMonth && "bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px]",
                  isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  !isCurrentMonth && "opacity-50",
                )}
              >
                {day.day}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <Link
                    key={post.id}
                    href={`/app/${workspaceSlug}/posts/${post.id}`}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] hover:bg-accent"
                    title={post.caption}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[post.status])} />
                    <span className="truncate">
                      {DateTime.fromJSDate(post.scheduledAt!, { zone: "utc" }).setZone(zone).toFormat("HH:mm")}{" "}
                      {post.caption || "(sem legenda)"}
                    </span>
                  </Link>
                ))}
                {dayPosts.length > 3 ? (
                  <span className="px-1 text-[10px] text-muted-foreground">+{dayPosts.length - 3} mais</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {scheduledPosts.length === 0 ? (
        <Card className="py-14 text-center text-sm text-muted-foreground">
          Nenhuma publicação agendada ainda. Crie uma em Publicações e agende.
        </Card>
      ) : null}
    </div>
  );
}
