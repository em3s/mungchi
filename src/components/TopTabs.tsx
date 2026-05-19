"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "📖 단어장" },
  { href: "/admin", label: "🔧 만들기" },
];

export function TopTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 mb-4 bg-white/70 rounded-xl p-1 shadow-sm">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={(e) => {
              if (active) {
                e.preventDefault();
                window.dispatchEvent(
                  new CustomEvent("tab-reset", { detail: { href: tab.href } }),
                );
              }
            }}
            className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold transition-all ${
              active
                ? "bg-[var(--accent,#6c5ce7)] text-white shadow"
                : "text-gray-500 active:bg-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
