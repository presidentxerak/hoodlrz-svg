import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import Providers from "@/components/layout/Providers";
import Header from "@/components/layout/Header";
import AudioPlayer from "@/components/audio/AudioPlayer";
import BottomNav from "@/components/layout/BottomNav";
import OpenSeaStickyBanner from "@/components/layout/OpenSeaStickyBanner";
import Footer from "@/components/layout/Footer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HOODLRZ",
  description:
    "HOODLRZ - Premium digital collectibles. Discover, collect, and showcase unique art from the HOODLRZ universe.",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-hoodlrz.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "HOODLRZ",
    description: "Premium digital collectibles. Discover, collect, and showcase unique art from the HOODLRZ universe.",
    siteName: "HOODLRZ",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-body antialiased`}>
        <ThemeProvider>
          <Providers>
            <Header />
            <main className="min-h-[calc(100dvh-3.5rem)] pb-44 md:pb-24">
              {children}
            </main>
            <AudioPlayer />
            <OpenSeaStickyBanner />
            <BottomNav />
            <Footer />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
