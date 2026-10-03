import { prisma } from "@/server/db/prisma";
import { getStorageProvider } from "@/server/storage";
import { logger } from "@/server/observability/logger";
import {
  MediaValidationService,
  type MediaValidationResult,
} from "@/server/services/media-validation-service";
import { sniffMediaMimeType } from "./sniff-mime";
import { getJpegDimensions } from "./jpeg-dimensions";
import { FfprobeParseError, FfprobeUnavailableError, probeVideo } from "./video-metadata";
import { extractThumbnail } from "./video-thumbnail";
import { transcodeToH264 } from "./video-transcode";

const SNIFF_BYTES = 64 * 1024;

interface ExtractedMetadata {
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  aspectRatio: number;
  durationSeconds?: number;
  videoCodec?: string | null;
  audioCodec?: string | null;
  thumbnailKey?: string | null;
}

/**
 * The async media-processing pipeline (§12): detect the real file type
 * from content (never the client-reported MIME), extract metadata, run it
 * through MediaValidationService, and persist the result. Runs on the
 * worker (BullMQ), triggered after a successful direct-to-storage upload.
 */
export async function processMediaAsset(mediaAssetId: string): Promise<void> {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
  if (!asset || asset.deletedAt) {
    logger.warn("media.processing.asset_missing", { mediaAssetId });
    return;
  }

  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { processingStatus: "PROCESSING" },
  });

  const storage = getStorageProvider();

  try {
    const head = await storage.getObjectRange(asset.storageKey, SNIFF_BYTES);
    const sniffed = sniffMediaMimeType(head);

    if (!sniffed) {
      await markInvalid(asset.id, [
        {
          code: "UNRECOGNIZED_FILE_TYPE",
          message: "O arquivo não é uma imagem JPEG ou um vídeo MP4/MOV reconhecível.",
        },
      ]);
      return;
    }

    if (sniffed === "image/jpeg") {
      await processImage(asset.id, asset.storageKey, storage);
    } else {
      await processVideo(asset.id, asset.storageKey, sniffed, storage);
    }
  } catch (error) {
    logger.error("media.processing.unexpected_error", {
      mediaAssetId: asset.id,
      message: error instanceof Error ? error.message : String(error),
    });
    await markInvalid(asset.id, [
      { code: "PROCESSING_ERROR", message: "Ocorreu um erro inesperado ao processar este arquivo." },
    ]);
  }
}

async function processImage(
  mediaAssetId: string,
  storageKey: string,
  storage: ReturnType<typeof getStorageProvider>,
): Promise<void> {
  const buffer = await storage.getObjectBuffer(storageKey);
  const dims = getJpegDimensions(buffer);

  if (!dims) {
    await markInvalid(mediaAssetId, [
      { code: "UNREADABLE_IMAGE", message: "Não foi possível ler as dimensões desta imagem." },
    ]);
    return;
  }

  const result = MediaValidationService.validateImage({
    mimeType: "image/jpeg",
    sizeBytes: buffer.length,
    width: dims.width,
    height: dims.height,
  });

  await finalize(mediaAssetId, result, {
    mimeType: "image/jpeg",
    sizeBytes: buffer.length,
    width: dims.width,
    height: dims.height,
    aspectRatio: dims.width / dims.height,
  });
}

