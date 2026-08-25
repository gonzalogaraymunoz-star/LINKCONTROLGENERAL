import type { Metadata } from "next";
import InteractionBridge from "@/components/InteractionBridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINK CONTROL CENTRAL",
  description: "Centro de control, CRM, memoria, gateways y operación del ecosistema LINK.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <InteractionBridge />
      </body>
    </html>
  );
}
