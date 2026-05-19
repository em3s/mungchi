import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { UpdateButton } from "@/components/UpdateButton";
import { SWRProvider } from "@/components/SWRProvider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "뭉치 영어 단어장",
  description: "영어 단어장",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "icon", url: "/favicon.ico", sizes: "32x32" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "뭉치",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased" style={{ background: "var(--bg)" }}>
        <SWRProvider>
          <UpdateButton />
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
