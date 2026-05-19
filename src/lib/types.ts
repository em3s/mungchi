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
