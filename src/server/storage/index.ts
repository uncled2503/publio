import type { StorageProvider } from "./types";
import { S3StorageProvider } from "./s3-provider";

let instance: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (!instance) {
    instance = new S3StorageProvider();
  }
  return instance;
}

export type { StorageProvider } from "./types";
