import { spawn } from "node:child_process";

/**
 * Extracts a single JPEG frame from a video URL via ffmpeg, for use as a
 * media-library thumbnail. Best-effort: callers should treat failure as
 * non-fatal (the video is still usable without a preview image).
 */

export class FfmpegUnavailableError extends Error {
  constructor() {
    super("ffmpeg is not installed or not on PATH");
    this.name = "FfmpegUnavailableError";
  }
}

export class FfmpegThumbnailError extends Error {}

export function extractThumbnail(url: string, timeoutMs = 30_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Passed as argv elements (not through a shell), safe even though `url`
    // is derived from a user-controlled storage key.
    const child = spawn("ffmpeg", [
      "-ss",
      "0",
      "-i",
      url,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1",
    ]);

    const chunks: Buffer[] = [];
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new FfmpegThumbnailError("ffmpeg timed out"));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err.code === "ENOENT") reject(new FfmpegUnavailableError());
      else reject(err);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const buffer = Buffer.concat(chunks);
      if (code !== 0 || buffer.length === 0) {
        reject(new FfmpegThumbnailError(`ffmpeg exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(buffer);
    });
  });
}
