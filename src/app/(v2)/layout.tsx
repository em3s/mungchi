"use client";

import { App } from "konsta/react";
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
        <App theme="ios" safeAreas dark={false}>
          <SWRProvider>
            {children}
          </SWRProvider>
        </App>
      </body>
    </html>
  );
}
