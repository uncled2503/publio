const SENSITIVE_KEY_PATTERN = /token|secret|password|authorization|cookie|access_key/i;

/** Recursively strips anything that looks like a secret before it's persisted or logged (§28, §31). */
export function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeMetadata(v, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : sanitizeMetadata(val, depth + 1);
    }
    return out;
  }

  return value;
}
