import { cn } from "@/lib/utils";

const COLORS = {
  from: "var(--brand-from)",
  via: "var(--brand-via)",
  to: "var(--brand-to)",
} as const;

function SnakeFade({ id, stroke }: { id: string; stroke: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={stroke} stopOpacity="0" />
      <stop offset="20%" stopColor={stroke} stopOpacity="1" />
      <stop offset="80%" stopColor={stroke} stopOpacity="1" />
      <stop offset="100%" stopColor={stroke} stopOpacity="0" />
    </linearGradient>
  );
}

/**
 * A faint, softly-glowing purple "snake" that rides the *exact* curve of a
 * `WaveDivider` seam — same path data and fixed height (h-16 / md:h-24) as
 * `wave-divider.tsx`'s own SVG, so it traces the section-change ripple
 * itself rather than an independent shape placed near it. A near-invisible
 * base track sits on the curve at all times, plus a brighter segment that
 * crawls along it via stroke-dashoffset (pathLength-normalized, so the
 * fractions read the same regardless of curve length) — that's the only
 * animated part; the shape itself doesn't morph, since that would drift it
 * off the divider's static curve.
 *
 * Render as a sibling of the `WaveDivider` (after it in markup order)
 * inside a shared `relative` wrapper so it sits exactly on top of that seam
 * — deliberately no negative z-index, since the divider's own background
 * would otherwise paint over and hide it. Pure SVG + CSS, no JS, and
 * respects `prefers-reduced-motion` via the shared `.snake-base` /
 * `.snake-highlight` rules in globals.css.
 */
export function SeamSnake({
  id,
  flip = false,
  color,
  direction,
  dashLength = 16,
  dashDuration = 7,
}: {
  id: string;
  flip?: boolean;
  color: keyof typeof COLORS;
  direction: "ltr" | "rtl";
  dashLength?: number;
  dashDuration?: number;
}) {
  const stroke = COLORS[color];
  const fadeId = `seam-fade-${id}`;
  const d = "M0,32 C240,96 480,96 720,64 C960,32 1200,0 1440,32";

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-16 w-full select-none md:h-24",
        flip && "-scale-x-100",
      )}
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
    >
      <defs>
        <SnakeFade id={fadeId} stroke={stroke} />
      </defs>
      <path
        className="snake-base"
        d={d}
        fill="none"
        stroke={`url(#${fadeId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.12"
      />
      <path
        className="snake-highlight"
        d={d}
        fill="none"
        stroke={`url(#${fadeId})`}
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.45"
        pathLength={100}
        strokeDasharray={`${dashLength} ${100 - dashLength}`}
        style={{
          animation: `publio-snake-dash ${dashDuration}s linear infinite ${
            direction === "rtl" ? "reverse" : "normal"
          }`,
        }}
      />
    </svg>
  );
}
