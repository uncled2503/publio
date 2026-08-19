import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

import { env } from "@/server/config/env";

/**
 * TokenVault — authenticated encryption for secrets at rest (Instagram
 * access tokens, and any other third-party credential we persist).
 *
 * Algorithm: AES-256-GCM (authenticated encryption — tampering with the
 * ciphertext is detected, unlike plain AES-CBC or base64 "encoding").
 *
 * Envelope format (all fields base64, joined with "."):
 *   <keyId>.<iv>.<authTag>.<ciphertext>
 *
 * Key rotation: the active key is TOKEN_ENCRYPTION_KEY (keyId "current").
 * To rotate: generate a new 32-byte key, deploy it as TOKEN_ENCRYPTION_KEY
 * while moving the old value into TOKEN_ENCRYPTION_KEY_PREVIOUS (keyId
 * "previous") so existing rows still decrypt. Run a maintenance pass that
 * reads every encrypted column and calls rotate() to re-encrypt under the
 * current key, then remove TOKEN_ENCRYPTION_KEY_PREVIOUS in the next
 * deploy. See docs/adr/ADR-003-token-encryption.md.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

type KeyId = "current" | "previous";

function loadKeys(): Map<KeyId, Buffer> {
  const keys = new Map<KeyId, Buffer>();
  keys.set("current", Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64"));
  if (env.TOKEN_ENCRYPTION_KEY_PREVIOUS) {
    keys.set("previous", Buffer.from(env.TOKEN_ENCRYPTION_KEY_PREVIOUS, "base64"));
  }
  return keys;
}

export class TokenVault {
  private readonly keys: Map<KeyId, Buffer>;

  constructor(keys: Map<KeyId, Buffer> = loadKeys()) {
    for (const [id, key] of keys) {
      if (key.length !== 32) {
        throw new Error(`TokenVault: key "${id}" must be exactly 32 bytes`);
      }
    }
    this.keys = keys;
  }

  encrypt(plaintext: string): string {
    const keyId: KeyId = "current";
    const key = this.keys.get(keyId);
    if (!key) throw new Error("TokenVault: no current encryption key configured");

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      keyId,
      iv.toString("base64"),
      authTag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(".");
  }

  decrypt(envelope: string): string {
    const parts = envelope.split(".");
    if (parts.length !== 4) {
      throw new Error("TokenVault: malformed ciphertext envelope");
    }
    const [keyId, ivB64, authTagB64, ciphertextB64] = parts as [string, string, string, string];

    const key = this.keys.get(keyId as KeyId);
    if (!key) {
      throw new Error(`TokenVault: unknown key id "${keyId}" — cannot decrypt`);
    }

    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return plaintext.toString("utf8");
  }

  /** Re-encrypts an envelope under the current key. No-op if already current. */
  rotate(envelope: string): string {
    const keyId = envelope.split(".")[0];
    if (keyId === "current") return envelope;
    const plaintext = this.decrypt(envelope);
    return this.encrypt(plaintext);
  }
}

export const tokenVault = new TokenVault();
