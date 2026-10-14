import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import Providers from "@/components/layout/Providers";
import AppShell from "@/components/layout/AppShell";
import PwaRegister from "@/components/layout/PwaRegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HOODLRZ",
  description:
    "The private network for Hoodlrz holders. Feed, market, groups and news, behind the wallet that owns the art.",
  manifest: "/manifest.webmanifest",
  applicationName: "Hoodlrz",
  appleWebApp: { capable: true, title: "Hoodlrz", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-hoodlrz.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "HOODLRZ",
    description: "The private network for Hoodlrz holders.",
    siteName: "HOODLRZ",
    type: "website",
  },
  /**
   * Un reseau prive n'a rien a gagner a etre indexe, et beaucoup a
   * perdre : un moteur qui rampe les pages publiques apprend la forme des
   * URL privees et les donne a lire a n'importe qui. L'en-tete
   * complete /robots.txt, que rien n'oblige un robot a respecter.
   */
  robots: { index: true, follow: false, nocache: true },
};

/**
 * viewport-fit=cover laisse la page passer sous l'encoche ; les barres
 * compensent avec env(safe-area-inset-*). Sans lui, une PWA installee sur
 * iPhone affiche deux bandes noires.
 *
 * maximumScale n'est pas verrouille : bloquer le zoom casse la lecture
 * pour qui en a besoin, et les barres sont deja dimensionnees pour que le
 * zoom ne soit pas la seule issue.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-body antialiased`}>
        <ThemeProvider>
          <Providers>
            <AppShell>{children}</AppShell>
            <PwaRegister />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
