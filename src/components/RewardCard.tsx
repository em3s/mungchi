"use client";

import type { CoinReward } from "@/lib/types";

interface RewardCardProps {
  reward: CoinReward;
  balance: number;
  onExchange: (reward: CoinReward) => void;
}

// 이름 첫글자가 이모지면 분리 (대표 이미지 + 나머지 이름)
function parseEmoji(name: string, fallback: string): { emoji: string; label: string } {
  const emojiMatch = name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
  if (emojiMatch) {
    return { emoji: emojiMatch[0], label: name.slice(emojiMatch[0].length).trim() || name };
  }
  return { emoji: fallback, label: name };
}

export function RewardCard({ reward, balance, onExchange }: RewardCardProps) {
  const affordable = balance >= reward.cost;
  const { emoji, label } = parseEmoji(reward.name, reward.emoji);

  return (
    <button
      onClick={() => affordable && onExchange(reward)}
      disabled={!affordable}
      className={`bg-white rounded-2xl p-4 shadow-sm text-center transition-all active:scale-95 ${
        affordable
          ? "border-2 border-transparent hover:border-amber-200"
          : "opacity-50"
      }`}
    >
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="font-semibold text-sm text-gray-800 mb-1">
        {label}
      </div>
      <div
        className={`text-xs font-bold ${affordable ? "text-amber-500" : "text-gray-400"}`}
      >
        🍬 {reward.cost}
      </div>
    </button>
  );
}
