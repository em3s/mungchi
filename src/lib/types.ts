// === DB 스키마 타입 ===

export interface User {
  id: string;
  name: string;
  role: "child" | "parent";
  theme: "starry" | "choco" | "shield" | "heart";
  emoji: string;
  starName: string;
  descriptor: string;
  pin: string;
  created_at?: string;
}

export interface Task {
  id: string;
  user_id: string;
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
  user_id: string;
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
  | "admin_adjust"
  | "vocab_quiz";

export interface CoinTransaction {
  id: string;
  user_id: string;
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
  user_id: string;
  balance: number;
  updated_at: string;
}

// === 영어 단어장 (vocab) 타입 ===

export interface DictionaryEntry {
  id: string;
  word: string;
  meaning: string;
  level: number;
  created_at?: string;
}

export interface VocabEntry {
  id: string;
  user_id: string;
  date: string;
  dictionary_id: string | null;
  word: string;
  meaning: string;
  created_at?: string;
}

export interface VocabQuiz {
  id: string;
  user_id: string;
  date: string;
  quiz_type: "basic" | "advanced";
  total_questions: number;
  correct_answers: number;
  candy_earned: number;
  created_at?: string;
}

export type VocabQuizType = "basic" | "advanced";

export interface CalendarEvent {
  uid: string;
  summary: string;
  date: string; // YYYY-MM-DD (KST)
  startTime: string | null; // HH:mm (KST)
  endTime: string | null;
  isAllDay: boolean;
}
