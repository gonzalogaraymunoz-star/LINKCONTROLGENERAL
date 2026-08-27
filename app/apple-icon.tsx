import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "180px",
          height: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: "38px",
          position: "relative",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ position: "absolute", left: 31, top: 31, width: 43, height: 43, borderLeft: "7px solid #000", borderTop: "7px solid #000", borderTopLeftRadius: 20 }} />
        <div style={{ position: "absolute", right: 31, top: 31, width: 43, height: 43, borderRight: "7px solid #000", borderTop: "7px solid #000", borderTopRightRadius: 20 }} />
        <div style={{ position: "absolute", left: 31, bottom: 31, width: 43, height: 43, borderLeft: "7px solid #000", borderBottom: "7px solid #000", borderBottomLeftRadius: 20 }} />
        <div style={{ position: "absolute", right: 31, bottom: 31, width: 43, height: 43, borderRight: "7px solid #000", borderBottom: "7px solid #000", borderBottomRightRadius: 20 }} />
        <div style={{ display: "flex", fontSize: 27, fontWeight: 700, letterSpacing: "8px", color: "#000", marginLeft: "8px" }}>LINK</div>
      </div>
    ),
    { ...size }
  );
}
