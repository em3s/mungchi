"use client";

interface ProgressRingProps {
  rate: number;
  size?: number;
  stroke?: number;
}

export function ProgressRing({
  rate = 0,
  size = 160,
  stroke = 12,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - rate);
  const pct = Math.round(rate * 100);

  return (
    <div className="flex justify-center my-4 mb-6">
      <div
        className="relative md:w-[200px] md:h-[200px]"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 w-full h-full"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e9e5f5"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent, #6c5ce7)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="progress-ring-fill"
          />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div
            className="text-4xl font-extrabold md:text-5xl"
            style={{ color: "var(--accent, #6c5ce7)" }}
          >
            {pct}%
          </div>
          <div className="text-xs text-gray-500 md:text-sm">
            {rate === 1 ? "올클리어!" : "달성률"}
          </div>
        </div>
      </div>
    </div>
  );
}
