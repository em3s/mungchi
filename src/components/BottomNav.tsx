"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isFeatureEnabled } from "@/lib/features";

interface BottomNavProps {
  childId: string;
}

export function BottomNav({ childId }: BottomNavProps) {
  const pathname = usePathname();

  const tabs = [
    { href: `/${childId}`, label: "할일", icon: "📋", key: "dashboard" },
    {
      href: `/${childId}/badges`,
      label: childId === "sihyun" ? "반짝별" : "초코별",
      icon: childId === "sihyun" ? "⭐" : "🍫",
      key: "badges",
    },
    { href: `/${childId}/map`, label: "쌍둥이별", icon: "🌟", key: "map" },
  ].filter((tab) => {
    if (tab.key === "map") return isFeatureEnabled(childId, "map");
    return true;
  });

  function isActive(tab: (typeof tabs)[0]) {
    if (tab.key === "dashboard") {
      return pathname === `/${childId}`;
    }
    return pathname === tab.href;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-center pb-[env(safe-area-inset-bottom,8px)] pt-2 z-20 md:pt-3 md:pb-[env(safe-area-inset-bottom,12px)]">
      <div className="max-w-[480px] w-full flex justify-around md:max-w-[640px]">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[0.7rem] font-semibold transition-colors no-underline md:text-[0.85rem] md:px-4 md:py-1.5 ${
              isActive(tab)
                ? "text-[var(--accent,#6c5ce7)]"
                : "text-gray-400"
            }`}
          >
            <span className="text-xl md:text-2xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
