import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-lg text-sm font-bold text-white">
        P
      </span>
      <span className="text-lg font-semibold tracking-tight">Publio</span>
    </span>
  );
}
