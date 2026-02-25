"use client";

import { KonstaProvider } from "konsta/react";
import "./konsta.css";

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <KonstaProvider theme="ios">{children}</KonstaProvider>
  );
}
