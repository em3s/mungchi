export type BadgeGrade = "common" | "rare" | "epic" | "legendary";
export type BadgeCategory = "daily" | "streak" | "milestone" | "weekly" | "special";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  /** 미획득 상태에서 보여줄 힌트 (달성 조건) */
  hint: string;
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
  /** 역대 데이터가 있는 날 수 */
  totalActiveDays: number;
  /** 이번 주 달성률 (0~1) */
  weekRate: number;
  /** 상대방 아이의 오늘 달성률 */
  siblingTodayRate: number;
  /** 어제 달성률 (0~1) */
  yesterdayRate: number;
  /** 오늘 요일 (0=일, 6=토) */
  todayDayOfWeek: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ============================================================
  // 일일 (daily) — 매일 반복 획득 가능
  // ============================================================
  {
    id: "daily-first",
    name: "첫 발걸음",
    description: "오늘 할일을 1개 이상 완료했어요!",
    hint: "할일을 딱 하나만 끝내봐! 시작이 반이야~ 🐣",
    emoji: "👶",
    grade: "common",
    category: "daily",
    condition: (ctx) => ctx.todayCompleted >= 1,
    repeatable: true,
  },
  {
    id: "daily-half",
    name: "반은 했다!",
    description: "오늘 할일의 절반 이상을 완료했어요!",
    hint: "오늘 할일의 반만 해보자! 반만~! ✌️",
    emoji: "👍",
    grade: "common",
    category: "daily",
    condition: (ctx) => ctx.todayTotal > 0 && ctx.todayRate >= 0.5,
    repeatable: true,
  },
  {
    id: "daily-perfect",
    name: "오늘의 올클리어!",
    description: "오늘 할일을 모두 완료했어요!",
    hint: "오늘 할일을 전~부 끝내면 딸 수 있어! 화이팅! 🌟",
    emoji: "🌟",
    grade: "common",
    category: "daily",
    condition: (ctx) => ctx.todayTotal > 0 && ctx.todayRate === 1,
    repeatable: true,
  },
  {
    id: "daily-busy",
    name: "바쁜 하루",
    description: "할일이 5개 이상인 날 올클리어!",
    hint: "할일이 5개 이상인 날에 전부 클리어! 바쁜데 대단해~ 💪",
    emoji: "💪",
    grade: "rare",
    category: "daily",
    condition: (ctx) => ctx.todayTotal >= 5 && ctx.todayRate === 1,
    repeatable: true,
  },
  {
    id: "daily-mega",
    name: "슈퍼 미션",
    description: "할일이 8개 이상인 날 올클리어!",
    hint: "할일 8개 이상을 한 방에?! 슈퍼히어로만 가능해! 🦸",
    emoji: "🦸",
    grade: "epic",
    category: "daily",
    condition: (ctx) => ctx.todayTotal >= 8 && ctx.todayRate === 1,
    repeatable: true,
  },
  {
    id: "daily-ultra",
    name: "울트라 클리어",
    description: "할일이 10개 이상인 날 올클리어!",
    hint: "할일 10개를 전부?! 두 자릿수 올클은 진짜 대단해! 🔟",
    emoji: "🔟",
    grade: "epic",
    category: "daily",
    condition: (ctx) => ctx.todayTotal >= 10 && ctx.todayRate === 1,
    repeatable: true,
  },
  {
    id: "daily-monster",
    name: "몬스터 데이",
    description: "할일이 12개 이상인 날 올클리어!",
    hint: "12개나 되는 할일을 다 해치우다니... 넌 몬스터야! 👹",
    emoji: "👹",
    grade: "legendary",
    category: "daily",
    condition: (ctx) => ctx.todayTotal >= 12 && ctx.todayRate === 1,
    repeatable: true,
  },
  {
    id: "daily-god",
    name: "갓 오브 투두",
    description: "할일이 15개 이상인 날 올클리어!",
    hint: "15개 올클?! 이건 인간의 영역을 넘어선 거야... 🙇",
    emoji: "🙇",
    grade: "legendary",
    category: "daily",
    condition: (ctx) => ctx.todayTotal >= 15 && ctx.todayRate === 1,
    repeatable: true,
  },

  // ============================================================
  // 연속 (streak) — 1회만 획득
  // ============================================================
  {
    id: "streak-3",
    name: "3일 연속!",
    description: "3일 연속 모든 할일을 완료했어요!",
    hint: "3일 연속으로 올클리어 해봐! 불꽃이 붙을 거야 🔥",
    emoji: "🔥",
    grade: "common",
    category: "streak",
    condition: (ctx) => ctx.streak >= 3,
    repeatable: false,
  },
  {
    id: "streak-5",
    name: "5일 연속!",
    description: "5일 연속 올클리어! 습관이 생기고 있어요!",
    hint: "5일 연속 올클! 평일을 완벽하게 🔥🔥",
    emoji: "🔥",
    grade: "rare",
    category: "streak",
    condition: (ctx) => ctx.streak >= 5,
    repeatable: false,
  },
  {
    id: "streak-7",
    name: "일주일 완주!",
    description: "7일 연속 올클리어! 대단해요!",
    hint: "일주일 내내 올클리어! 할 수 있겠지?! 🏆",
    emoji: "🏆",
    grade: "rare",
    category: "streak",
    condition: (ctx) => ctx.streak >= 7,
    repeatable: false,
  },
  {
    id: "streak-10",
    name: "10일 연속!",
    description: "10일 연속 올클리어! 멈출 수 없어!",
    hint: "10일 동안 하루도 빠짐없이! 진짜 끈기가 필요해 💫",
    emoji: "💫",
    grade: "rare",
    category: "streak",
    condition: (ctx) => ctx.streak >= 10,
    repeatable: false,
  },
  {
    id: "streak-14",
    name: "2주 연속!",
    description: "14일 연속 올클리어! 이제 습관이에요!",
    hint: "2주 연속 올클리어! 습관이 되려면 여기까지! ⚡",
    emoji: "⚡",
    grade: "epic",
    category: "streak",
    condition: (ctx) => ctx.streak >= 14,
    repeatable: false,
  },
  {
    id: "streak-21",
    name: "3주 연속!",
    description: "21일 연속 올클리어! 완벽한 습관!",
    hint: "21일이면 습관이 완성된대! 도전해볼래? 🌊",
    emoji: "🌊",
    grade: "epic",
    category: "streak",
    condition: (ctx) => ctx.streak >= 21,
    repeatable: false,
  },
  {
    id: "streak-30",
    name: "한 달의 기적",
    description: "30일 연속 올클리어! 정말 놀라워요!",
    hint: "한 달(30일) 연속 올클리어! 기적을 만들어봐! 👑",
    emoji: "👑",
    grade: "epic",
    category: "streak",
    condition: (ctx) => ctx.streak >= 30,
    repeatable: false,
  },
  {
    id: "streak-60",
    name: "두 달의 전설",
    description: "60일 연속 올클리어! 전설이 되고 있어요!",
    hint: "60일 연속?! 진짜 전설만 가능한 거야... 🐉",
    emoji: "🐉",
    grade: "legendary",
    category: "streak",
    condition: (ctx) => ctx.streak >= 60,
    repeatable: false,
  },
  {
    id: "streak-100",
    name: "100일 신화",
    description: "100일 연속 올클리어! 신화를 썼어요!",
    hint: "100일 연속 올클리어... 이건 신화야. 감히 도전할 수 있어? 🦄",
    emoji: "🦄",
    grade: "legendary",
    category: "streak",
    condition: (ctx) => ctx.streak >= 100,
    repeatable: false,
  },

  // ============================================================
  // 마일스톤 — 누적 완료 개수 (1회만)
  // ============================================================
  {
    id: "total-10",
    name: "10개 돌파",
    description: "총 10개의 할일을 완료했어요!",
    hint: "할일을 총 10개 끝내봐! 두 자릿수 진입~ 🎯",
    emoji: "🎯",
    grade: "common",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 10,
    repeatable: false,
  },
  {
    id: "total-25",
    name: "25개 돌파",
    description: "총 25개의 할일을 완료했어요!",
    hint: "누적 25개 완료! 꾸준히 하면 금방이야 🎯",
    emoji: "🎯",
    grade: "common",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 25,
    repeatable: false,
  },
  {
    id: "total-50",
    name: "50개 돌파",
    description: "총 50개의 할일을 완료했어요!",
    hint: "반백! 할일 50개를 모아봐! 🎯",
    emoji: "🎯",
    grade: "rare",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 50,
    repeatable: false,
  },
  {
    id: "total-100",
    name: "100개 돌파",
    description: "총 100개의 할일을 완료! 대단해요!",
    hint: "드디어 세 자릿수! 할일 100개를 클리어해봐! 💯",
    emoji: "💯",
    grade: "rare",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 100,
    repeatable: false,
  },
  {
    id: "total-200",
    name: "200개 돌파",
    description: "200개 완료! 멈출 수 없는 실행력!",
    hint: "할일 200개 완료! 실행력이 대단해~ 🏅",
    emoji: "🏅",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 200,
    repeatable: false,
  },
  {
    id: "total-300",
    name: "300개 돌파",
    description: "300개 완료! 진정한 실력자!",
    hint: "300개 완료하면 진정한 실력자! 🥈",
    emoji: "🥈",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 300,
    repeatable: false,
  },
  {
    id: "total-500",
    name: "500개 돌파",
    description: "500개 완료! 최고의 도전자!",
    hint: "500개?! 이건 진짜 최고만 달성할 수 있어! 🥇",
    emoji: "🥇",
    grade: "legendary",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 500,
    repeatable: false,
  },
  {
    id: "total-1000",
    name: "1000개 돌파",
    description: "1000개 완료! 역사에 남을 기록!",
    hint: "천 개... 이건 역사에 남을 기록이야. 네가 해낼 수 있을까? 💎",
    emoji: "💎",
    grade: "legendary",
    category: "milestone",
    condition: (ctx) => ctx.totalCompleted >= 1000,
    repeatable: false,
  },

  // ============================================================
  // 마일스톤 — 올클리어 일수 (1회만)
  // ============================================================
  {
    id: "perfect-1",
    name: "첫 올클리어",
    description: "처음으로 하루 할일을 모두 완료했어요!",
    hint: "하루 할일을 전부 끝내본 적 있어? 첫 올클에 도전! 🎉",
    emoji: "🎉",
    grade: "common",
    category: "milestone",
    condition: (ctx) => ctx.totalPerfectDays >= 1,
    repeatable: false,
  },
  {
    id: "perfect-5",
    name: "올클 5일",
    description: "5일이나 올클리어! 꾸준해요!",
    hint: "올클리어한 날이 5일이 되면! 연속 아니어도 돼~ ⭐",
    emoji: "⭐",
    grade: "common",
    category: "milestone",
    condition: (ctx) => ctx.totalPerfectDays >= 5,
    repeatable: false,
  },
  {
    id: "perfect-10",
    name: "올클 10일",
    description: "10일 올클리어! 진짜 잘하고 있어요!",
    hint: "올클리어한 날 10일 달성! 두 자릿수 올클러! 🌟",
    emoji: "🌟",
    grade: "rare",
    category: "milestone",
    condition: (ctx) => ctx.totalPerfectDays >= 10,
    repeatable: false,
  },
  {
    id: "perfect-20",
    name: "올클 20일",
    description: "20일 올클리어! 습관의 달인!",
    hint: "20일이나 올클리어! 이 정도면 습관의 달인이지~ ✨",
    emoji: "✨",
    grade: "rare",
    category: "milestone",
    condition: (ctx) => ctx.totalPerfectDays >= 20,
    repeatable: false,
  },
  {
    id: "perfect-30",
    name: "올클 30일",
    description: "30일 올클리어! 한 달치를 해냈어요!",
    hint: "한 달치(30일) 올클리어! 진짜 대단한 거야~ 💫",
    emoji: "💫",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.totalPerfectDays >= 30,
    repeatable: false,
  },
  {
    id: "perfect-50",
    name: "올클 50일",
    description: "50일 올클리어! 진정한 챔피언!",
    hint: "50일 올클리어! 진정한 챔피언만이 도달할 수 있어! 🏆",
    emoji: "🏆",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.totalPerfectDays >= 50,
    repeatable: false,
  },
  {
    id: "perfect-100",
    name: "올클 100일",
    description: "100일 올클리어! 전설의 마스터!",
    hint: "100일 올클리어... 전설의 마스터가 될 준비 됐어? 👑",
    emoji: "👑",
    grade: "legendary",
    category: "milestone",
    condition: (ctx) => ctx.totalPerfectDays >= 100,
    repeatable: false,
  },

  // ============================================================
  // 마일스톤 — 참여 일수 (1회만)
  // ============================================================
  {
    id: "active-7",
    name: "1주일 참여",
    description: "7일 동안 할일이 있었어요!",
    hint: "뭉치와 함께한 지 7일! 벌써 일주일~ 📅",
    emoji: "📅",
    grade: "common",
    category: "milestone",
    condition: (ctx) => ctx.totalActiveDays >= 7,
    repeatable: false,
  },
  {
    id: "active-14",
    name: "2주 참여",
    description: "14일 동안 꾸준히 참여했어요!",
    hint: "2주(14일) 동안 꾸준히! 대단한 끈기야! 📅",
    emoji: "📅",
    grade: "common",
    category: "milestone",
    condition: (ctx) => ctx.totalActiveDays >= 14,
    repeatable: false,
  },
  {
    id: "active-30",
    name: "한 달 참여",
    description: "30일 동안 함께했어요!",
    hint: "뭉치와 한 달(30일)을 함께! 우리 친구 맞지? 📆",
    emoji: "📆",
    grade: "rare",
    category: "milestone",
    condition: (ctx) => ctx.totalActiveDays >= 30,
    repeatable: false,
  },
  {
    id: "active-60",
    name: "두 달 참여",
    description: "60일 동안 꾸준히!",
    hint: "60일이나 함께! 이제 떼려야 뗄 수 없는 사이~ 📆",
    emoji: "📆",
    grade: "epic",
    category: "milestone",
    condition: (ctx) => ctx.totalActiveDays >= 60,
    repeatable: false,
  },
  {
    id: "active-100",
    name: "100일 참여",
    description: "100일 동안 함께한 우리!",
    hint: "100일 기념! 뭉치와 백일잔치 하자! 🗓️",
    emoji: "🗓️",
    grade: "legendary",
    category: "milestone",
    condition: (ctx) => ctx.totalActiveDays >= 100,
    repeatable: false,
  },

  // ============================================================
  // 주간 (weekly) — 매주 반복 획득 가능
  // ============================================================
  {
    id: "weekly-good",
    name: "좋은 한 주",
    description: "이번 주 달성률 70% 이상!",
    hint: "이번 주 달성률을 70% 이상 만들어봐! 📈",
    emoji: "📈",
    grade: "common",
    category: "weekly",
    condition: (ctx) => ctx.weekRate >= 0.7,
    repeatable: true,
  },
  {
    id: "weekly-mvp",
    name: "주간 MVP",
    description: "이번 주 달성률 90% 이상!",
    hint: "이번 주 달성률 90% 이상이면 MVP! 거의 다 해야 해! 🥇",
    emoji: "🥇",
    grade: "rare",
    category: "weekly",
    condition: (ctx) => ctx.weekRate >= 0.9,
    repeatable: true,
  },
  {
    id: "weekly-perfect",
    name: "완벽한 한 주",
    description: "이번 주 달성률 100%! 퍼펙트!",
    hint: "일주일 동안 하나도 빠짐없이! 100% 퍼펙트 위크! 💯",
    emoji: "💯",
    grade: "epic",
    category: "weekly",
    condition: (ctx) => ctx.weekRate === 1,
    repeatable: true,
  },

  // ============================================================
  // 스페셜 (special) — 특수 조건
  // ============================================================
  {
    id: "phoenix",
    name: "불사조",
    description: "어제 50% 미만이었는데 오늘 올클리어! 멋진 컴백!",
    hint: "어제 좀 못했어도 괜찮아! 오늘 올클하면 불사조 등장! 🔥",
    emoji: "🔥",
    grade: "epic",
    category: "special",
    condition: (ctx) =>
      ctx.yesterdayRate < 0.5 && ctx.todayRate === 1 && ctx.todayTotal > 0,
    repeatable: true,
  },
  {
    id: "comeback",
    name: "돌아온 전사",
    description: "어제 0%였는데 오늘 절반 이상 해냈어요!",
    hint: "어제 하나도 못했어? 오늘 반 이상 하면 전사로 부활! ⚔️",
    emoji: "⚔️",
    grade: "rare",
    category: "special",
    condition: (ctx) =>
      ctx.yesterdayRate === 0 && ctx.todayRate >= 0.5 && ctx.todayTotal > 0,
    repeatable: true,
  },
  {
    id: "together",
    name: "우리 함께!",
    description: "시현이와 미송이 모두 오늘 100% 달성!",
    hint: "형제자매 모두 올클리어! 둘이 힘을 합쳐봐! 🤝",
    emoji: "🤝",
    grade: "legendary",
    category: "special",
    condition: (ctx) =>
      ctx.todayRate === 1 &&
      ctx.siblingTodayRate === 1 &&
      ctx.todayTotal > 0,
    repeatable: true,
  },
  {
    id: "weekend-warrior",
    name: "주말 전사",
    description: "주말에도 올클리어! 쉬는 날도 열심히!",
    hint: "토요일이나 일요일에 올클리어! 놀고 싶은데 대단해~ 🛡️",
    emoji: "🛡️",
    grade: "rare",
    category: "special",
    condition: (ctx) =>
      (ctx.todayDayOfWeek === 0 || ctx.todayDayOfWeek === 6) &&
      ctx.todayRate === 1 &&
      ctx.todayTotal > 0,
    repeatable: true,
  },
  {
    id: "monday-fighter",
    name: "월요일 파이터",
    description: "월요일에 올클리어! 한 주의 시작이 완벽!",
    hint: "월요일은 힘들잖아~ 그래도 올클하면 파이터! 💥",
    emoji: "💥",
    grade: "rare",
    category: "special",
    condition: (ctx) =>
      ctx.todayDayOfWeek === 1 &&
      ctx.todayRate === 1 &&
      ctx.todayTotal > 0,
    repeatable: true,
  },
  {
    id: "friday-finish",
    name: "금요일 피니셔",
    description: "금요일에 올클리어! 한 주의 마무리가 완벽!",
    hint: "불금인데 할일도 다 끝내?! 마무리의 달인! 🎊",
    emoji: "🎊",
    grade: "rare",
    category: "special",
    condition: (ctx) =>
      ctx.todayDayOfWeek === 5 &&
      ctx.todayRate === 1 &&
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
