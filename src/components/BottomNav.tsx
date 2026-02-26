"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { USERS } from "@/lib/constants";
import { useEmojiOverride } from "@/hooks/useEmojiOverride";

interface BottomNavProps {
  childId: string;
}

export function BottomNav({ childId }: BottomNavProps) {
  const pathname = usePathname();
  const [, setFlagsReady] = useState(false);

  useEffect(() => {
    loadFeatureFlags().then(() => setFlagsReady(true));
  }, []);

  const child = USERS.find((c) => c.id === childId);
  const { override: emojiOverride } = useEmojiOverride(childId);
  const starEmoji = emojiOverride || child?.emoji || "⭐";

  const tabs = [
    { href: `/${childId}`, label: "할일", icon: "📋", key: "dashboard" },
    {
      href: `/${childId}/badges`,
      label: "뱃지",
      icon: "🏅",
      key: "badges",
    },
    {
      href: `/${childId}/shop`,
      label: "초코",
      icon: "🍪",
      key: "coins",
    },
    {
      href: `/${childId}/vocab`,
      label: "영어",
      icon: "📖",
      key: "vocab",
    },
    {
      href: `/${childId}/star`,
      label: child?.starName ?? "반짝별",
      icon: starEmoji,
      key: "star",
    },
    { href: `/${childId}/map`, label: "쌍둥이별", icon: "🌟", key: "map" },
    { href: `/${childId}/sound`, label: "사운드", icon: "🔊", key: "sound" },
    { href: `/${childId}/settings`, label: "설정", icon: "⚙️", key: "settings" },
  ].filter((tab) => {
    if (tab.key === "map") return isFeatureEnabled(childId, "map");
    if (tab.key === "star") return isFeatureEnabled(childId, "star");
    if (tab.key === "coins") return isFeatureEnabled(childId, "coins");
    if (tab.key === "vocab") return isFeatureEnabled(childId, "vocab");
    if (tab.key === "sound") return isFeatureEnabled(childId, "sound");
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
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[0.7rem] font-semibold transition-all duration-200 no-underline md:text-[0.85rem] md:px-4 md:py-1.5 ${
              isActive(tab)
                ? "text-[var(--accent,#6c5ce7)] bg-[var(--accent,#6c5ce7)]/10 scale-105"
                : "text-gray-400 active:scale-95"
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
