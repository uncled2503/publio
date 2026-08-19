import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  NotFound,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/server/config/env";
import type { StorageProvider } from "./types";

const DEFAULT_UPLOAD_URL_TTL_SECONDS = 5 * 60;

/**
 * S3-compatible implementation — works unmodified against Cloudflare R2,
 * AWS S3, or a local MinIO instance, since all three speak the same API.
 * See docs/adr/ADR-006-zero-cost-infrastructure.md for why R2 is the
 * default choice.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async getUploadUrl(params: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      ContentType: params.contentType,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: params.expiresInSeconds ?? DEFAULT_UPLOAD_URL_TTL_SECONDS,
    });
  }

  getPublicUrl(key: string): string {
    const base = env.S3_PUBLIC_BASE_URL || `${env.S3_ENDPOINT}/${env.S3_BUCKET}`;
    return `${base.replace(/\/$/, "")}/${key}`;
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Storage object has no body: ${key}`);
    return Buffer.from(bytes);
  }

  async getObjectRange(key: string, byteCount: number): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Range: `bytes=0-${byteCount - 1}` }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Storage object has no body: ${key}`);
    return Buffer.from(bytes);
  }

  async headObject(key: string): Promise<{ sizeBytes: number; contentType: string | null } | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      );
      return {
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
      };
    } catch (error) {
      if (error instanceof NotFound) return null;
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  }
}
