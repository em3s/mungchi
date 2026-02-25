"use client";

import { useState, use } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import { USERS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/constants";
import type { BadgeInfo } from "@/lib/types";
import type { DayTaskSummary } from "@/lib/badges/types";
import { evaluateBadges, getBadgesForDisplay } from "@/lib/badges/engine";
import { BottomNav } from "@/components/BottomNav";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { TrophyShelf } from "@/components/TrophyShelf";
import { BadgeCard } from "@/components/BadgeCard";
import { BadgeModal } from "@/components/BadgeModal";

function toDaySummaries(
  data: { date: string; completed: boolean; completed_at: string | null }[] | null
): DayTaskSummary[] {
  const map = new Map<string, DayTaskSummary>();
  for (const task of data || []) {
    let day = map.get(task.date);
    if (!day) {
      day = { date: task.date, total: 0, completed: 0, tasks: [] };
      map.set(task.date, day);
    }
    day.total++;
    if (task.completed) day.completed++;
    day.tasks.push({
      completed: task.completed,
      completedAt: task.completed_at,
    });
  }
  return [...map.values()];
}

async function fetchBadges(childId: string): Promise<BadgeInfo[]> {
  const siblingId = USERS.find((c) => c.id !== childId)?.id ?? "";

  const fetchTasks = async (id: string) => {
    const { data } = await supabase
      .from("tasks")
      .select("date, completed, completed_at")
      .eq("user_id", id)
      .order("date");
    return data;
  };

  const [childData, siblingData] = await Promise.all([
    fetchTasks(childId),
    fetchTasks(siblingId),
  ]);

  const childDays = toDaySummaries(childData);
  const siblingDays = toDaySummaries(siblingData);

  const earned = evaluateBadges(childId, childDays, siblingDays);
  return getBadgesForDisplay(earned);
}

export default function BadgesPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const [selected, setSelected] = useState<BadgeInfo | null>(null);

  const { data: badges } = useSWR(
    `badges:${childId}`,
    () => fetchBadges(childId),
    { revalidateOnFocus: false },
  );

  if (!badges) {
    return <Loading />;
  }

  const earnedCount = badges.filter((b) => b.earned).length;
  const totalEarned = badges.reduce((sum, b) => sum + (b.earnedCount || 0), 0);
  const totalCount = badges.length;

  // 카테고리별 그룹
  const grouped: Record<string, BadgeInfo[]> = {};
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = badges.filter((b) => b.category === cat);
  }

  return (
    <div className="pt-2">
      {/* Header */}
      <PageHeader
        title="🏅 뱃지"
        rightSlot={
          <span className="text-sm font-bold text-gray-500 md:text-base">
            {earnedCount}/{totalCount} 발견 · {totalEarned}회 획득
          </span>
        }
      />

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mb-5 overflow-hidden md:h-2">
        <div
          className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] rounded-full transition-all duration-300"
          style={{ width: `${(earnedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Trophy Shelf */}
      <TrophyShelf totalEarned={totalEarned} />

      {/* Badge Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const catBadges = grouped[cat];
        if (!catBadges || catBadges.length === 0) return null;
        const catEarned = catBadges.filter((b) => b.earned).length;

        return (
          <div key={cat} className="mb-5">
            <div className="text-sm font-bold mb-2.5 text-gray-800 md:text-base">
              {CATEGORY_LABELS[cat]}{" "}
              <span className="font-normal text-gray-400 text-xs md:text-sm">
                {catEarned}/{catBadges.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 md:gap-3">
              {catBadges.map((b) => (
                <BadgeCard
                  key={b.badgeId}
                  badge={b}
                  onClick={() => setSelected(b)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="text-center py-3 pb-5 text-gray-400 text-sm md:text-base">
        🤫 어딘가에 히든 뱃지가 숨어있어요...
      </div>

      {/* Badge Modal */}
      {selected && (
        <BadgeModal badge={selected} onClose={() => setSelected(null)} />
      )}

      <BottomNav childId={childId} />
    </div>
  );
}
