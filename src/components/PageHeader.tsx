"use client";

import { useState, useEffect } from "react";

interface PageHeaderProps {
  title: React.ReactNode;
  titleProps?: React.HTMLAttributes<HTMLHeadingElement>;
  rightSlot?: React.ReactNode;
}

export function PageHeader({ title, titleProps, rightSlot }: PageHeaderProps) {
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
      <h1
        className="font-display text-2xl md:text-3xl font-medium select-none"
        style={{ color: "var(--ink)" }}
        {...titleProps}
      >
        {title}
      </h1>
      {rightSlot}
    </div>
  );
}
