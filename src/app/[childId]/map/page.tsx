"use client";

import { use } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import { USERS, MILESTONES } from "@/lib/constants";
import { BottomNav } from "@/components/BottomNav";
import { Loading } from "@/components/Loading";
import { MilestoneMap } from "@/components/MilestoneMap";
import { useEmojiOverride } from "@/hooks/useEmojiOverride";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";

const CHILD_USERS = USERS.filter((u) => u.role === "child");

type ChildCount = { id: string; emoji: string; count: number };

async function fetchMapCounts(): Promise<ChildCount[]> {
  const results = await Promise.all(
    CHILD_USERS.map((child) =>
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", child.id)
        .eq("completed", true),
    ),
  );
  return CHILD_USERS.map((child, i) => ({
    id: child.id,
    emoji: child.emoji,
    count: results[i].count ?? 0,
  }));
}

export default function MapPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const { override: emojiOverride } = useEmojiOverride(childId);
  const { allowed } = useFeatureGuard(childId, "map");

  const { data: childCounts } = useSWR(
    allowed ? "map_counts" : null,
    fetchMapCounts,
  );

  if (!allowed) return null;

  if (!childCounts) {
    return <Loading />;
  }

  const totalCompleted = childCounts.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <MilestoneMap
        rawMilestones={MILESTONES}
        completed={totalCompleted}
        header={
          <h1 className="text-xl font-bold md:text-2xl">🌟 쌍둥이별</h1>
        }
        subheader={
          <>
            {childCounts.map((c, i) => {
              const emoji = c.id === childId && emojiOverride ? emojiOverride : c.emoji;
              return (
                <span key={c.id}>
                  {i > 0 && <span className="mx-1">+</span>}
                  {emoji} {c.count}개
                </span>
              );
            })}
            <span className="mx-1">=</span>
            <strong className="text-base">🌟 {totalCompleted}개</strong>
          </>
        }
      />
      <BottomNav childId={childId} />
    </>
  );
}
