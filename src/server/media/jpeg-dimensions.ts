/**
 * Minimal JPEG dimension reader — walks the marker segments looking for a
 * Start Of Frame (SOFn) marker and reads width/height from it. Written by
 * hand instead of pulling in a general image-parsing library: Instagram
 * only accepts JPEG (IMAGE_SPEC), so a multi-format library would carry
 * parsing surface for formats we'll never see — and the general-purpose
 * option available on npm (`image-size`) has an open, unfixed high-severity
 * DoS advisory in its non-JPEG parsers. This function only ever walks
 * JPEG marker segments, so that class of bug doesn't apply here.
 */
export function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    // Skip fill bytes (0xff repeated before the real marker byte).
    let markerOffset = offset + 1;
    while (markerOffset < buffer.length && buffer[markerOffset] === 0xff) markerOffset++;
    if (markerOffset >= buffer.length) break;

    const marker = buffer[markerOffset]!;
    const afterMarker = markerOffset + 1;

    // EOI or SOS (start of scan data): no SOF seen before image data — give up.
    if (marker === 0xd9 || marker === 0xda) break;

    // Markers with no length field: TEM (0x01), RSTn (0xd0-0xd7).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset = afterMarker;
      continue;
    }

    if (afterMarker + 1 >= buffer.length) break;
    const length = buffer.readUInt16BE(afterMarker);

    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      if (afterMarker + 6 >= buffer.length) return null; // truncated buffer
      const height = buffer.readUInt16BE(afterMarker + 3);
      const width = buffer.readUInt16BE(afterMarker + 5);
      if (width === 0 || height === 0) return null;
      return { width, height };
    }

    offset = afterMarker + length;
  }

  return null;
}
