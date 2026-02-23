"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cached } from "@/lib/cache";
import { USERS, MILESTONES } from "@/lib/constants";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { BottomNav } from "@/components/BottomNav";
import { MilestoneMap } from "@/components/MilestoneMap";

const CHILD_USERS = USERS.filter((u) => u.role === "child");

export default function MapPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const [totalCompleted, setTotalCompleted] = useState<number | null>(null);
  const [childCounts, setChildCounts] = useState<
    { id: string; emoji: string; count: number }[]
  >([]);
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  useEffect(() => {
    loadFeatureFlags().then(() => setFlagsLoaded(true));
  }, []);

  const featureDisabled = flagsLoaded && !isFeatureEnabled(childId, "map");

  useEffect(() => {
    if (featureDisabled) {
      router.replace(`/${childId}`);
    }
  }, [featureDisabled, childId, router]);

  useEffect(() => {
    if (!flagsLoaded || featureDisabled) return;
    async function load() {
      try {
        const counts = await cached(
          "map_counts",
          60_000,
          async () => {
            const results = await Promise.all(
              CHILD_USERS.map((child) =>
                supabase
                  .from("tasks")
                  .select("*", { count: "exact", head: true })
                  .eq("child_id", child.id)
                  .eq("completed", true),
              ),
            );
            return CHILD_USERS.map((child, i) => ({
              id: child.id,
              emoji: child.emoji,
              count: results[i].count ?? 0,
            }));
          },
        );

        setChildCounts(counts);
        setTotalCompleted(counts.reduce((sum, c) => sum + c.count, 0));
      } catch {
        setTotalCompleted(0);
      }
    }
    load();
  }, [childId, flagsLoaded, featureDisabled]);

  if (!flagsLoaded || featureDisabled) return null;

  if (totalCompleted === null) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

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
            {childCounts.map((c, i) => (
              <span key={c.id}>
                {i > 0 && <span className="mx-1">+</span>}
                {c.emoji} {c.count}개
              </span>
            ))}
            <span className="mx-1">=</span>
            <strong className="text-base">🌟 {totalCompleted}개</strong>
          </>
        }
      />
      <BottomNav childId={childId} />
    </>
  );
}
