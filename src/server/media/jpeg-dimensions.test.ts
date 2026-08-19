import { describe, expect, it } from "vitest";

import { getJpegDimensions } from "./jpeg-dimensions";

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
  return b;
}

/** Builds a minimal-but-structurally-valid JPEG with an APP0 segment, an SOF0 with the given dimensions, and an SOS marker. */
function buildFakeJpeg(width: number, height: number): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);

  const app0Payload = Buffer.concat([
    Buffer.from("JFIF\0", "ascii"),
    Buffer.from([0x01, 0x01]), // version
    Buffer.from([0x00]), // units
    u16(1),
    u16(1), // density
    Buffer.from([0x00, 0x00]), // thumbnail w/h
  ]);
  const app0 = Buffer.concat([Buffer.from([0xff, 0xe0]), u16(app0Payload.length + 2), app0Payload]);

  const sof0Payload = Buffer.concat([
    Buffer.from([0x08]), // precision
    u16(height),
    u16(width),
    Buffer.from([0x03]), // num components
    Buffer.from([0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]), // 3 components x 3 bytes
  ]);
  const sof0 = Buffer.concat([Buffer.from([0xff, 0xc0]), u16(sof0Payload.length + 2), sof0Payload]);

  const sos = Buffer.from([0xff, 0xda, 0x00, 0x00]);

  return Buffer.concat([soi, app0, sof0, sos]);
}

describe("getJpegDimensions", () => {
  it("reads width/height from a well-formed JPEG", () => {
    const jpeg = buildFakeJpeg(1080, 1350);
    expect(getJpegDimensions(jpeg)).toEqual({ width: 1080, height: 1350 });
  });

  it("handles a square image", () => {
    const jpeg = buildFakeJpeg(500, 500);
    expect(getJpegDimensions(jpeg)).toEqual({ width: 500, height: 500 });
  });

  it("returns null for a non-JPEG buffer", () => {
    expect(getJpegDimensions(Buffer.from("not a jpeg at all"))).toBeNull();
  });

  it("returns null for a truncated buffer with no SOF marker", () => {
    expect(getJpegDimensions(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
  });

  it("returns null for an empty buffer", () => {
    expect(getJpegDimensions(Buffer.alloc(0))).toBeNull();
  });

  it("does not hang or throw on adversarial input (bounded loop)", () => {
    // Valid SOI followed by a long run of 0xff fill bytes and no marker —
    // exercises the fill-byte-skipping loop's termination.
    const adversarial = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(10_000, 0xff)]);
    const start = Date.now();
    expect(getJpegDimensions(adversarial)).toBeNull();
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
