"use client";

function earnedIcons(count: number) {
  const units: { emoji: string; n: number }[] = [];
  const diamonds = Math.floor(count / 1000);
  const crowns = Math.floor((count % 1000) / 100);
  const trophies = Math.floor((count % 100) / 10);
  const medals = count % 10;
  if (diamonds > 0) units.push({ emoji: "💎", n: diamonds });
  if (crowns > 0) units.push({ emoji: "👑", n: crowns });
  if (trophies > 0) units.push({ emoji: "🏆", n: trophies });
  if (medals > 0) units.push({ emoji: "🏅", n: medals });
  return units;
}

interface TrophyShelfProps {
  totalEarned: number;
}

export function TrophyShelf({ totalEarned }: TrophyShelfProps) {
  if (totalEarned <= 0) return null;

  const icons = earnedIcons(totalEarned);

  return (
    <div className="flex gap-3 justify-center py-2 pb-4 md:gap-4">
      {icons.map((u, i) => (
        <span
          key={i}
          className="flex items-center gap-0.5 animate-trophy-pop"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <span className="text-2xl md:text-3xl">{u.emoji}</span>
          <span className="text-sm font-bold text-gray-500 md:text-base">
            ×{u.n}
          </span>
        </span>
      ))}
    </div>
  );
}
