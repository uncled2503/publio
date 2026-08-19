/**
 * Storage abstraction (§12, §21). Nothing outside src/server/storage/**
 * should import an S3 SDK client directly — this interface is what keeps
 * Publio portable across R2 / S3 / MinIO without touching call sites.
 */
export interface StorageProvider {
  /** A presigned URL the browser can PUT the file bytes to directly. */
  getUploadUrl(params: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<string>;

  /** Publicly reachable URL for the object — this is what gets handed to Meta. */
  getPublicUrl(key: string): string;

  /** Fetches the object's bytes. Used by media processing for small files (images). */
  getObjectBuffer(key: string): Promise<Buffer>;

  /** Fetches only the first `byteCount` bytes — for sniffing large (video) files without downloading them whole. */
  getObjectRange(key: string, byteCount: number): Promise<Buffer>;

  /** Confirms an object exists and returns its actual size/content-type as stored. */
  headObject(key: string): Promise<{ sizeBytes: number; contentType: string | null } | null>;

  deleteObject(key: string): Promise<void>;
}
