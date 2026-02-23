"use client";

import type { ReactNode } from "react";
import { MapNode } from "@/components/MapNode";

interface RawMilestone {
  node: number;
  label: string;
  required: number;
  emoji: string;
}

interface MilestoneMapProps {
  rawMilestones: RawMilestone[];
  completed: number;
  header: ReactNode;
  subheader: ReactNode;
}

export function MilestoneMap({
  rawMilestones,
  completed,
  header,
  subheader,
}: MilestoneMapProps) {
  const currentNode = rawMilestones.reduce(
    (acc, m) => (completed >= m.required ? m.node : acc),
    0,
  );

  const milestones = rawMilestones.map((m) => ({
    ...m,
    unlocked: completed >= m.required,
    current: m.node === currentNode,
  }));

  return (
    <div className="pt-2">
      <div
        className="flex items-center justify-between py-4 sticky top-0 z-10"
        style={{ background: "var(--bg)" }}
      >
        {header}
        <span />
      </div>

      <div className="text-center mb-4 text-gray-500 text-sm">
        {subheader}
      </div>

      <div className="flex flex-col items-center py-4">
        {milestones.map((m, i) => (
          <MapNode
            key={m.node}
            milestone={m}
            isLast={i === milestones.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
