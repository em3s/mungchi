"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase/client";
import { MILESTONES } from "@/lib/constants";
import { BottomNav } from "@/components/BottomNav";
import { MapNode } from "@/components/MapNode";

export default function MapPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const [totalCompleted, setTotalCompleted] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("child_id", childId)
        .eq("completed", true);

      setTotalCompleted(count ?? 0);
    }
    load();
  }, [childId]);

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
        <h1 className="text-xl font-bold md:text-2xl">🗺️ 달성 맵</h1>
        <span />
      </div>

      <div className="text-center mb-4 text-gray-500">
        총 완료: <strong>{totalCompleted}</strong>개
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
