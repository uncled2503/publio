import { z } from "zod";

/**
 * Single point of access for environment variables. Nothing else in the
 * codebase should read `process.env` directly (§66 of the product spec) —
 * import `env` from here instead. Parsing happens once, at first import,
 * and throws immediately with a readable message if anything required is
 * missing so misconfiguration fails at boot, not mid-request.
 */

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  ADMIN_USER_EMAILS: z
    .string()
    .optional()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be set to a strong random value"),

  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1, "TOKEN_ENCRYPTION_KEY is required")
    .refine((v) => {
      try {
        return Buffer.from(v, "base64").length === 32;
      } catch {
        return false;
      }
    }, "TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key"),
  // Set during key rotation only: the previous 32-byte base64 key, kept
  // around so old ciphertexts still decrypt until TokenVault.rotate() has
  // re-encrypted every row. See docs/adr/ADR-003-token-encryption.md.
  TOKEN_ENCRYPTION_KEY_PREVIOUS: z.string().optional().default(""),

  SOCIAL_PROVIDER_MODE: z.enum(["mock", "live"]).default("mock"),

  INSTAGRAM_CLIENT_ID: z.string().optional().default(""),
  INSTAGRAM_CLIENT_SECRET: z.string().optional().default(""),
  INSTAGRAM_REDIRECT_URI: z.string().optional().default(""),
  META_GRAPH_API_VERSION: z.string().optional().default("v23.0"),

  S3_ENDPOINT: z.string().min(1, "S3_ENDPOINT is required"),
  S3_REGION: z.string().optional().default("auto"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID is required"),
  S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY is required"),
  S3_FORCE_PATH_STYLE: boolFromString,
  S3_PUBLIC_BASE_URL: z.string().optional().default(""),

  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  STRIPE_PRICE_STARTER: z.string().optional().default(""),
  STRIPE_PRICE_PRO: z.string().optional().default(""),
  STRIPE_PRICE_AGENCY: z.string().optional().default(""),

  SENTRY_DSN: z.string().optional().default(""),
});

export type Env = z.infer<typeof baseSchema> & {
  IS_PRODUCTION: boolean;
};

function loadEnv(): Env {
  const parsed = baseSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`Invalid environment configuration:\n${issues}`);
    throw new Error("Invalid environment configuration. See stderr for details.");
  }

  const data = parsed.data;

  if (data.SOCIAL_PROVIDER_MODE === "live") {
    const missing: string[] = [];
    if (!data.INSTAGRAM_CLIENT_ID) missing.push("INSTAGRAM_CLIENT_ID");
    if (!data.INSTAGRAM_CLIENT_SECRET) missing.push("INSTAGRAM_CLIENT_SECRET");
    if (!data.INSTAGRAM_REDIRECT_URI) missing.push("INSTAGRAM_REDIRECT_URI");
    if (missing.length > 0) {
      throw new Error(
        `SOCIAL_PROVIDER_MODE=live requires the following env vars: ${missing.join(", ")}`,
      );
    }
  }

  return { ...data, IS_PRODUCTION: data.NODE_ENV === "production" };
}

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) {
    cached = loadEnv();
  }
  return cached;
}

export const env: Env = getEnv();

/**
 * Business-rule safety net, deliberately NOT run as part of module-load
 * validation above: eager validation runs on every import, including
 * during `next build`'s static page-data collection, which happens with
 * NODE_ENV=production even for a local dev build. This check instead runs
 * once at actual process startup (see src/instrumentation.ts and the
 * worker entrypoint) so it only ever fires against a real running server.
 */
export function assertProductionSafety(): void {
  if (env.NODE_ENV === "production" && env.SOCIAL_PROVIDER_MODE === "mock") {
    throw new Error(
      "SOCIAL_PROVIDER_MODE=mock is not allowed when NODE_ENV=production. " +
        "Mock publishing must never run against real customer data.",
    );
  }
}
