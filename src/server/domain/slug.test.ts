import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("My Agency")).toBe("my-agency");
  });

  it("strips accents", () => {
    expect(slugify("Ação Comunicação")).toBe("acao-comunicacao");
  });

  it("removes non-alphanumeric characters", () => {
    expect(slugify("Foo & Bar! (2026)")).toBe("foo-bar-2026");
  });

  it("collapses repeated separators and trims edges", () => {
    expect(slugify("  --Hello   World--  ")).toBe("hello-world");
  });

  it("truncates very long names", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(48);
  });
});
