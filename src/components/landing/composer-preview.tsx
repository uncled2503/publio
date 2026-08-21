"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const STATES = [
  {
    key: "image",
    src: "/composer-image.webp",
    alt: "Publicação de imagem única no compositor do Publio",
    chip: "Imagem",
  },
  {
    key: "carousel",
    src: "/composer-carousel.webp",
    alt: "Publicação em carrossel no compositor do Publio",
    chip: "Carrossel",
    chip2: "3 itens",
  },
  {
    key: "reel",
    src: "/composer-reel.webp",
    alt: "Publicação de Reel no compositor do Publio",
    chip: "Reel",
    chip2: "0:18",
  },
] as const;

const ROTATE_MS = 4500;

/**
 * Auto-rotating post/carousel/Reel preview for the Compositor showcase.
 * Three real preview renders are stacked and cross-faded via CSS opacity +
 * translate (no carousel library) — `index` just picks which one is "on
 * top"; the transition is entirely declarative. Rotation pauses on hover
 * and never starts if the visitor prefers reduced motion (first frame
 * stays put rather than swapping without animation, per the calmer of the
 * two options reduced-motion allows here).
 */
export function ComposerPreview() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % STATES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const active = STATES[index];

  return (
    <Card
      className="mx-auto w-full max-w-sm overflow-hidden py-0 shadow-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="bg-brand-gradient size-6 shrink-0 rounded-full" />
        <span className="text-xs font-medium">sua_marca</span>
      </div>

      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {STATES.map((state, i) => (
          <Image
            key={state.key}
            src={state.src}
            alt={state.alt}
            fill
            quality={90}
            sizes="(min-width: 1024px) 384px, 90vw"
            className={cn(
              "object-cover transition-all duration-[400ms] ease-out",
              i === index ? "opacity-100" : "translate-y-1 opacity-0",
            )}
          />
        ))}

        {active.key === "carousel" && (
          <>
            <span className="absolute top-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
              1 / 3
            </span>
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-background/70 p-1 text-foreground backdrop-blur-sm"
            >
              <ChevronLeft className="size-3.5" />
            </span>
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-background/70 p-1 text-foreground backdrop-blur-sm"
            >
              <ChevronRight className="size-3.5" />
            </span>
          </>
        )}

        {active.key === "reel" && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm"
          >
            <Play className="size-4 fill-foreground text-foreground" />
          </span>
        )}
      </div>

      <CardContent className="flex flex-col gap-1.5 p-3">
        <div className="h-2 w-4/5 rounded-full bg-accent" />
        <div className="h-2 w-3/5 rounded-full bg-accent" />
        <div className="mt-1.5 flex gap-2">
          <span className="rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">
            {active.chip}
          </span>
          {"chip2" in active && (
            <span className="rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">
              {active.chip2}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
