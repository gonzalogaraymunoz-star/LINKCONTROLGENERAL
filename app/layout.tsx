import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/PWARegister";
import "./agentic.css";

export const metadata: Metadata = {
  title: "LINK CONTROL CENTRAL",
  description: "Sucursal de trabajo agéntico del ecosistema LINK.",
  applicationName: "LINK CONTROL CENTRAL",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "CONTROL CENTRAL",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f3f1e8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
