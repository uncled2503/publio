/**
 * Magic-byte MIME sniffing — the browser's reported Content-Type is never
 * trusted (§12: "Não confiar no MIME informado pelo navegador"). Only the
 * two container families Instagram accepts are recognized; anything else
 * returns null and gets rejected upstream. Deliberately hand-rolled
 * instead of a general-purpose file-type library: we only ever need to
 * recognize two signatures, and a general parser is more surface area
 * than the problem warrants.
 */
export type SniffedMimeType = "image/jpeg" | "video/mp4" | "video/quicktime";

export function sniffMediaMimeType(buffer: Buffer): SniffedMimeType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // ISO base media file format (MP4/MOV): a 4-byte box size, then the
  // ASCII literal "ftyp", then a 4-byte "major brand".
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii").trim().toLowerCase();
    if (brand === "qt") return "video/quicktime";
    return "video/mp4";
  }

  return null;
}
