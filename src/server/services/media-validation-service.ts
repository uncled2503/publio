import { IMAGE_SPEC, REEL_VIDEO_SPEC } from "@/server/media/instagram-media-specs";

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface MediaValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  normalizedMetadata: Record<string, unknown>;
}

export interface ImageMetadataInput {
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export interface VideoMetadataInput {
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  durationSeconds: number;
  videoCodec: string | null;
  audioCodec: string | null;
  frameRate: number | null;
}

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * validateForInstagram(asset, publicationType) from §11 of the spec.
 * Pure functions — no I/O, no DB — so they're trivially unit-testable and
 * reusable both by the async media-processing job and, later, by the
 * composer for an instant client-facing check before scheduling.
 */
export const MediaValidationService = {
  validateImage(input: ImageMetadataInput): MediaValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    if (!(IMAGE_SPEC.allowedMimeTypes as readonly string[]).includes(input.mimeType)) {
      errors.push({
        code: "UNSUPPORTED_FORMAT",
        message: `Formato ${input.mimeType} não é suportado. O Instagram só aceita imagens JPEG.`,
      });
    }

    if (input.sizeBytes > IMAGE_SPEC.maxFileSizeBytes) {
      errors.push({
        code: "FILE_TOO_LARGE",
        message: `O arquivo tem ${mb(input.sizeBytes)}MB; o limite do Instagram é ${mb(IMAGE_SPEC.maxFileSizeBytes)}MB.`,
      });
    }

    if (input.width < IMAGE_SPEC.minWidthPx || input.width > IMAGE_SPEC.maxWidthPx) {
      errors.push({
        code: "INVALID_DIMENSIONS",
        message: `A largura de ${input.width}px está fora do intervalo aceito pelo Instagram (${IMAGE_SPEC.minWidthPx}–${IMAGE_SPEC.maxWidthPx}px).`,
      });
    }

    const aspectRatio = input.height > 0 ? input.width / input.height : 0;
    if (aspectRatio < IMAGE_SPEC.minAspectRatio || aspectRatio > IMAGE_SPEC.maxAspectRatio) {
      errors.push({
        code: "UNSUPPORTED_ASPECT_RATIO",
        message: `A proporção ${aspectRatio.toFixed(2)}:1 está fora do intervalo aceito (${IMAGE_SPEC.minAspectRatio.toFixed(2)}:1 a ${IMAGE_SPEC.maxAspectRatio}:1). O Instagram pode cortar a imagem.`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      normalizedMetadata: {
        width: input.width,
        height: input.height,
        aspectRatio,
        sizeBytes: input.sizeBytes,
        mimeType: input.mimeType,
      },
    };
  },

  validateReel(input: VideoMetadataInput): MediaValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    if (!(REEL_VIDEO_SPEC.allowedContainerMimeTypes as readonly string[]).includes(input.mimeType)) {
      errors.push({
        code: "UNSUPPORTED_FORMAT",
        message: `Formato ${input.mimeType} não suportado. Use MP4 ou MOV.`,
      });
    }

    if (input.sizeBytes > REEL_VIDEO_SPEC.maxFileSizeBytes) {
      errors.push({
        code: "FILE_TOO_LARGE",
        message: `O arquivo tem ${mb(input.sizeBytes)}MB; o limite do Instagram para Reels é ${mb(REEL_VIDEO_SPEC.maxFileSizeBytes)}MB.`,
      });
    }

    if (
      input.durationSeconds < REEL_VIDEO_SPEC.minDurationSeconds ||
      input.durationSeconds > REEL_VIDEO_SPEC.maxDurationSeconds
    ) {
      errors.push({
        code: "INVALID_DURATION",
        message: `A duração de ${input.durationSeconds.toFixed(1)}s está fora do intervalo aceito (${REEL_VIDEO_SPEC.minDurationSeconds}s a ${REEL_VIDEO_SPEC.maxDurationSeconds / 60} minutos).`,
      });
    }

    const aspectRatio = input.height > 0 ? input.width / input.height : 0;
    if (aspectRatio < REEL_VIDEO_SPEC.minAspectRatio || aspectRatio > REEL_VIDEO_SPEC.maxAspectRatio) {
      errors.push({
        code: "UNSUPPORTED_ASPECT_RATIO",
        message: `A proporção ${aspectRatio.toFixed(2)}:1 está fora do intervalo aceito pelo Instagram.`,
      });
    } else if (Math.abs(aspectRatio - REEL_VIDEO_SPEC.recommendedAspectRatio) > 0.05) {
      warnings.push({
        code: "ASPECT_RATIO_NOT_RECOMMENDED",
        message: `Proporção recomendada para Reels é 9:16 (${REEL_VIDEO_SPEC.recommendedAspectRatio.toFixed(2)}:1). O vídeo pode aparecer cortado ou com barras.`,
      });
    }

    if (input.width > REEL_VIDEO_SPEC.maxHorizontalPixels) {
      warnings.push({
        code: "RESOLUTION_ABOVE_RECOMMENDED",
        message: `Largura de ${input.width}px acima do recomendado (${REEL_VIDEO_SPEC.maxHorizontalPixels}px). O Instagram pode reduzir a resolução.`,
      });
    }

    if (input.videoCodec && !(REEL_VIDEO_SPEC.allowedVideoCodecs as readonly string[]).includes(input.videoCodec)) {
      errors.push({
        code: "UNSUPPORTED_VIDEO_CODEC",
        message: `Codec de vídeo "${input.videoCodec}" não é suportado. Use H.264 ou HEVC.`,
      });
    }
    if (input.audioCodec && !(REEL_VIDEO_SPEC.allowedAudioCodecs as readonly string[]).includes(input.audioCodec)) {
      warnings.push({
        code: "UNSUPPORTED_AUDIO_CODEC",
        message: `Codec de áudio "${input.audioCodec}" pode não ser suportado. O recomendado é AAC.`,
      });
    }

    if (input.frameRate !== null && (input.frameRate < REEL_VIDEO_SPEC.minFrameRate || input.frameRate > REEL_VIDEO_SPEC.maxFrameRate)) {
      warnings.push({
        code: "FRAME_RATE_OUT_OF_RANGE",
        message: `Taxa de quadros de ${input.frameRate}fps fora do intervalo recomendado (${REEL_VIDEO_SPEC.minFrameRate}–${REEL_VIDEO_SPEC.maxFrameRate}fps).`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      normalizedMetadata: {
        width: input.width,
        height: input.height,
        aspectRatio,
        durationSeconds: input.durationSeconds,
        sizeBytes: input.sizeBytes,
        mimeType: input.mimeType,
        videoCodec: input.videoCodec,
        audioCodec: input.audioCodec,
        frameRate: input.frameRate,
      },
    };
  },
};
