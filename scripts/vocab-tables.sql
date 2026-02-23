-- 영어 단어장 시스템 테이블

-- 1. dictionary: 영어 사전 (English → Korean)
CREATE TABLE dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,  -- 1=쉬움, 2=보통, 3=어려움
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_dict_word ON dictionary(word);
CREATE INDEX idx_dict_prefix ON dictionary(word text_pattern_ops);

-- 2. vocab_entries: 아이별 일일 단어 목록
CREATE TABLE vocab_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,                -- YYYY-MM-DD (KST)
  dictionary_id UUID NOT NULL REFERENCES dictionary(id),
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ve_child_date ON vocab_entries(user_id, date);
CREATE UNIQUE INDEX idx_ve_unique ON vocab_entries(user_id, date, dictionary_id);

-- 3. vocab_quizzes: 퀴즈 결과
CREATE TABLE vocab_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  quiz_type TEXT NOT NULL,           -- 'basic' | 'advanced'
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  candy_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vq_child_date ON vocab_quizzes(user_id, date);

-- 4. vocab_config: 보상 설정 (admin 조정 가능)
CREATE TABLE vocab_config (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (anon 전체 허용)
ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON dictionary FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vocab_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON vocab_entries FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vocab_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON vocab_quizzes FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vocab_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON vocab_config FOR ALL TO anon USING (true) WITH CHECK (true);

-- 초기 보상 설정
INSERT INTO vocab_config (key, value) VALUES
  ('basic_reward', 10),     -- 객관식 퀴즈 보상
  ('advanced_reward', 20),  -- 주관식 퀴즈 보상
  ('min_words', 3);         -- 퀴즈 응시 최소 단어 수

-- 초기 사전 시드 데이터 (~300 초등 기본 영단어)
INSERT INTO dictionary (word, meaning, level) VALUES
  -- 동물 (Animals)
  ('cat', '고양이', 1), ('dog', '강아지', 1), ('fish', '물고기', 1),
  ('bird', '새', 1), ('rabbit', '토끼', 1), ('bear', '곰', 1),
  ('lion', '사자', 1), ('tiger', '호랑이', 1), ('elephant', '코끼리', 1),
  ('monkey', '원숭이', 1), ('horse', '말', 1), ('cow', '소', 1),
  ('pig', '돼지', 1), ('chicken', '닭', 1), ('duck', '오리', 1),
  ('frog', '개구리', 1), ('snake', '뱀', 1), ('mouse', '쥐', 1),
  ('sheep', '양', 1), ('whale', '고래', 2), ('dolphin', '돌고래', 2),
  ('penguin', '펭귄', 2), ('turtle', '거북이', 2), ('butterfly', '나비', 2),
  ('ant', '개미', 1), ('bee', '벌', 1), ('spider', '거미', 2),
  ('deer', '사슴', 2), ('fox', '여우', 2), ('wolf', '늑대', 2),

  -- 과일/채소 (Fruits & Vegetables)
  ('apple', '사과', 1), ('banana', '바나나', 1), ('orange', '오렌지', 1),
  ('grape', '포도', 1), ('strawberry', '딸기', 1), ('watermelon', '수박', 1),
  ('peach', '복숭아', 1), ('lemon', '레몬', 1), ('cherry', '체리', 2),
  ('pineapple', '파인애플', 2), ('mango', '망고', 2), ('melon', '멜론', 2),
  ('tomato', '토마토', 1), ('potato', '감자', 1), ('carrot', '당근', 1),
  ('onion', '양파', 1), ('corn', '옥수수', 1), ('pepper', '고추', 2),
  ('cucumber', '오이', 2), ('mushroom', '버섯', 2), ('garlic', '마늘', 2),
  ('lettuce', '상추', 2), ('broccoli', '브로콜리', 2), ('pumpkin', '호박', 2),

  -- 음식 (Food)
  ('bread', '빵', 1), ('rice', '쌀', 1), ('milk', '우유', 1),
  ('egg', '달걀', 1), ('cheese', '치즈', 1), ('butter', '버터', 1),
  ('meat', '고기', 1), ('soup', '수프', 1), ('cake', '케이크', 1),
  ('cookie', '쿠키', 1), ('candy', '사탕', 1), ('chocolate', '초콜릿', 1),
  ('ice cream', '아이스크림', 1), ('pizza', '피자', 1), ('sandwich', '샌드위치', 2),
  ('noodle', '국수', 1), ('salad', '샐러드', 2), ('sugar', '설탕', 1),
  ('salt', '소금', 1), ('juice', '주스', 1),

  -- 신체 (Body)
  ('head', '머리', 1), ('eye', '눈', 1), ('ear', '귀', 1),
  ('nose', '코', 1), ('mouth', '입', 1), ('hand', '손', 1),
  ('foot', '발', 1), ('arm', '팔', 1), ('leg', '다리', 1),
  ('finger', '손가락', 1), ('hair', '머리카락', 1), ('face', '얼굴', 1),
  ('tooth', '이빨', 1), ('neck', '목', 2), ('shoulder', '어깨', 2),
  ('knee', '무릎', 2), ('back', '등', 2), ('heart', '심장', 2),

  -- 가족 (Family)
  ('family', '가족', 1), ('mother', '어머니', 1), ('father', '아버지', 1),
  ('sister', '언니/누나/여동생', 1), ('brother', '오빠/형/남동생', 1),
  ('baby', '아기', 1), ('friend', '친구', 1), ('teacher', '선생님', 1),
  ('student', '학생', 1), ('parent', '부모', 2), ('grandma', '할머니', 1),
  ('grandpa', '할아버지', 1), ('uncle', '삼촌', 2), ('aunt', '이모/고모', 2),
  ('cousin', '사촌', 2), ('neighbor', '이웃', 2),

  -- 학교 (School)
  ('school', '학교', 1), ('book', '책', 1), ('pen', '펜', 1),
  ('pencil', '연필', 1), ('eraser', '지우개', 1), ('desk', '책상', 1),
  ('chair', '의자', 1), ('class', '수업', 1), ('homework', '숙제', 1),
  ('test', '시험', 2), ('notebook', '공책', 1), ('ruler', '자', 1),
  ('bag', '가방', 1), ('paper', '종이', 1), ('crayon', '크레파스', 1),
  ('dictionary', '사전', 2), ('library', '도서관', 2), ('playground', '운동장', 2),
  ('science', '과학', 2), ('math', '수학', 2), ('music', '음악', 1),

  -- 색깔 (Colors)
  ('red', '빨간색', 1), ('blue', '파란색', 1), ('yellow', '노란색', 1),
  ('green', '초록색', 1), ('white', '하얀색', 1), ('black', '검은색', 1),
  ('pink', '분홍색', 1), ('purple', '보라색', 1), ('brown', '갈색', 1),
  ('gray', '회색', 1), ('gold', '금색', 2), ('silver', '은색', 2),

  -- 숫자/시간 (Numbers & Time)
  ('one', '하나', 1), ('two', '둘', 1), ('three', '셋', 1),
  ('four', '넷', 1), ('five', '다섯', 1), ('ten', '열', 1),
  ('hundred', '백', 1), ('thousand', '천', 2), ('million', '백만', 3),
  ('today', '오늘', 1), ('tomorrow', '내일', 1), ('yesterday', '어제', 1),
  ('morning', '아침', 1), ('afternoon', '오후', 1), ('evening', '저녁', 1),
  ('night', '밤', 1), ('week', '주', 1), ('month', '달', 1),
  ('year', '년', 1), ('minute', '분', 1), ('hour', '시간', 1),
  ('clock', '시계', 1), ('birthday', '생일', 1), ('holiday', '휴일', 2),

  -- 날씨/자연 (Weather & Nature)
  ('sun', '태양', 1), ('moon', '달', 1), ('star', '별', 1),
  ('sky', '하늘', 1), ('cloud', '구름', 1), ('rain', '비', 1),
  ('snow', '눈', 1), ('wind', '바람', 1), ('tree', '나무', 1),
  ('flower', '꽃', 1), ('river', '강', 1), ('mountain', '산', 1),
  ('sea', '바다', 1), ('lake', '호수', 2), ('island', '섬', 2),
  ('forest', '숲', 2), ('rainbow', '무지개', 1), ('thunder', '천둥', 2),
  ('earth', '지구', 2), ('fire', '불', 1), ('water', '물', 1),
  ('ice', '얼음', 1), ('rock', '바위', 2), ('sand', '모래', 2),

  -- 집/장소 (Home & Places)
  ('house', '집', 1), ('room', '방', 1), ('door', '문', 1),
  ('window', '창문', 1), ('kitchen', '부엌', 1), ('bathroom', '화장실', 1),
  ('bedroom', '침실', 2), ('garden', '정원', 2), ('floor', '바닥', 1),
  ('wall', '벽', 2), ('roof', '지붕', 2), ('stairs', '계단', 2),
  ('store', '가게', 1), ('hospital', '병원', 1), ('park', '공원', 1),
  ('bank', '은행', 2), ('restaurant', '식당', 2), ('airport', '공항', 2),
  ('museum', '박물관', 2), ('church', '교회', 2), ('city', '도시', 2),
  ('town', '마을', 2), ('street', '거리', 2), ('bridge', '다리', 2),

  -- 옷/물건 (Clothes & Objects)
  ('shirt', '셔츠', 1), ('pants', '바지', 1), ('shoes', '신발', 1),
  ('hat', '모자', 1), ('coat', '코트', 2), ('dress', '드레스', 1),
  ('socks', '양말', 1), ('glasses', '안경', 2), ('umbrella', '우산', 1),
  ('phone', '전화', 1), ('computer', '컴퓨터', 1), ('camera', '카메라', 2),
  ('key', '열쇠', 1), ('cup', '컵', 1), ('plate', '접시', 1),
  ('spoon', '숟가락', 1), ('knife', '칼', 2), ('table', '탁자', 1),
  ('bed', '침대', 1), ('clock', '시계', 1), ('mirror', '거울', 2),
  ('lamp', '램프', 2), ('box', '상자', 1), ('toy', '장난감', 1),

  -- 동작 (Actions/Verbs)
  ('eat', '먹다', 1), ('drink', '마시다', 1), ('sleep', '자다', 1),
  ('run', '달리다', 1), ('walk', '걷다', 1), ('jump', '뛰다', 1),
  ('swim', '수영하다', 1), ('fly', '날다', 1), ('sing', '노래하다', 1),
  ('dance', '춤추다', 1), ('read', '읽다', 1), ('write', '쓰다', 1),
  ('draw', '그리다', 1), ('play', '놀다', 1), ('study', '공부하다', 1),
  ('cook', '요리하다', 1), ('clean', '청소하다', 1), ('wash', '씻다', 1),
  ('open', '열다', 1), ('close', '닫다', 1), ('stop', '멈추다', 1),
  ('start', '시작하다', 1), ('help', '돕다', 1), ('give', '주다', 1),
  ('take', '가져가다', 1), ('make', '만들다', 1), ('buy', '사다', 1),
  ('sell', '팔다', 2), ('find', '찾다', 1), ('think', '생각하다', 2),
  ('know', '알다', 1), ('learn', '배우다', 1), ('teach', '가르치다', 2),
  ('listen', '듣다', 1), ('speak', '말하다', 1), ('talk', '이야기하다', 1),
  ('cry', '울다', 1), ('laugh', '웃다', 1), ('smile', '미소짓다', 1),
  ('love', '사랑하다', 1), ('like', '좋아하다', 1), ('want', '원하다', 1),
  ('need', '필요하다', 1), ('wait', '기다리다', 1), ('remember', '기억하다', 2),
  ('forget', '잊다', 2), ('break', '부수다', 2), ('fix', '고치다', 2),
  ('build', '짓다', 2), ('grow', '자라다', 2), ('change', '바꾸다', 2),
  ('move', '움직이다', 2), ('carry', '나르다', 2), ('push', '밀다', 2),
  ('pull', '당기다', 2), ('throw', '던지다', 2), ('catch', '잡다', 2),
  ('climb', '오르다', 2), ('fall', '떨어지다', 2), ('touch', '만지다', 2),

  -- 형용사 (Adjectives)
  ('big', '큰', 1), ('small', '작은', 1), ('tall', '키가 큰', 1),
  ('short', '짧은', 1), ('long', '긴', 1), ('fast', '빠른', 1),
  ('slow', '느린', 1), ('hot', '뜨거운', 1), ('cold', '차가운', 1),
  ('warm', '따뜻한', 1), ('cool', '시원한', 1), ('new', '새로운', 1),
  ('old', '오래된', 1), ('young', '젊은', 1), ('good', '좋은', 1),
  ('bad', '나쁜', 1), ('happy', '행복한', 1), ('sad', '슬픈', 1),
  ('angry', '화난', 1), ('tired', '피곤한', 1), ('hungry', '배고픈', 1),
  ('thirsty', '목마른', 2), ('full', '배부른', 1), ('strong', '강한', 1),
  ('weak', '약한', 2), ('hard', '단단한', 1), ('soft', '부드러운', 1),
  ('clean', '깨끗한', 1), ('dirty', '더러운', 1), ('beautiful', '아름다운', 2),
  ('ugly', '못생긴', 2), ('rich', '부유한', 2), ('poor', '가난한', 2),
  ('easy', '쉬운', 1), ('difficult', '어려운', 2), ('important', '중요한', 2),
  ('dangerous', '위험한', 2), ('safe', '안전한', 2), ('funny', '재미있는', 1),
  ('boring', '지루한', 2), ('kind', '친절한', 1), ('brave', '용감한', 2),
  ('quiet', '조용한', 1), ('loud', '시끄러운', 1), ('bright', '밝은', 2),
  ('dark', '어두운', 1), ('heavy', '무거운', 2), ('light', '가벼운', 2),
  ('thick', '두꺼운', 2), ('thin', '얇은', 2), ('wide', '넓은', 2),
  ('narrow', '좁은', 2), ('deep', '깊은', 2), ('sweet', '달콤한', 1),
  ('sour', '신', 2), ('bitter', '쓴', 2), ('spicy', '매운', 2),
  ('fresh', '신선한', 2), ('busy', '바쁜', 1), ('free', '자유로운', 2),
  ('ready', '준비된', 1), ('sick', '아픈', 1), ('healthy', '건강한', 2),
  ('lucky', '운이 좋은', 2), ('special', '특별한', 2), ('same', '같은', 1),
  ('different', '다른', 2), ('right', '맞는', 1), ('wrong', '틀린', 1),

  -- 기타 (Others)
  ('name', '이름', 1), ('word', '단어', 1), ('number', '숫자', 1),
  ('color', '색깔', 1), ('shape', '모양', 2), ('circle', '원', 1),
  ('square', '정사각형', 2), ('triangle', '삼각형', 2),
  ('story', '이야기', 1), ('song', '노래', 1), ('game', '게임', 1),
  ('picture', '그림', 1), ('movie', '영화', 1), ('dream', '꿈', 1),
  ('question', '질문', 2), ('answer', '대답', 1), ('problem', '문제', 2),
  ('idea', '아이디어', 2), ('world', '세계', 2), ('country', '나라', 2),
  ('people', '사람들', 1), ('king', '왕', 2), ('queen', '여왕', 2),
  ('prince', '왕자', 2), ('princess', '공주', 2), ('hero', '영웅', 2),
  ('magic', '마법', 2), ('treasure', '보물', 2), ('secret', '비밀', 2),
  ('surprise', '놀라움', 2), ('adventure', '모험', 2), ('castle', '성', 2)
ON CONFLICT (word) DO NOTHING;
