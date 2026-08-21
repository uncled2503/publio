import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const logoData = readFileSync(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          background: "linear-gradient(135deg, #2f5cf0 0%, #7c3aed 55%, #a21caf 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={560} height={204} alt="" />
        <div
          style={{
            fontSize: 34,
            color: "#ffffff",
            opacity: 0.92,
            fontWeight: 500,
          }}
        >
          Agende e publique no Instagram com confiança
        </div>
      </div>
    ),
    { ...size },
  );
}
