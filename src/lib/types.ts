// === 영어 단어장 (vocab) 타입 ===

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
  created_at?: string;
}
