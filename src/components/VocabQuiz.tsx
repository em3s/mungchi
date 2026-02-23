"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getRandomWords } from "@/lib/vocab";
import type { VocabEntry, VocabQuizType, DictionaryEntry } from "@/lib/types";

interface QuizQuestion {
  entry: VocabEntry;
  choices?: DictionaryEntry[];
}

interface VocabQuizProps {
  entries: VocabEntry[];
  quizType: VocabQuizType;
  onComplete: (total: number, correct: number) => void;
  onCancel: () => void;
}

function buildBasicQuestions(entries: VocabEntry[]): QuizQuestion[] {
  const correctIds = entries.map((e) => e.dictionary_id).filter((id): id is string => id !== null);
  const distractors = getRandomWords(correctIds, entries.length * 3);
  return entries.map((entry, i) => {
    const start = i * 3;
    const wrongChoices = distractors.slice(start, start + 3);
    const allChoices = [
      {
        id: entry.dictionary_id ?? entry.id,
        word: entry.word,
        meaning: entry.meaning,
        level: 1,
      } as DictionaryEntry,
      ...wrongChoices,
    ].sort(() => Math.random() - 0.5);
    return { entry, choices: allChoices };
  });
}

export function VocabQuiz({
  entries,
  quizType,
  onComplete,
  onCancel,
}: VocabQuizProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(1);
  const [wrongInRound, setWrongInRound] = useState<VocabEntry[]>([]);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const totalWords = entries.length;
  const inputRef = useRef<HTMLInputElement>(null);

  const startRound = useCallback((roundEntries: VocabEntry[], roundNum: number) => {
    const shuffled = [...roundEntries].sort(() => Math.random() - 0.5);
    if (quizType === "basic") {
      setQuestions(buildBasicQuestions(shuffled));
    } else {
      setQuestions(shuffled.map((entry) => ({ entry })));
    }
    setCurrentIdx(0);
    setRound(roundNum);
    setWrongInRound([]);
    setAnswer("");
    setSelectedChoice(null);
    setShowResult(false);
    setIsCorrect(false);
  }, [quizType]);

  useEffect(() => {
    startRound(entries, 1);
    setLoading(false);
  }, [entries, startRound]);

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-400">퀴즈 준비 중...</div>
    );
  }

  const current = questions[currentIdx];
  if (!current) return null;

  const roundTotal = questions.length;

  function handleBasicSelect(word: string) {
    setSelectedChoice(word);
    const correct = word.toLowerCase().trim() === current.entry.word.toLowerCase().trim();
    setIsCorrect(correct);
    if (correct) {
      setTotalCorrect((prev) => prev + 1);
    } else {
      setWrongInRound((prev) => [...prev, current.entry]);
    }
    setShowResult(true);
  }

  function handleSpellingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    const correct = answer.toLowerCase().trim() === current.entry.word.toLowerCase().trim();
    setIsCorrect(correct);
    if (correct) {
      setTotalCorrect((prev) => prev + 1);
    } else {
      setWrongInRound((prev) => [...prev, current.entry]);
    }
    setShowResult(true);
  }

  function handleNext() {
    if (currentIdx + 1 >= roundTotal) {
      // 라운드 종료
      const wrongAfterThis = isCorrect ? wrongInRound : [...wrongInRound, current.entry];
      const correctAfterThis = totalCorrect + (isCorrect ? 1 : 0);

      // 이미 wrongInRound에 추가됐으므로 그걸 사용
      // (handleBasicSelect/handleSpellingSubmit에서 이미 추가됨)
      if (wrongInRound.length === 0 && isCorrect) {
        // 이번 라운드 전부 맞춤 → 완료
        onComplete(totalWords, correctAfterThis);
      } else {
        // 틀린 것만 다음 라운드
        const nextWrong = isCorrect ? wrongInRound : wrongInRound;
        // wrongInRound은 이미 틀린 것들이 들어있음 (현재 문제 포함)
        startRound(wrongInRound, round + 1);
        setTotalCorrect(correctAfterThis);
      }
      return;
    }
    setCurrentIdx((prev) => prev + 1);
    setAnswer("");
    setSelectedChoice(null);
    setShowResult(false);
    setIsCorrect(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-500">
          {round > 1 && <span className="text-amber-500 mr-1">재도전 </span>}
          {currentIdx + 1} / {roundTotal}
        </span>
        <button onClick={onCancel} className="text-sm text-gray-400">
          그만하기
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] rounded-full transition-all duration-300"
          style={{ width: `${(totalCorrect / totalWords) * 100}%` }}
        />
      </div>
      <div className="text-right text-xs text-gray-400 -mt-5 mb-4">
        {totalCorrect}/{totalWords} 완료
      </div>

      {/* Question */}
      <div className="text-center mb-6">
        <div className="text-sm text-gray-500 mb-2">
          {quizType === "basic" ? "이 뜻의 영어 단어는?" : "스펠링을 입력하세요"}
        </div>
        <div className="text-2xl font-bold text-gray-800">
          {current.entry.meaning}
        </div>
      </div>

      {/* Answer area */}
      {quizType === "basic" ? (
        <div className="flex flex-col gap-2">
          {current.choices?.map((choice) => {
            let btnClass =
              "bg-white border-2 border-gray-200 text-gray-800";
            if (showResult) {
              if (choice.word === current.entry.word) {
                btnClass =
                  "bg-green-100 border-2 border-green-500 text-green-800";
              } else if (choice.word === selectedChoice) {
                btnClass = "bg-red-100 border-2 border-red-400 text-red-700";
              }
            }
            return (
              <button
                key={choice.id}
                onClick={() => !showResult && handleBasicSelect(choice.word)}
                disabled={showResult}
                className={`w-full py-3.5 px-4 rounded-xl text-base font-semibold transition-all ${btnClass}`}
              >
                {choice.word}
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={handleSpellingSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={showResult}
            placeholder="영어 단어를 입력하세요"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base text-center font-semibold focus:border-[#6c5ce7] focus:outline-none"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {!showResult && (
            <button
              type="submit"
              disabled={!answer.trim()}
              className="w-full mt-3 bg-[var(--accent,#6c5ce7)] text-white py-3 rounded-xl font-bold disabled:opacity-40"
            >
              확인
            </button>
          )}
        </form>
      )}

      {/* Result feedback */}
      {showResult && (
        <div className="mt-4 text-center">
          <div
            className={`text-lg font-bold ${isCorrect ? "text-green-600" : "text-red-500"}`}
          >
            {isCorrect ? "정답! 🎉" : `오답! 정답: ${current.entry.word}`}
          </div>
          <button
            onClick={handleNext}
            className="mt-4 w-full bg-[var(--accent,#6c5ce7)] text-white py-3 rounded-xl font-bold"
          >
            {currentIdx + 1 >= roundTotal
              ? wrongInRound.length > 0 || !isCorrect
                ? "틀린 문제 다시 풀기"
                : "결과 보기"
              : "다음 문제"}
          </button>
        </div>
      )}
    </div>
  );
}
