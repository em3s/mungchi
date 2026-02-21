export type BadgeGrade = "common" | "rare" | "epic" | "legendary";
export type BadgeCategory = "daily" | "streak" | "milestone" | "special";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  grade: BadgeGrade;
  category: BadgeCategory;
  /** 조건 평가 함수. context에서 필요한 데이터를 받음 */
  condition: (ctx: BadgeContext) => boolean;
  /** 같은 뱃지를 여러 번 받을 수 있는지 */
  repeatable: boolean;
}

export interface BadgeContext {
  /** 오늘 할일 총 개수 */
  todayTotal: number;
  /** 오늘 완료 개수 */
  todayCompleted: number;
  /** 오늘 달성률 (0~1) */
  todayRate: number;
  /** 연속 올클리어 일수 */
  streak: number;
  /** 역대 누적 완료 개수 */
  totalCompleted: number;
  /** 역대 올클리어 횟수 */
  totalPerfectDays: number;
  /** 이번 주 달성률 (0~1) */
  weekRate: number;
  /** 상대방 아이의 오늘 달성률 */
  siblingTodayRate: number;
  /** 어제 달성률 (0~1) */
  yesterdayRate: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // === 일일 (daily) ===
  {
    id: "daily-perfect",
    name: "오늘의 올클리어!",
    description: "오늘 할일을 모두 완료했어요!",
    emoji: "🌟",
    grade: "common",
    category: "daily",
    condition: (ctx) => ctx.todayTotal > 0 && ctx.todayRate === 1,
    repeatable: true,
  },
  {
    id: "daily-half",
    name: "반은 했다!",
    description: "오늘 할일의 절반 이상을 완료했어요!",
    emoji: "👍",
    grade: "common",
    category: "daily",
    condition: (ctx) => ctx.todayTotal > 0 && ctx.todayRate >= 0.5,
    repeatable: true,
  },

  // === 연속 (streak) ===
  {
    id: "streak-3",
    name: "3일 연속!",
    description: "3일 연속 모든 할일을 완료했어요!",
    emoji: "🔥",
    grade: "rare",
    category: "streak",
    condition: (ctx) => ctx.streak >= 3,
    repeatable: false,
  },
  {
    id: "streak-7",
    name: "일주일 완주!",
    description: "7일 연속 올클리어! 대단해요!",
    emoji: "🏆",
    grade: "rare",
    category: "streak",
    condition: (ctx) => ctx.streak >= 7,
    repeatable: false,
  },
  {
    id: "streak-30",
    name: "한 달의 기적",
    description: "30일 연속 올클리어! 정말 놀라워요!",
    emoji: "👑",
    grade: "epic",
    category: "streak",
    condition: (ctx) => ctx.streak >= 30,
    repeatable: false,
  },

  // === 마일스톤 (milestone) ===
  {
    id: "first-perfect",
    name: "첫 올클리어",
    description: "처음으로 하루 할일을 모두 완료했어요!",
    emoji: "🎉",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.totalPerfectDays >= 1,
    repeatable: false,
  },
  {
    id: "total-50",
    name: "50개 돌파",
    description: "총 50개의 할일을 완료했어요!",
    emoji: "🎯",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 50,
    repeatable: false,
  },
  {
    id: "total-100",
    name: "100개 돌파",
    description: "총 100개의 할일을 완료했어요!",
    emoji: "💯",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 100,
    repeatable: false,
  },
  {
    id: "weekly-mvp",
    name: "주간 MVP",
    description: "이번 주 달성률 90% 이상!",
    emoji: "🥇",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.weekRate >= 0.9,
    repeatable: true,
  },

  // === 스페셜 (special) ===
  {
    id: "phoenix",
    name: "불사조",
    description: "어제 50% 미만이었는데 오늘 올클리어! 멋진 컴백!",
    emoji: "🔥",
    grade: "legendary",
    category: "special",
    condition: (ctx) =>
      ctx.yesterdayRate < 0.5 && ctx.todayRate === 1 && ctx.todayTotal > 0,
    repeatable: true,
  },
  {
    id: "together",
    name: "우리 함께!",
    description: "시현이와 미송이 모두 오늘 100% 달성!",
    emoji: "🤝",
    grade: "legendary",
    category: "special",
    condition: (ctx) =>
      ctx.todayRate === 1 &&
      ctx.siblingTodayRate === 1 &&
      ctx.todayTotal > 0,
    repeatable: true,
  },
];

export const GRADE_ORDER: Record<BadgeGrade, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};
