/**
 * Deterministic env values for the unit test process, independent of the
 * developer's local .env — tests must not depend on (or leak) real
 * secrets. Only set a var if it isn't already provided by the runner.
 */
const defaults: Record<string, string> = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379",
  AUTH_SECRET: "test-auth-secret-not-for-production-use-only",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  SOCIAL_PROVIDER_MODE: "mock",
  S3_ENDPOINT: "http://localhost:9000",
  S3_BUCKET: "test-bucket",
  S3_ACCESS_KEY_ID: "test-access-key",
  S3_SECRET_ACCESS_KEY: "test-secret-key",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
