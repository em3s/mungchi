"use client";

import { CONFETTI_EMOJIS } from "@/lib/constants";

export function V2Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {CONFETTI_EMOJIS.map((emoji, i) => (
        <span
          key={i}
          className="absolute -top-10 text-2xl animate-confetti-fall md:text-3xl"
          style={{
            left: `calc(${i * 8.33}% + 2%)`,
            animationDelay: `${i * 0.12}s`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
