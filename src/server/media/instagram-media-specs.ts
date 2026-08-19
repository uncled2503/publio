/**
 * Instagram media technical specifications, verified against Meta's
 * official reference on 2026-08-17:
 * developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
 *
 * Centralized here per §11 of the spec — no magic numbers duplicated
 * elsewhere. If Meta changes these, this is the only file that needs to
 * change (plus a note in docs/instagram-integration.md).
 */

export const IMAGE_SPEC = {
  allowedMimeTypes: ["image/jpeg"] as const,
  maxFileSizeBytes: 8 * 1024 * 1024, // 8 MB
  minWidthPx: 320,
  maxWidthPx: 1440,
  // Instagram crops outside this range rather than rejecting outright in
  // the app, but the Graph API publishing pipeline rejects it — treat as
  // a hard error here so the user finds out at upload time, not publish time.
  minAspectRatio: 4 / 5, // 0.8 (portrait limit)
  maxAspectRatio: 1.91, // landscape limit
} as const;

export const REEL_VIDEO_SPEC = {
  allowedContainerMimeTypes: ["video/mp4", "video/quicktime"] as const, // MP4, MOV
  allowedVideoCodecs: ["h264", "hevc"] as const,
  allowedAudioCodecs: ["aac"] as const,
  maxFileSizeBytes: 300 * 1024 * 1024, // 300 MB
  minDurationSeconds: 3,
  maxDurationSeconds: 15 * 60, // 15 minutes
  minAspectRatio: 0.01,
  maxAspectRatio: 10,
  recommendedAspectRatio: 9 / 16,
  maxHorizontalPixels: 1920,
  minFrameRate: 23,
  maxFrameRate: 60,
  maxAudioSampleRateHz: 48_000,
  maxVideoBitrateMbps: 25,
} as const;

export const CAROUSEL_SPEC = {
  minItems: 2,
  maxItems: 10,
} as const;
