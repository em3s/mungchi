-- 동물 키우기 시스템 스키마
-- Supabase SQL Editor에서 실행

-- 펫 종류 카탈로그
CREATE TABLE IF NOT EXISTS pet_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji_baby TEXT NOT NULL,   -- 레벨 1-2
  emoji_teen TEXT NOT NULL,   -- 레벨 3
  emoji_adult TEXT NOT NULL,  -- 레벨 4-5
  cost INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 아이템 카탈로그
CREATE TABLE IF NOT EXISTS pet_item_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('food', 'house', 'toy', 'care')),
  cost INTEGER NOT NULL,
  -- 스탯 효과
  hunger_effect INTEGER NOT NULL DEFAULT 0,
  happiness_effect INTEGER NOT NULL DEFAULT 0,
  health_effect INTEGER NOT NULL DEFAULT 0,
  exp_effect INTEGER NOT NULL DEFAULT 0,
  -- house 아이템은 passive_happiness_bonus 사용
  passive_happiness_bonus INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 유저별 펫 상태
CREATE TABLE IF NOT EXISTS pet_states (
  user_id TEXT PRIMARY KEY,
  catalog_id UUID REFERENCES pet_catalog(id),
  nickname TEXT NOT NULL DEFAULT '',
  hunger INTEGER NOT NULL DEFAULT 80 CHECK (hunger BETWEEN 0 AND 100),
  happiness INTEGER NOT NULL DEFAULT 80 CHECK (happiness BETWEEN 0 AND 100),
  health INTEGER NOT NULL DEFAULT 100 CHECK (health BETWEEN 0 AND 100),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  exp INTEGER NOT NULL DEFAULT 0,
  last_fed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_cared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  adopted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 유저별 아이템 인벤토리
CREATE TABLE IF NOT EXISTS pet_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES pet_item_catalog(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pet_inventory_user ON pet_inventory(user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pet_states_updated_at
  BEFORE UPDATE ON pet_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pet_inventory_updated_at
  BEFORE UPDATE ON pet_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE pet_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_item_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_pet_catalog" ON pet_catalog FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pet_item_catalog" ON pet_item_catalog FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pet_states" ON pet_states FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pet_inventory" ON pet_inventory FOR ALL TO anon USING (true) WITH CHECK (true);

-- =============================
-- 초기 데이터: 펫 종류
-- =============================
INSERT INTO pet_catalog (name, emoji_baby, emoji_teen, emoji_adult, cost, description, sort_order) VALUES
  ('강아지', '🐶', '🐕', '🐕', 50, '충성스럽고 활발한 강아지예요', 1),
  ('고양이', '🐱', '🐈', '🐈', 50, '독립적이고 우아한 고양이예요', 2),
  ('햄스터', '🐹', '🐹', '🐹', 30, '작고 귀여운 햄스터예요', 3),
  ('토끼', '🐰', '🐇', '🐇', 40, '폴짝폴짝 귀여운 토끼예요', 4),
  ('병아리', '🐣', '🐥', '🐦', 35, '삐약삐약 사랑스러운 병아리예요', 5),
  ('물고기', '🐟', '🐠', '🐡', 20, '반짝반짝 예쁜 물고기예요', 6)
ON CONFLICT DO NOTHING;

-- =============================
-- 초기 데이터: 아이템 종류
-- =============================

-- 먹이
INSERT INTO pet_item_catalog (name, emoji, category, cost, hunger_effect, happiness_effect, health_effect, exp_effect, description, sort_order) VALUES
  ('사료', '🍖', 'food', 5, 30, 0, 0, 5, '배고픔을 채워주는 사료예요', 1),
  ('간식', '🍬', 'food', 3, 15, 10, 0, 3, '맛있는 간식! 행복도도 올라가요', 2),
  ('특별간식', '🎂', 'food', 10, 50, 20, 10, 8, '최고급 특별 간식이에요', 3)
ON CONFLICT DO NOTHING;

-- 집
INSERT INTO pet_item_catalog (name, emoji, category, cost, passive_happiness_bonus, exp_effect, description, sort_order) VALUES
  ('아늑한 집', '🏠', 'house', 30, 10, 0, '포근한 집. 행복도 +10 (영구)', 10),
  ('멋진 집', '🏡', 'house', 80, 20, 0, '넓고 멋진 집. 행복도 +20 (영구)', 11)
ON CONFLICT DO NOTHING;

-- 장난감
INSERT INTO pet_item_catalog (name, emoji, category, cost, happiness_effect, exp_effect, description, sort_order) VALUES
  ('공', '⚽', 'toy', 8, 20, 10, '신나게 공놀이! 경험치도 올라요', 20),
  ('인형', '🧸', 'toy', 12, 30, 12, '포근한 인형. 행복도 +30', 21),
  ('터널', '🌀', 'toy', 15, 25, 15, '신나는 터널. 경험치 +15', 22)
ON CONFLICT DO NOTHING;

-- 케어
INSERT INTO pet_item_catalog (name, emoji, category, cost, health_effect, happiness_effect, exp_effect, description, sort_order) VALUES
  ('브러시', '🪮', 'care', 8, 15, 5, 3, '빗질로 건강해져요', 30),
  ('목욕세트', '🛁', 'care', 5, 20, 10, 5, '깨끗하게 목욕! 건강 +20', 31)
ON CONFLICT DO NOTHING;
