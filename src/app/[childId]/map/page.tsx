"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { MILESTONES } from "@/lib/constants";
import { isFeatureEnabled } from "@/lib/features";
import { BottomNav } from "@/components/BottomNav";
import { MapNode } from "@/components/MapNode";

export default function MapPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const [totalCompleted, setTotalCompleted] = useState<number | null>(null);
  const [sihyunCount, setSihyunCount] = useState(0);
  const [misongCount, setMisongCount] = useState(0);
  const featureDisabled = !isFeatureEnabled(childId, "map");

  useEffect(() => {
    if (featureDisabled) {
      router.replace(`/${childId}`);
    }
  }, [featureDisabled, childId, router]);

  useEffect(() => {
    if (featureDisabled) return;
    async function load() {
      const [total, sihyun, misong] = await Promise.all([
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("completed", true),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("child_id", "sihyun")
          .eq("completed", true),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("child_id", "misong")
          .eq("completed", true),
      ]);

      setTotalCompleted(total.count ?? 0);
      setSihyunCount(sihyun.count ?? 0);
      setMisongCount(misong.count ?? 0);
    }
    load();
  }, [childId, featureDisabled]);

  if (featureDisabled) return null;

  if (totalCompleted === null) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  const currentNode = MILESTONES.reduce(
    (acc, m) => (totalCompleted >= m.required ? m.node : acc),
    0
  );

  const milestones = MILESTONES.map((m) => ({
    ...m,
    unlocked: totalCompleted >= m.required,
    current: m.node === currentNode,
  }));

  return (
    <div className="pt-2">
      {/* Header */}
      <div className="flex items-center justify-between py-4 sticky top-0 z-10" style={{ background: "var(--bg)" }}>
        <h1 className="text-xl font-bold md:text-2xl">🌟 쌍둥이별</h1>
        <span />
      </div>

      <div className="text-center mb-4 text-gray-500 text-sm">
        <span>⭐ {sihyunCount}개</span>
        <span className="mx-1">+</span>
        <span>🍫 {misongCount}개</span>
        <span className="mx-1">=</span>
        <strong className="text-base">🌟 {totalCompleted}개</strong>
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
