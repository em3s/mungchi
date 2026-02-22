import type { Child } from "./types";

export const CHILDREN: Omit<Child, "pin" | "created_at">[] = [
  {
    id: "sihyun",
    name: "시현",
    theme: "starry",
    emoji: "⭐",
  },
  {
    id: "misong",
    name: "미송",
    theme: "choco",
    emoji: "🍫",
  },
];

export const PIN = "999999";

export const CHEERS = {
  perfect: [
    "와! 올클리어! 넌 진짜 최고야! 🎉",
    "완벽해! 오늘 정말 멋졌어! ✨",
    "대박! 전부 다 해냈어! 👏",
    "우와~ 100%! 자랑스러워! 🌟",
    "올클! 이 기세로 내일도 화이팅! 🔥",
  ],
  good: [
    "잘하고 있어! 조금만 더! 💪",
    "절반 넘었어! 끝까지 가보자! 🏃",
    "좋아좋아~ 이 조자! 👍",
    "대단해! 거의 다 왔어! ⭐",
  ],
  start: [
    "시작이 반이야! 하나씩 해보자! 🐣",
    "첫 발을 내딛었어! 잘하고 있어! 👣",
    "좋아~ 하나 했다! 계속 가보자! 🌱",
  ],
  zero: [
    "오늘도 파이팅! 하나부터 시작해볼까? 💫",
    "할 수 있어! 첫 번째를 눌러봐! ✊",
    "준비됐지? 시작해보자! 🚀",
    "오늘의 모험이 기다리고 있어! 🗺️",
  ],
};

export function getCheer(rate: number): string {
  const list =
    rate === 1
      ? CHEERS.perfect
      : rate >= 0.5
        ? CHEERS.good
        : rate > 0
          ? CHEERS.start
          : CHEERS.zero;
  return list[Math.floor(Math.random() * list.length)];
}

export const MILESTONES = [
  { node: 1, label: "출발!", required: 0, emoji: "🚀" },
  { node: 2, label: "첫 걸음", required: 10, emoji: "👣" },
  { node: 3, label: "힘을 내요", required: 30, emoji: "💪" },
  { node: 4, label: "잘하고 있어!", required: 60, emoji: "🌱" },
  { node: 5, label: "쑥쑥 성장", required: 100, emoji: "🌿" },
  { node: 6, label: "달리기 시작!", required: 150, emoji: "🏃" },
  { node: 7, label: "대단해!", required: 200, emoji: "🌈" },
  { node: 8, label: "습관의 힘", required: 300, emoji: "⭐" },
  { node: 9, label: "반쯤 왔다!", required: 400, emoji: "🎯" },
  { node: 10, label: "슈퍼스타", required: 500, emoji: "🌟" },
  { node: 11, label: "멈출 수 없어!", required: 650, emoji: "🔥" },
  { node: 12, label: "전설의 시작", required: 800, emoji: "🏆" },
  { node: 13, label: "마스터", required: 1000, emoji: "👑" },
  { node: 14, label: "초월자", required: 1300, emoji: "⚡" },
  { node: 15, label: "레전드", required: 1600, emoji: "🐉" },
  { node: 16, label: "신화", required: 2000, emoji: "🦄" },
  { node: 17, label: "우주 정복!", required: 2500, emoji: "🪐" },
];

export const CONFETTI_EMOJIS = [
  "🎉", "⭐", "✨", "🌟", "🎊", "💫",
  "🎉", "⭐", "✨", "🌟", "🎊", "💫",
];

export const CATEGORY_LABELS: Record<string, string> = {
  daily: "📋 일일",
  streak: "🔥 연속",
  milestone: "🏔️ 마일스톤",
  weekly: "📈 주간",
  special: "✨ 스페셜",
};

export const CATEGORY_ORDER = ["daily", "streak", "milestone", "weekly", "special"];

export const GRADE_LABELS: Record<string, string> = {
  common: "일반",
  rare: "레어",
  epic: "에픽",
  legendary: "전설",
};
