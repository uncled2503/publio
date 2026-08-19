import { describe, expect, it } from "vitest";

import { sniffMediaMimeType } from "./sniff-mime";

describe("sniffMediaMimeType", () => {
  it("recognizes a JPEG signature", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(sniffMediaMimeType(buf)).toBe("image/jpeg");
  });

  it("recognizes an MP4 ftyp box", () => {
    const buf = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x18]),
      Buffer.from("ftyp", "ascii"),
      Buffer.from("isom", "ascii"),
    ]);
    expect(sniffMediaMimeType(buf)).toBe("video/mp4");
  });

  it("recognizes a QuickTime (.mov) ftyp box", () => {
    const buf = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x14]),
      Buffer.from("ftyp", "ascii"),
      Buffer.from("qt  ", "ascii"),
    ]);
    expect(sniffMediaMimeType(buf)).toBe("video/quicktime");
  });

  it("rejects a PNG pretending to be a JPEG via a spoofed extension", () => {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffMediaMimeType(pngSignature)).toBeNull();
  });

  it("rejects an empty or too-short buffer", () => {
    expect(sniffMediaMimeType(Buffer.alloc(0))).toBeNull();
    expect(sniffMediaMimeType(Buffer.from([0xff]))).toBeNull();
  });

  it("rejects arbitrary binary that isn't a recognized container", () => {
    expect(sniffMediaMimeType(Buffer.from("this is just text"))).toBeNull();
  });
});
