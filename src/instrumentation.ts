export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionSafety } = await import("@/server/config/env");
    assertProductionSafety();
  }
}
