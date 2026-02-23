"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cached } from "@/lib/cache";
import { CHILDREN, PERSONAL_MILESTONES } from "@/lib/constants";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { BottomNav } from "@/components/BottomNav";
import { MilestoneMap } from "@/components/MilestoneMap";

export default function StarPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const [completed, setCompleted] = useState<number | null>(null);
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  const child = CHILDREN.find((c) => c.id === childId);

  useEffect(() => {
    loadFeatureFlags().then(() => setFlagsLoaded(true));
  }, []);

  const featureDisabled = flagsLoaded && !isFeatureEnabled(childId, "star");

  useEffect(() => {
    if (featureDisabled) {
      router.replace(`/${childId}`);
    }
  }, [featureDisabled, childId, router]);

  useEffect(() => {
    if (!flagsLoaded || featureDisabled) return;
    async function load() {
      try {
        const count = await cached(
          `star_count:${childId}`,
          60_000,
          async () => {
            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("child_id", childId)
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
  }, [childId, flagsLoaded, featureDisabled]);

  if (!flagsLoaded || featureDisabled) return null;

  if (completed === null) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  const emoji = child?.emoji ?? "⭐";
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
