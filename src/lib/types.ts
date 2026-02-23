// === DB 스키마 타입 ===

export interface Child {
  id: string;
  name: string;
  theme: "starry" | "choco";
  emoji: string;
  starName: string;
  pin: string;
  created_at?: string;
}

export interface Task {
  id: string;
  child_id: string;
  title: string;
  date: string; // YYYY-MM-DD (KST)
  completed: boolean;
  completed_at: string | null;
  priority: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BadgeRecord {
  id: string;
  badge_id: string;
  child_id: string;
  earned_at: string;
  earned_date: string; // YYYY-MM-DD (KST)
  context: Record<string, unknown> | null;
  created_at?: string;
}

// === 프론트엔드 타입 ===

export interface DayStats {
  total: number;
  completed: number;
  rate: number;
}

export interface MonthDays {
  [date: string]: DayStats;
}

export interface BadgeInfo {
  badgeId: string;
  name: string;
  description: string;
  hint: string;
  emoji: string;
  grade: "common" | "rare" | "epic" | "legendary";
  category: "daily" | "streak" | "milestone" | "weekly" | "special";
  repeatable: boolean;
  hidden: boolean;
  earned: boolean;
  earnedCount: number;
  earnedAt: string | null;
}

export interface Milestone {
  node: number;
  label: string;
  required: number;
  emoji: string;
  unlocked: boolean;
  current: boolean;
}

// === 별사탕 (coin) 타입 ===

export type CoinTransactionType =
  | "task_complete"
  | "task_uncomplete"
  | "allclear_bonus"
  | "exchange"
  | "admin_adjust";

export interface CoinTransaction {
  id: string;
  child_id: string;
  amount: number;
  type: CoinTransactionType;
  reason: string | null;
  ref_id: string | null;
  created_at: string;
}

export interface CoinReward {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CoinBalance {
  child_id: string;
  balance: number;
  updated_at: string;
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  date: string; // YYYY-MM-DD (KST)
  startTime: string | null; // HH:mm (KST)
  endTime: string | null;
  isAllDay: boolean;
}
