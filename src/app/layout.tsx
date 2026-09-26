import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-big-shoulders", subsets: ["latin"], weight: ["700", "800", "900"], adjustFontFallback: false });
const body = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://stickerstatusdirect.com"),
  title: { default: "Sticker Status Direct | Custom stickers made easy", template: "%s | Sticker Status Direct" },
  description:
    "Custom stickers made easy. Upload your artwork, choose size and quantity, approve your proof, and Sticker Status prints and ships.",
  openGraph: { siteName: "Sticker Status Direct", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0D0B0B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
