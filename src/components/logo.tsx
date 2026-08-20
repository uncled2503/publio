import Image from "next/image";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Publio"
      width={2079}
      height={756}
      priority
      className={cn("h-8 w-auto", className)}
    />
  );
}
