import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import Providers from "@/components/layout/Providers";
import Header from "@/components/layout/Header";
import AudioPlayer from "@/components/audio/AudioPlayer";
import BottomNav from "@/components/layout/BottomNav";
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
    "HOODLRZ — Premium digital collectibles. Discover, collect, and showcase unique art from the HOODLRZ universe.",
  icons: {
    icon: "/logo-hoodlrz.svg",
    apple: "/logo-hoodlrz.svg",
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
            <main className="min-h-[calc(100dvh-3.5rem)] pb-28 md:pb-12">
              {children}
            </main>
            <AudioPlayer />
            <BottomNav />
            <Footer />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
