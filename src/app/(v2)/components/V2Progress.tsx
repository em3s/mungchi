"use client";

import { Card, Progressbar, Chip } from "konsta/react";

interface V2ProgressProps {
  rate: number;
  completedCount: number;
  totalCount: number;
}

export function V2Progress({ rate, completedCount, totalCount }: V2ProgressProps) {
  const pct = Math.round(rate * 100);

  return (
    <Card raised className="!mx-0 !mb-4" contentWrap={false}>
      <div className="p-4">
        <div className="text-center mb-3">
          <span
            className="text-4xl font-extrabold md:text-5xl"
            style={{ color: "var(--accent, #6c5ce7)" }}
          >
            {pct}%
          </span>
          <div className="text-xs text-gray-500 mt-0.5 md:text-sm">
            {rate === 1 ? "올클리어!" : "달성률"}
          </div>
        </div>

        <Progressbar progress={rate} />

        <div className="flex justify-center gap-2 mt-3">
          <Chip className="!text-xs">
            {completedCount} / {totalCount} 완료
          </Chip>
        </div>
      </div>
    </Card>
  );
}
