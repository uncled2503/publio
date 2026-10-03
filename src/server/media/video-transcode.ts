import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Re-encodes a video to H.264/AAC MP4 — used when the source codec (e.g.
 * VP9, AV1) isn't one Instagram's Graph API accepts (see
 * REEL_VIDEO_SPEC.allowedVideoCodecs). Writes to a temp file rather than
 * piping ffmpeg's stdout: `-movflags +faststart` needs to seek back and
 * rewrite the moov atom after encoding, which a pipe can't do.
 */

export class FfmpegUnavailableError extends Error {
  constructor() {
    super("ffmpeg is not installed or not on PATH");
    this.name = "FfmpegUnavailableError";
  }
}

export class TranscodeError extends Error {}

export async function transcodeToH264(
  url: string,
  hasAudio: boolean,
  timeoutMs = 10 * 60_000,
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "publio-transcode-"));
  const outputPath = path.join(dir, `${randomUUID()}.mp4`);

  try {
    await new Promise<void>((resolve, reject) => {
      // Passed as argv elements (not through a shell), safe even though
      // `url` is derived from a user-controlled storage key.
      const child = spawn("ffmpeg", [
        "-i",
        url,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        ...(hasAudio ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"]),
        "-movflags",
        "+faststart",
        "-y",
        outputPath,
      ]);

      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill("SIGKILL");
        reject(new TranscodeError("ffmpeg timed out"));
      }, timeoutMs);

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
        if (code !== 0) {
          reject(new TranscodeError(`ffmpeg exited with code ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        resolve();
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
