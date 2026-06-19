import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "VOGAUTO — Management auto", template: "%s · VOGAUTO" },
  description: "Sistem de management al vânzărilor pentru dealer auto.",
  applicationName: "VOGAUTO",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
