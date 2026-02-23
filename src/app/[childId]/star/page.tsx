"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cached } from "@/lib/cache";
import { CHILDREN, PERSONAL_MILESTONES } from "@/lib/constants";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { BottomNav } from "@/components/BottomNav";
import { MapNode } from "@/components/MapNode";

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

  const currentNode = PERSONAL_MILESTONES.reduce(
    (acc, m) => (completed >= m.required ? m.node : acc),
    0,
  );

  const milestones = PERSONAL_MILESTONES.map((m) => ({
    ...m,
    unlocked: completed >= m.required,
    current: m.node === currentNode,
  }));

  return (
    <div className="pt-2">
      {/* Header */}
      <div
        className="flex items-center justify-between py-4 sticky top-0 z-10"
        style={{ background: "var(--bg)" }}
      >
        <h1 className="text-xl font-bold md:text-2xl">
          {child?.emoji ?? "⭐"}{" "}
          {childId === "sihyun" ? "반짝별" : "초코별"}
        </h1>
        <span />
      </div>

      <div className="text-center mb-4 text-gray-500 text-sm">
        <strong className="text-base">
          {child?.emoji ?? "⭐"} {completed}개 완료
        </strong>
      </div>

      {/* Map Path */}
      <div className="flex flex-col items-center py-4">
        {milestones.map((m, i) => (
          <MapNode
            key={m.node}
            milestone={m}
            isLast={i === milestones.length - 1}
          />
        ))}
      </div>

      <BottomNav childId={childId} />
    </div>
  );
}
