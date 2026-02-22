export type BadgeGrade = "common" | "rare" | "epic" | "legendary";
export type BadgeCategory = "daily" | "streak" | "milestone" | "weekly" | "special";

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
  /** 현재 KST 시 (0~23) */
  currentHourKST: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  hint: string;
  emoji: string;
  grade: BadgeGrade;
  category: BadgeCategory;
  condition: (ctx: BadgeContext) => boolean;
  repeatable: boolean;
  hidden?: boolean;
}

/** 뱃지 엔진에 전달할 일별 요약 */
export interface DayTaskSummary {
  date: string;
  total: number;
  completed: number;
  tasks: { completed: boolean; completedAt?: string | null }[];
}
