import { spawn } from "node:child_process";

/**
 * Extracts real video metadata via ffprobe, reading directly from the
 * asset's public storage URL (no need to download a potentially
 * multi-hundred-MB file into the worker's memory first — ffprobe streams
 * it). Runs on the worker machine, not in a Vercel function; see
 * docs/adr/ADR-006-zero-cost-infrastructure.md for why ffmpeg lives there.
 */

export interface VideoProbeResult {
  durationSeconds: number;
  width: number;
  height: number;
  videoCodec: string | null;
  audioCodec: string | null;
  frameRate: number | null;
}

export class FfprobeUnavailableError extends Error {
  constructor() {
    super("ffprobe is not installed or not on PATH");
    this.name = "FfprobeUnavailableError";
  }
}

export class FfprobeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FfprobeParseError";
  }
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { duration?: string };
}

export function probeVideo(url: string, timeoutMs = 30_000): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    // Passed as an argv element (not through a shell), so this is safe
    // even though `url` is derived from user-controlled storage keys.
    const child = spawn("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      url,
    ]);

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new FfprobeParseError("ffprobe timed out"));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err.code === "ENOENT") reject(new FfprobeUnavailableError());
      else reject(err);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new FfprobeParseError(`ffprobe exited with code ${code}: ${stderr.slice(0, 500)}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as FfprobeOutput;
        const videoStream = parsed.streams?.find((s) => s.codec_type === "video");
        const audioStream = parsed.streams?.find((s) => s.codec_type === "audio");

        if (!videoStream || !videoStream.width || !videoStream.height) {
          reject(new FfprobeParseError("No usable video stream found"));
          return;
        }

        const durationRaw = parsed.format?.duration ?? videoStream.duration ?? "0";
        const durationSeconds = Number.parseFloat(durationRaw);

        let frameRate: number | null = null;
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
          if (num !== undefined && den) frameRate = num / den;
        }

        resolve({
          durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
          width: videoStream.width,
          height: videoStream.height,
          videoCodec: videoStream.codec_name ?? null,
          audioCodec: audioStream?.codec_name ?? null,
          frameRate,
        });
      } catch (err) {
        reject(new FfprobeParseError(`Failed to parse ffprobe output: ${(err as Error).message}`));
      }
    });
  });
}
