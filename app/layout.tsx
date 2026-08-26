import type { Metadata } from "next";
import "./globals.css";
import "./pro.css";
import "./complements.css";
import "./operational.css";
import "./actions.css";
import "./factory.css";

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
