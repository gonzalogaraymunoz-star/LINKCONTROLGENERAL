import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const stroke = 14;
  const inset = 84;
  const arm = 120;
  const radius = 50;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", position: "relative", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ position: "absolute", left: inset, top: inset, width: arm, height: arm, borderLeft: `${stroke}px solid #000`, borderTop: `${stroke}px solid #000`, borderTopLeftRadius: radius }} />
        <div style={{ position: "absolute", right: inset, top: inset, width: arm, height: arm, borderRight: `${stroke}px solid #000`, borderTop: `${stroke}px solid #000`, borderTopRightRadius: radius }} />
        <div style={{ position: "absolute", left: inset, bottom: inset, width: arm, height: arm, borderLeft: `${stroke}px solid #000`, borderBottom: `${stroke}px solid #000`, borderBottomLeftRadius: radius }} />
        <div style={{ position: "absolute", right: inset, bottom: inset, width: arm, height: arm, borderRight: `${stroke}px solid #000`, borderBottom: `${stroke}px solid #000`, borderBottomRightRadius: radius }} />
        <div style={{ color: "#000", fontSize: 74, fontWeight: 700, letterSpacing: 34, paddingLeft: 34 }}>LINK</div>
      </div>
    ),
    size,
  );
}
