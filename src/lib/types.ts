// === DB 스키마 타입 ===

export interface User {
  id: string;
  name: string;
  role: "child" | "parent";
  theme: "purple" | "orange" | "navy" | "rose";
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

// === 초코 (coin) 타입 ===

export type CoinTransactionType =
  | "task_complete"
  | "task_uncomplete"
  | "allclear_bonus"
  | "exchange"
  | "admin_adjust"
  | "vocab_quiz"
  | "game"
  | "pet_buy"
  | "pet_item";

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

export interface VocabList {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface VocabEntry {
  id: string;
  user_id: string;
  list_id: string;
  dictionary_id: string | null;
  word: string;
  meaning: string;
  spelling: boolean;
  created_at?: string;
}

export interface VocabQuiz {
  id: string;
  user_id: string;
  list_id: string;
  quiz_type: "basic" | "spelling";
  total_questions: number;
  correct_answers: number;
  candy_earned: number;
  created_at?: string;
}

export type VocabQuizType = "basic" | "spelling";

// === 동물 키우기 (pet) 타입 ===

export interface PetCatalog {
  id: string;
  name: string;
  emoji_baby: string;
  emoji_teen: string;
  emoji_adult: string;
  cost: number;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface PetItemCatalog {
  id: string;
  name: string;
  emoji: string;
  category: "food" | "house" | "toy" | "care";
  cost: number;
  hunger_effect: number;
  happiness_effect: number;
  health_effect: number;
  exp_effect: number;
  passive_happiness_bonus: number;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface PetState {
  user_id: string;
  catalog_id: string;
  nickname: string;
  hunger: number;       // 0-100 (DB에 저장된 마지막 값)
  happiness: number;    // 0-100
  health: number;       // 0-100
  level: number;        // 1-5
  exp: number;
  last_fed_at: string;
  last_played_at: string;
  last_cared_at: string;
  adopted_at: string;
  updated_at: string;
}

export interface PetInventoryItem {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  updated_at: string;
}

// 클라이언트에서 계산된 실시간 스탯
export interface PetLiveStats {
  hunger: number;
  happiness: number;
  health: number;
  passiveHappinessBonus: number; // 집 아이템에서 오는 보너스
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  date: string; // YYYY-MM-DD (KST)
  startTime: string | null; // HH:mm (KST)
  endTime: string | null;
  isAllDay: boolean;
}
