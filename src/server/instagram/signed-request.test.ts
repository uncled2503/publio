import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifySignedRequest } from "./signed-request";

const SECRET = "test-app-secret";

function sign(payload: object, secret = SECRET): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${sig}.${encodedPayload}`;
}

describe("verifySignedRequest", () => {
  it("accepts a correctly signed payload", () => {
    const signed = sign({ user_id: "12345", algorithm: "HMAC-SHA256", issued_at: 1000 });
    const result = verifySignedRequest(signed, SECRET);
    expect(result).toEqual({ user_id: "12345", algorithm: "HMAC-SHA256", issued_at: 1000 });
  });

  it("rejects a payload signed with the wrong secret", () => {
    const signed = sign({ user_id: "12345", algorithm: "HMAC-SHA256" }, "wrong-secret");
    expect(verifySignedRequest(signed, SECRET)).toBeNull();
  });

  it("rejects a tampered payload (signature no longer matches)", () => {
    const signed = sign({ user_id: "12345", algorithm: "HMAC-SHA256" });
    const [sig] = signed.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ user_id: "attacker", algorithm: "HMAC-SHA256" })).toString(
      "base64url",
    );
    expect(verifySignedRequest(`${sig}.${tamperedPayload}`, SECRET)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifySignedRequest("not-a-signed-request", SECRET)).toBeNull();
    expect(verifySignedRequest("", SECRET)).toBeNull();
    expect(verifySignedRequest("a.b.c", SECRET)).toBeNull();
  });

  it("rejects a payload missing user_id or using a different algorithm", () => {
    expect(verifySignedRequest(sign({ algorithm: "HMAC-SHA256" }), SECRET)).toBeNull();
    expect(verifySignedRequest(sign({ user_id: "12345", algorithm: "MD5" }), SECRET)).toBeNull();
  });
});
