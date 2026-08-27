import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/PWARegister";
import "./globals.css";
import "./pro.css";
import "./complements.css";
import "./operational.css";
import "./actions.css";
import "./control-v5.css";
import "./control-v6.css";
import "./control-v7.css";

export const metadata: Metadata = {
  title: "LINK CONTROL CENTRAL",
  description: "Centro de control operacional del ecosistema LINK.",
  applicationName: "LINK CONTROL CENTRAL",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "CONTROL CENTRAL", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#111111", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><PWARegister />{children}</body></html>;
}
