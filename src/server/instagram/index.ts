import { env } from "@/server/config/env";
import type { InstagramProvider } from "./types";
import { LiveInstagramProvider } from "./live-provider";
import { MockInstagramProvider } from "./mock-provider";

let instance: InstagramProvider | undefined;

export function getInstagramProvider(): InstagramProvider {
  if (!instance) {
    instance = env.SOCIAL_PROVIDER_MODE === "live" ? new LiveInstagramProvider() : new MockInstagramProvider();
  }
  return instance;
}

export * from "./types";
export { REQUIRED_INSTAGRAM_SCOPES } from "./live-provider";
export { encodeMockToken, decodeMockToken } from "./mock-provider";
