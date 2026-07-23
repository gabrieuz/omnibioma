import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omnibioma Field",
  description: "Triagem ambiental preliminar, segura e feita para o campo.",
  applicationName: "Omnibioma Field",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Omnibioma" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#173f36" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
