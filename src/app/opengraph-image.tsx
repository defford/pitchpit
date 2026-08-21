import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "The Pitch Pit";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const logoSrc = `data:image/png;base64,${await readFile(
  join(process.cwd(), "public/brand/the-pitch-pit.png"),
  "base64",
)}`;

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#000000",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img src={logoSrc} alt="" width={720} height={579} />
    </div>,
    { ...size },
  );
}
