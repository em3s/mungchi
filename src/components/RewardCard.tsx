"use client";

import type { CoinReward } from "@/lib/types";

interface RewardCardProps {
  reward: CoinReward;
  balance: number;
  onExchange: (reward: CoinReward) => void;
}

export function RewardCard({ reward, balance, onExchange }: RewardCardProps) {
  const affordable = balance >= reward.cost;

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
      <div className="text-3xl mb-2">{reward.emoji}</div>
      <div className="font-semibold text-sm text-gray-800 mb-1">
        {reward.name}
      </div>
      <div
        className={`text-xs font-bold ${affordable ? "text-amber-500" : "text-gray-400"}`}
      >
        🍪 {reward.cost}
      </div>
    </button>
  );
}
