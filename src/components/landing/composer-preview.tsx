"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
const LIKE_MIN_GAP_MS = 700;
const LIKE_MAX_GAP_MS = 1400;
const LIKE_MIN_DURATION_S = 2.2;
const LIKE_MAX_DURATION_S = 3;
const LIKE_BURST_CHANCE = 0.3;

// Hand-drawn heart path (lucide's "heart" glyph, viewBox 0 0 24 24) rendered
// as a plain <svg><path fill="#hex" /></svg> — no lucide-react component, no
// Tailwind fill-*/text-* utility class, nothing for a build to fail to
// generate. The fill is a literal SVG attribute on the path itself, so
// there is no CSS cascade for it to lose.
const HEART_PATH =
  "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5";

const LIKE_SIZES = [20, 24, 28] as const;
const LIKE_COLORS = ["#f43f5e", "#ec4899", "#fb7185"] as const;

type Like = {
  id: number;
  left: number;
  size: (typeof LIKE_SIZES)[number];
  color: (typeof LIKE_COLORS)[number];
  drift: number;
  rotFrom: number;
  rotTo: number;
  duration: number;
};

function randomLike(id: number, left: number): Like {
  return {
    id,
    left,
    size: LIKE_SIZES[Math.floor(Math.random() * LIKE_SIZES.length)],
    color: LIKE_COLORS[Math.floor(Math.random() * LIKE_COLORS.length)],
    drift: Math.random() * 56 - 28,
    rotFrom: Math.random() * 20 - 10,
    rotTo: Math.random() * 30 - 15,
    duration: LIKE_MIN_DURATION_S + Math.random() * (LIKE_MAX_DURATION_S - LIKE_MIN_DURATION_S),
  };
}

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
  const [likes, setLikes] = useState<Like[]>([]);
  const nextLikeId = useRef(0);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % STATES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  // Little "like" hearts pop up over the preview at a loose, uneven pace —
  // each one schedules its own removal and the next spawn, so the rhythm
  // never feels metronomic. Occasionally a second heart lands just after
  // the first, near it, like a couple of viewers liking in quick succession.
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const spawnOne = (left: number) => {
      const like = randomLike(nextLikeId.current++, left);
      setLikes((prev) => [...prev, like]);
      setTimeout(
        () => {
          setLikes((prev) => prev.filter((l) => l.id !== like.id));
        },
        like.duration * 1000 + 100,
      );
    };

    let spawnTimeout: ReturnType<typeof setTimeout>;
    const scheduleSpawn = () => {
      const gap = LIKE_MIN_GAP_MS + Math.random() * (LIKE_MAX_GAP_MS - LIKE_MIN_GAP_MS);
      spawnTimeout = setTimeout(() => {
        const left = 20 + Math.random() * 60;
        spawnOne(left);
        if (Math.random() < LIKE_BURST_CHANCE) {
          const companionLeft = Math.min(85, Math.max(10, left + (Math.random() * 22 - 11)));
          setTimeout(() => spawnOne(companionLeft), 150 + Math.random() * 150);
        }
        scheduleSpawn();
      }, gap);
    };
    scheduleSpawn();

    return () => clearTimeout(spawnTimeout);
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

        {likes.map((like) => (
          <svg
            key={like.id}
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={like.size}
            height={like.size}
            className="pointer-events-none absolute bottom-12"
            style={
              {
                left: `${like.left}%`,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
                willChange: "transform, opacity",
                animation: `publio-like-pop ${like.duration}s ease forwards`,
                "--like-drift": `${like.drift}px`,
                "--like-rot-from": `${like.rotFrom}deg`,
                "--like-rot-to": `${like.rotTo}deg`,
              } as CSSProperties
            }
          >
            <path d={HEART_PATH} fill={like.color} />
          </svg>
        ))}
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
