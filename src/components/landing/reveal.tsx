"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Fades + slides a section in the first time it enters the viewport.
 *
 * Content is fully visible by default (server-rendered, no-JS-safe) — the
 * effect only *adds* the hidden state once it has actually mounted and
 * confirmed IntersectionObserver + motion are available, then removes it
 * on intersect. If JS never runs (slow network, blocked, disabled), the
 * page just shows normally instead of staying invisible forever.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.transitionDelay = `${delay}ms`;
    el.classList.add("opacity-0", "translate-y-8");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.remove("opacity-0", "translate-y-8");
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={cn("transition-all duration-700 ease-out", className)}>
      {children}
    </div>
  );
}
