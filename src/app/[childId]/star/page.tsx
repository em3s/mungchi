"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { cached } from "@/lib/cache";
import { PERSONAL_MILESTONES } from "@/lib/constants";
import { BottomNav } from "@/components/BottomNav";
import { Loading } from "@/components/Loading";
import { MilestoneMap } from "@/components/MilestoneMap";
import { useEmojiOverride } from "@/hooks/useEmojiOverride";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { useUser } from "@/hooks/useUser";

export default function StarPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId, user: child } = useUser(params);
  const [completed, setCompleted] = useState<number | null>(null);

  const { override: emojiOverride } = useEmojiOverride(childId);
  const { allowed } = useFeatureGuard(childId, "star");

  useEffect(() => {
    if (!allowed) return;
    async function load() {
      try {
        const count = await cached(
          `star_count:${childId}`,
          60_000,
          async () => {
            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("user_id", childId)
              .eq("completed", true);
            return count ?? 0;
          },
        );
        setCompleted(count);
      } catch {
        setCompleted(0);
      }
    }
    load();
  }, [childId, allowed]);

  if (!allowed) return null;

  if (completed === null) {
    return <Loading />;
  }

  const emoji = emojiOverride || child?.emoji || "⭐";
  const starName = child?.starName ?? "반짝별";

  return (
    <>
      <MilestoneMap
        rawMilestones={PERSONAL_MILESTONES}
        completed={completed}
        header={
          <h1 className="text-xl font-bold md:text-2xl">
            {emoji} {starName}
          </h1>
        }
        subheader={
          <strong className="text-base">
            {emoji} {completed}개 완료
          </strong>
        }
      />
      <BottomNav childId={childId} />
    </>
  );
}
