"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSimilarWords } from "@/lib/vocab";
import { speakWord } from "@/lib/tts";
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
  onSpellingCorrect?: () => void;
}

function buildBasicQuestions(entries: VocabEntry[]): QuizQuestion[] {
  const allWords = entries.map((e) => e.word);
  return entries.map((entry) => {
    // 편집 거리 기반으로 비슷한 단어 3개 선택
    const wrongChoices = getSimilarWords(entry.word, allWords, 3);
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
  onSpellingCorrect,
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
  const [candyPop, setCandyPop] = useState(false);
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
      speakWord(current.entry.word);
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
      speakWord(current.entry.word);
      setCandyPop(true);
      setTimeout(() => setCandyPop(false), 1200);
      onSpellingCorrect?.();
    } else {
      setWrongInRound((prev) => [...prev, current.entry]);
    }
    setShowResult(true);
  }

  function handleNext() {
    // totalCorrect는 이미 답 제출 시 업데이트됨
    if (totalCorrect >= totalWords) {
      onComplete(totalWords, totalWords);
      return;
    }

    if (currentIdx + 1 >= roundTotal) {
      // 라운드 종료 → 틀린 것만 다음 라운드
      startRound(wrongInRound, round + 1);
      return;
    }

    setCurrentIdx((prev) => prev + 1);
    setAnswer("");
    setSelectedChoice(null);
    setShowResult(false);
    setIsCorrect(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const correctAfterCurrent = totalCorrect;
  const roundProgress = (currentIdx + (showResult ? 1 : 0)) / roundTotal;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-500">
          {round > 1 && <span className="text-amber-500">Round {round} · </span>}
          {currentIdx + 1} / {roundTotal}
        </span>
        <button onClick={onCancel} className="text-sm text-gray-400">
          그만하기
        </button>
      </div>

      {/* 게이지 1: 현재 라운드 진행 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-gray-400 w-8 shrink-0">진행</span>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-400 rounded-full transition-all duration-300"
            style={{ width: `${roundProgress * 100}%` }}
          />
        </div>
      </div>

      {/* 게이지 2: 전체 맞춘 수 (이게 꽉 차면 끝) */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[10px] text-green-500 w-8 shrink-0 font-bold">정답</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(correctAfterCurrent / totalWords) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-green-600 w-10 text-right">
          {correctAfterCurrent}/{totalWords}
        </span>
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

      {/* Candy pop animation */}
      {candyPop && quizType === "spelling" && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="animate-bounce text-3xl font-black text-amber-500 drop-shadow-lg"
            style={{ animation: "candyFloat 1.2s ease-out forwards" }}>
            +1 🍪
          </div>
        </div>
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
            onClick={() => speakWord(current.entry.word)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-500 active:text-[var(--accent,#6c5ce7)] transition-colors px-3 py-1.5 rounded-lg bg-gray-100 active:bg-gray-200"
          >
            ▶ 발음 듣기
          </button>
          {!isCorrect && quizType === "basic" && (
            <div className="text-sm text-gray-500 mt-1.5">
              괜찮아! 끝까지 하면 초코는 똑같이 받아 🍪
            </div>
          )}
          <button
            onClick={handleNext}
            className="mt-4 w-full bg-[var(--accent,#6c5ce7)] text-white py-3 rounded-xl font-bold"
          >
            {correctAfterCurrent >= totalWords
              ? "결과 보기"
              : currentIdx + 1 >= roundTotal
                ? "틀린 문제 다시 풀기"
                : "다음 문제"}
          </button>
        </div>
      )}
    </div>
  );
}
