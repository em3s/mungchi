import type { Metadata, Viewport } from "next";
import { UpdateButton } from "@/components/UpdateButton";
import { SWRProvider } from "@/components/SWRProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "뭉치",
  description: "아이들 할일 관리 + 성과(달성) 시스템",
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
    <html lang="ko">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <SWRProvider>
          <UpdateButton />
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
