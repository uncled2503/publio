import { describe, expect, it } from "vitest";

import { TokenVault } from "./token-vault";

const KEY_A = Buffer.alloc(32, 1);
const KEY_B = Buffer.alloc(32, 2);

describe("TokenVault", () => {
  it("round-trips plaintext through encrypt/decrypt", () => {
    const vault = new TokenVault(new Map([["current", KEY_A]]));
    const envelope = vault.encrypt("IGQVJ...secret-access-token");
    expect(envelope).not.toContain("secret-access-token");
    expect(vault.decrypt(envelope)).toBe("IGQVJ...secret-access-token");
  });

  it("produces a different ciphertext every time (random IV)", () => {
    const vault = new TokenVault(new Map([["current", KEY_A]]));
    const a = vault.encrypt("same-plaintext");
    const b = vault.encrypt("same-plaintext");
    expect(a).not.toBe(b);
  });

  it("detects tampering (authenticated encryption)", () => {
    const vault = new TokenVault(new Map([["current", KEY_A]]));
    const envelope = vault.encrypt("token-value");
    const parts = envelope.split(".");
    const tamperedCiphertext = Buffer.from(parts[3]!, "base64");
    tamperedCiphertext[0] = (tamperedCiphertext[0]! + 1) % 256;
    const tampered = [parts[0], parts[1], parts[2], tamperedCiphertext.toString("base64")].join(
      ".",
    );
    expect(() => vault.decrypt(tampered)).toThrow();
  });

  it("refuses to decrypt with an unknown key id", () => {
    const vault = new TokenVault(new Map([["current", KEY_A]]));
    const envelope = `unknown.${"a".repeat(16)}.${"a".repeat(24)}.${"a".repeat(24)}`;
    expect(() => vault.decrypt(envelope)).toThrow(/unknown key id/i);
  });

  it("rotate() re-encrypts a legacy-key envelope under the current key", () => {
    const vault = new TokenVault(
      new Map<"current" | "previous", Buffer>([
        ["current", KEY_B],
        ["previous", KEY_A],
      ]),
    );
    const legacyVault = new TokenVault(new Map([["current", KEY_A]]));
    // Simulate an old row encrypted under the old key, relabeled as "previous".
    const oldEnvelope = legacyVault.encrypt("legacy-token").replace(/^current/, "previous");

    const rotated = vault.rotate(oldEnvelope);
    expect(rotated.startsWith("current.")).toBe(true);
    expect(vault.decrypt(rotated)).toBe("legacy-token");
  });

  it("rotate() is a no-op when already under the current key", () => {
    const vault = new TokenVault(new Map([["current", KEY_A]]));
    const envelope = vault.encrypt("already-current");
    expect(vault.rotate(envelope)).toBe(envelope);
  });

  it("rejects keys that are not exactly 32 bytes", () => {
    expect(() => new TokenVault(new Map([["current", Buffer.alloc(16)]]))).toThrow();
  });
});