async function processVideo(
  mediaAssetId: string,
  storageKey: string,
  initialMimeType: "video/mp4" | "video/quicktime",
  storage: ReturnType<typeof getStorageProvider>,
): Promise<void> {
  const publicUrl = storage.getPublicUrl(storageKey);

  let probe;
  try {
    probe = await probeVideo(publicUrl);
  } catch (error) {
    if (error instanceof FfprobeUnavailableError) {
      logger.error("media.processing.ffprobe_unavailable", { mediaAssetId });
      await markInvalid(mediaAssetId, [
        {
          code: "PROCESSING_UNAVAILABLE",
          message: "O worker não conseguiu analisar este vídeo (ffprobe indisponível). Verifique a instalação do ffmpeg na máquina do worker.",
        },
      ]);
      return;
    }
    if (error instanceof FfprobeParseError) {
      await markInvalid(mediaAssetId, [
        { code: "UNREADABLE_VIDEO", message: "Não foi possível ler os metadados deste vídeo." },
      ]);
      return;
    }
    throw error;
  }

  const head = await storage.headObject(storageKey);
  let mimeType = initialMimeType;
  let sizeBytes = head?.sizeBytes ?? 0;

  let result = MediaValidationService.validateReel({
    mimeType,
    sizeBytes,
    width: probe.width,
    height: probe.height,
    durationSeconds: probe.durationSeconds,
    videoCodec: probe.videoCodec,
    audioCodec: probe.audioCodec,
    frameRate: probe.frameRate,
  });

  // The codec itself is the one thing we can fix instead of just rejecting:
  // re-encode to H.264/AAC and overwrite the stored object in place, then
  // re-validate. Anything else wrong with the file (duration, aspect
  // ratio, size) is left for the user to fix.
  if (result.errors.some((e) => e.code === "UNSUPPORTED_VIDEO_CODEC")) {
    try {
      const transcoded = await transcodeToH264(publicUrl, !!probe.audioCodec);
      await storage.putObject(storageKey, transcoded, "video/mp4");

      mimeType = "video/mp4";
      sizeBytes = transcoded.length;
      probe = {
        ...probe,
        videoCodec: "h264",
        audioCodec: probe.audioCodec ? "aac" : null,
      };

      result = MediaValidationService.validateReel({
        mimeType,
        sizeBytes,
        width: probe.width,
        height: probe.height,
        durationSeconds: probe.durationSeconds,
        videoCodec: probe.videoCodec,
        audioCodec: probe.audioCodec,
        frameRate: probe.frameRate,
      });

      logger.info("media.processing.transcoded", { mediaAssetId, sizeBytes });
    } catch (error) {
      // Non-fatal — falls through with the original (invalid) result, same
      // as before this codec-fixing step existed.
      logger.warn("media.processing.transcode_failed", {
        mediaAssetId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let thumbnailKey: string | null = null;
  try {
    // Re-reads from `publicUrl` at the same key, so this picks up the
    // transcoded bytes above when that ran.
    const thumbnail = await extractThumbnail(publicUrl);
    thumbnailKey = `${storageKey}-thumb.jpg`;
    await storage.putObject(thumbnailKey, thumbnail, "image/jpeg");
  } catch (error) {
    // Non-fatal — the video is still usable without a preview image.
    logger.warn("media.processing.thumbnail_failed", {
      mediaAssetId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  await finalize(mediaAssetId, result, {
    mimeType,
    sizeBytes,
    width: probe.width,
    height: probe.height,
    aspectRatio: probe.width / probe.height,
    durationSeconds: probe.durationSeconds,
    videoCodec: probe.videoCodec,
    audioCodec: probe.audioCodec,
    thumbnailKey,
  });
}

async function finalize(
  mediaAssetId: string,
  result: MediaValidationResult,
  extracted: ExtractedMetadata,
): Promise<void> {
  await prisma.mediaAsset.update({
    where: { id: mediaAssetId },
    data: {
      processingStatus: result.valid ? "READY" : "INVALID",
      validation: result as never,
      mimeType: extracted.mimeType,
      sizeBytes: BigInt(Math.round(extracted.sizeBytes)),
      width: extracted.width,
      height: extracted.height,
      aspectRatio: extracted.aspectRatio,
      durationSeconds: extracted.durationSeconds ?? null,
      videoCodec: extracted.videoCodec ?? null,
      audioCodec: extracted.audioCodec ?? null,
      ...(extracted.thumbnailKey ? { metadata: { thumbnailKey: extracted.thumbnailKey } } : {}),
    },
  });

  logger.info("media.processing.completed", {
    mediaAssetId,
    valid: result.valid,
    errorCodes: result.errors.map((e) => e.code),
    warningCodes: result.warnings.map((w) => w.code),
  });
}

async function markInvalid(
  mediaAssetId: string,
  errors: Array<{ code: string; message: string }>,
): Promise<void> {
  await prisma.mediaAsset.update({
    where: { id: mediaAssetId },
    data: {
      processingStatus: "INVALID",
      validation: { valid: false, errors, warnings: [], normalizedMetadata: {} } as never,
    },
  });
  logger.warn("media.processing.invalid", { mediaAssetId, errorCodes: errors.map((e) => e.code) });
}
