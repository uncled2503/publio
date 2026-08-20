import { cn } from "@/lib/utils";

/**
 * A full-width SVG wave used as the seam between two landing-page sections.
 * `bgClassName` is a `bg-*` utility matching the section *before* the wave;
 * `fillClassName` is a `text-*` utility (the SVG uses currentColor) matching
 * the section *after* it — the curve reads as the "after" color cutting up
 * into the "before" color's band. Without a background on the wrapper
 * itself the curve has nothing to contrast against and just disappears.
 */
export function WaveDivider({
  bgClassName,
  fillClassName,
  flip = false,
  className,
}: {
  bgClassName: string;
  fillClassName: string;
  flip?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("relative w-full overflow-hidden leading-[0]", bgClassName, className)}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={cn("h-16 w-full md:h-24", flip && "-scale-y-100", fillClassName)}
      >
        <path
          d="M0,32 C240,96 480,96 720,64 C960,32 1200,0 1440,32 L1440,120 L0,120 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
