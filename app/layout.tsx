import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINK CONTROL CENTRAL",
  description: "Centro de control operacional del ecosistema LINK.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
