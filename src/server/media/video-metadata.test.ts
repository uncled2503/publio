import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FfprobeUnavailableError, probeVideo } from "./video-metadata";

function ffmpegAvailable(): boolean {
  try {
    const result = spawnSync("ffmpeg", ["-version"]);
    return result.status === 0;
  } catch {
    return false;
  }
}

const hasFfmpeg = ffmpegAvailable();
const describeIfFfmpeg = hasFfmpeg ? describe : describe.skip;

describeIfFfmpeg("probeVideo (integration, requires ffmpeg/ffprobe on PATH)", () => {
  let dir: string;
  let videoPath: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "publio-ffprobe-test-"));
    // libx264 startup + synthesis can take a while on a cold run.
    videoPath = path.join(dir, "sample.mp4");
    // Generates a 2-second, 320x240, 25fps synthetic H.264/AAC test video —
    // no external fixture files needed, ffmpeg synthesizes it from scratch.
    const result = spawnSync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=duration=2:size=320x240:rate=25",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=1000:duration=2",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ]);
    if (result.status !== 0) {
      throw new Error(`Failed to generate test video: ${result.stderr?.toString()}`);
    }
  }, 30_000);

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("extracts real duration, dimensions, and codecs from a local file path", async () => {
    const result = await probeVideo(videoPath);

    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
    expect(result.durationSeconds).toBeGreaterThan(1.5);
    expect(result.durationSeconds).toBeLessThan(2.5);
    expect(result.videoCodec).toBe("h264");
    expect(result.audioCodec).toBe("aac");
    expect(result.frameRate).toBeCloseTo(25, 0);
  });

  it("rejects a nonexistent file with a parse error, not a hang", async () => {
    await expect(probeVideo(path.join(dir, "does-not-exist.mp4"))).rejects.toThrow();
  });
});

describe("probeVideo error handling", () => {
  it("throws FfprobeUnavailableError when the binary genuinely does not exist", async () => {
    // Temporarily corrupt PATH so spawn("ffprobe", ...) cannot resolve it,
    // regardless of whether this machine has ffmpeg installed.
    const originalPath = process.env.PATH;
    process.env.PATH = "";
    try {
      await expect(probeVideo("https://example.com/video.mp4")).rejects.toBeInstanceOf(
        FfprobeUnavailableError,
      );
    } finally {
      process.env.PATH = originalPath;
    }
  });
});
