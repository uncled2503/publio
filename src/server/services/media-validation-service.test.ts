import { describe, expect, it } from "vitest";

import { MediaValidationService } from "./media-validation-service";

describe("MediaValidationService.validateImage", () => {
  const validImage = { mimeType: "image/jpeg", sizeBytes: 2 * 1024 * 1024, width: 1080, height: 1080 };

  it("accepts a well-formed square JPEG within limits", () => {
    const result = MediaValidationService.validateImage(validImage);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-JPEG formats", () => {
    const result = MediaValidationService.validateImage({ ...validImage, mimeType: "image/png" });
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("UNSUPPORTED_FORMAT");
  });

  it("rejects files over 8MB", () => {
    const result = MediaValidationService.validateImage({ ...validImage, sizeBytes: 9 * 1024 * 1024 });
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("FILE_TOO_LARGE");
  });

  it("rejects width outside 320-1440px", () => {
    expect(
      MediaValidationService.validateImage({ ...validImage, width: 100, height: 100 }).errors.map((e) => e.code),
    ).toContain("INVALID_DIMENSIONS");
    expect(
      MediaValidationService.validateImage({ ...validImage, width: 2000, height: 2000 }).errors.map((e) => e.code),
    ).toContain("INVALID_DIMENSIONS");
  });

  it("rejects an aspect ratio outside 4:5 to 1.91:1", () => {
    // Extremely tall (portrait beyond 4:5)
    const tooTall = MediaValidationService.validateImage({ ...validImage, width: 500, height: 2000 });
    expect(tooTall.errors.map((e) => e.code)).toContain("UNSUPPORTED_ASPECT_RATIO");

    // Extremely wide (landscape beyond 1.91:1)
    const tooWide = MediaValidationService.validateImage({ ...validImage, width: 1440, height: 400 });
    expect(tooWide.errors.map((e) => e.code)).toContain("UNSUPPORTED_ASPECT_RATIO");
  });

  it("accepts the boundary aspect ratios", () => {
    // 4:5 portrait boundary
    expect(MediaValidationService.validateImage({ ...validImage, width: 800, height: 1000 }).valid).toBe(true);
    // 1.91:1 landscape boundary
    expect(MediaValidationService.validateImage({ ...validImage, width: 1000, height: 524 }).valid).toBe(true);
  });

  it("returns normalized metadata including the computed aspect ratio", () => {
    const result = MediaValidationService.validateImage(validImage);
    expect(result.normalizedMetadata.aspectRatio).toBe(1);
  });
});

describe("MediaValidationService.validateReel", () => {
  const validReel = {
    mimeType: "video/mp4",
    sizeBytes: 20 * 1024 * 1024,
    width: 1080,
    height: 1920,
    durationSeconds: 20,
    videoCodec: "h264",
    audioCodec: "aac",
    frameRate: 30,
  };

  it("accepts a well-formed 9:16 Reel", () => {
    const result = MediaValidationService.validateReel(validReel);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("rejects duration under 3s or over 15 minutes", () => {
    expect(
      MediaValidationService.validateReel({ ...validReel, durationSeconds: 1 }).errors.map((e) => e.code),
    ).toContain("INVALID_DURATION");
    expect(
      MediaValidationService.validateReel({ ...validReel, durationSeconds: 901 }).errors.map((e) => e.code),
    ).toContain("INVALID_DURATION");
  });

  it("rejects files over 300MB", () => {
    const result = MediaValidationService.validateReel({ ...validReel, sizeBytes: 301 * 1024 * 1024 });
    expect(result.errors.map((e) => e.code)).toContain("FILE_TOO_LARGE");
  });

  it("rejects unsupported video codecs", () => {
    const result = MediaValidationService.validateReel({ ...validReel, videoCodec: "vp9" });
    expect(result.errors.map((e) => e.code)).toContain("UNSUPPORTED_VIDEO_CODEC");
  });

  it("warns (does not reject) for a non-9:16 but still in-range aspect ratio", () => {
    const result = MediaValidationService.validateReel({ ...validReel, width: 1080, height: 1080 });
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain("ASPECT_RATIO_NOT_RECOMMENDED");
  });

  it("rejects an aspect ratio truly out of Meta's accepted range", () => {
    const result = MediaValidationService.validateReel({ ...validReel, width: 20, height: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("UNSUPPORTED_ASPECT_RATIO");
  });

  it("warns for an unsupported audio codec rather than rejecting", () => {
    const result = MediaValidationService.validateReel({ ...validReel, audioCodec: "mp3" });
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain("UNSUPPORTED_AUDIO_CODEC");
  });
});
