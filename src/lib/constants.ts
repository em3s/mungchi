import type { User } from "./types";

export const USERS: Omit<User, "pin" | "created_at">[] = [
  {
    id: "sihyun",
    name: "시현",
    role: "child",
    theme: "purple",
    emoji: "⭐",
    starName: "반짝별",
    descriptor: "반짝별 수호자",
  },
  {
    id: "misong",
    name: "미송",
    role: "child",
    theme: "orange",
    emoji: "✨",
    starName: "반짝별",
    descriptor: "반짝별 탐험가",
  },
  {
    id: "dad",
    name: "아빠",
    role: "parent",
    theme: "navy",
    emoji: "🛡️",
    starName: "든든별",
    descriptor: "쌍둥이별 이끔이",
  },
  {
    id: "mom",
    name: "엄마",
    role: "parent",
    theme: "rose",
    emoji: "💖",
    starName: "따뜻별",
    descriptor: "쌍둥이별 지킴이",
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
  // Act 1: 두 별의 시작
  { node: 1, label: "두 별의 출발!", required: 0, emoji: "🚀" },
  { node: 2, label: "반짝반짝", required: 10, emoji: "💫" },
  { node: 3, label: "달콤한 한 걸음", required: 30, emoji: "🍫" },
  { node: 4, label: "별빛이 자라요", required: 60, emoji: "🌱" },
  { node: 5, label: "쑥쑥 빛나기", required: 100, emoji: "🌿" },
  { node: 6, label: "별들의 달리기", required: 150, emoji: "🏃" },
  { node: 7, label: "빛나는 별들!", required: 200, emoji: "🌈" },
  // Act 2: 두 별이 만나다
  { node: 8, label: "별빛 습관", required: 300, emoji: "⭐" },
  { node: 9, label: "반짝이는 길", required: 400, emoji: "🎯" },
  { node: 10, label: "두 별의 만남", required: 500, emoji: "🤝" },
  { node: 11, label: "함께라서 빛나!", required: 650, emoji: "🔥" },
  { node: 12, label: "별의 약속", required: 800, emoji: "🏆" },
  // Act 3: 쌍둥이별 각성
  { node: 13, label: "쌍둥이별 각성!", required: 1000, emoji: "👑" },
  { node: 14, label: "별을 초월하다", required: 1300, emoji: "⚡" },
  { node: 15, label: "쌍둥이별 전설", required: 1600, emoji: "🐉" },
  { node: 16, label: "쌍둥이별 신화", required: 2000, emoji: "🦄" },
  { node: 17, label: "우주를 비추다", required: 2500, emoji: "🪐" },
  // Act 4: 쌍둥이별의 여행
  { node: 18, label: "은하수를 건너", required: 3000, emoji: "🌌" },
  { node: 19, label: "시간을 초월", required: 3500, emoji: "⏳" },
  { node: 20, label: "별의 전사", required: 4000, emoji: "⚔️" },
  { node: 21, label: "무한의 빛", required: 4500, emoji: "♾️" },
  { node: 22, label: "쌍둥이별 완성!", required: 5000, emoji: "🌟" },
];

export const PERSONAL_MILESTONES = [
  // Act 1: 나의 시작
  { node: 1, label: "나의 첫 걸음!", required: 0, emoji: "🚀" },
  { node: 2, label: "반짝반짝", required: 5, emoji: "💫" },
  { node: 3, label: "달콤한 한 걸음", required: 15, emoji: "🍫" },
  { node: 4, label: "빛이 자라요", required: 30, emoji: "🌱" },
  { node: 5, label: "쑥쑥 빛나기", required: 50, emoji: "🌿" },
  { node: 6, label: "나의 달리기", required: 75, emoji: "🏃" },
  { node: 7, label: "빛나는 나!", required: 100, emoji: "🌈" },
  // Act 2: 성장하다
  { node: 8, label: "빛의 습관", required: 150, emoji: "⭐" },
  { node: 9, label: "반짝이는 길", required: 200, emoji: "🎯" },
  { node: 10, label: "나만의 별", required: 250, emoji: "✨" },
  { node: 11, label: "빛나는 의지!", required: 325, emoji: "🔥" },
  { node: 12, label: "별의 약속", required: 400, emoji: "🏆" },
  // Act 3: 각성
  { node: 13, label: "별의 각성!", required: 500, emoji: "👑" },
  { node: 14, label: "별을 초월하다", required: 650, emoji: "⚡" },
  { node: 15, label: "나의 전설", required: 800, emoji: "🐉" },
  { node: 16, label: "나의 신화", required: 1000, emoji: "🦄" },
  { node: 17, label: "우주를 비추다", required: 1250, emoji: "🪐" },
  // Act 4: 완성의 여행
  { node: 18, label: "은하수를 건너", required: 1500, emoji: "🌌" },
  { node: 19, label: "시간을 초월", required: 1750, emoji: "⏳" },
  { node: 20, label: "별의 전사", required: 2000, emoji: "⚔️" },
  { node: 21, label: "무한의 빛", required: 2250, emoji: "♾️" },
  { node: 22, label: "나의 별 완성!", required: 2500, emoji: "🌟" },
];

export const CONFETTI_EMOJIS = [
  "🎉", "⭐", "✨", "🌟", "🎊", "💫",
  "🎉", "⭐", "✨", "🌟", "🎊", "💫",
];

export const CATEGORY_LABELS: Record<string, string> = {
  daily: "📋 일일",
  streak: "🔥 연속",
  milestone: "🏔️ 발자취",
  weekly: "📈 주간",
  special: "✨ 스페셜",
};

export const CATEGORY_ORDER = ["daily", "streak", "milestone", "weekly", "special"];

export const GRADE_LABELS: Record<string, string> = {
  common: "일반",
  rare: "희귀",
  epic: "영웅",
  legendary: "전설",
};

export const THEME_PRESETS = [
  { id: "purple", label: "보라", accent: "#6c5ce7" },
  { id: "orange", label: "오렌지", accent: "#e17055" },
  { id: "navy", label: "네이비", accent: "#4a69bd" },
  { id: "rose", label: "로즈", accent: "#f78fb3" },
  { id: "yellow", label: "노랑", accent: "#f39c12" },
  { id: "pink", label: "핑크", accent: "#e84393" },
  { id: "green", label: "초록", accent: "#00b894" },
  { id: "sky", label: "하늘", accent: "#0984e3" },
] as const;
