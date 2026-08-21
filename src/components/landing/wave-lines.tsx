/**
 * Faint purple wave lines that drift down the entire page as an ambient
 * texture. Built as a tiling SVG pattern (not a fixed-height graphic) so it
 * covers any page length without measuring it — the tile repeats down the
 * `absolute inset-0` layer this is meant to sit behind page content in.
 */
export function WaveLines() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id="publio-wave-lines"
          width="720"
          height="1100"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M-100,180 C80,80 260,280 440,180 C620,80 800,280 980,180"
            fill="none"
            stroke="var(--brand-via)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M-140,760 C40,660 220,860 400,760 C580,660 760,860 940,760"
            fill="none"
            stroke="var(--brand-from)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#publio-wave-lines)" opacity="0.16" />
    </svg>
  );
}
