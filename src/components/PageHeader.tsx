"use client";

import { useState, useEffect } from "react";

interface PageHeaderProps {
  title: React.ReactNode;
  titleProps?: React.HTMLAttributes<HTMLHeadingElement>;
  coinBalance?: number | null;
  rightSlot?: React.ReactNode;
}

export function PageHeader({
  title,
  titleProps,
  coinBalance,
  rightSlot,
}: PageHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`flex items-center justify-between py-4 sticky top-0 z-10 transition-shadow duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
      style={{ background: "var(--bg)" }}
    >
      <h1 className="text-xl font-bold md:text-2xl select-none" {...titleProps}>
        {title}
      </h1>
      {rightSlot ??
        (coinBalance !== undefined && coinBalance !== null && (
          <span className="text-sm font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full">
            🍪 {coinBalance}
          </span>
        ))}
    </div>
  );
}
