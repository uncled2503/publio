import { sanitizeMetadata } from "./sanitize";

/**
 * Structured JSON logging (§31). Every call produces a single JSON line —
 * pipe-friendly for any log platform (Vercel logs, Datadog, CloudWatch...).
 * `event` should be a dotted namespace, e.g. "instagram.publish.failed".
 * Never pass raw tokens/secrets — sanitizeMetadata redacts common key
 * names, but callers should still avoid passing whole provider payloads
 * that might contain a token in an unexpected field.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

function write(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
  const line = {
    level,
    event,
    time: new Date().toISOString(),
    ...(sanitizeMetadata(fields) as Record<string, unknown>),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => write("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};
