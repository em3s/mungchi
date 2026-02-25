"use client";

import { KonstaProvider } from "konsta/react";
import { SWRProvider } from "@/components/SWRProvider";
import "./globals.css";

export default function V2RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <KonstaProvider theme="ios" dark={false}>
          <SWRProvider>
            {children}
          </SWRProvider>
        </KonstaProvider>
      </body>
    </html>
  );
}
