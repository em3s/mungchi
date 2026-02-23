"use client";

import { useState, useEffect, useRef } from "react";
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
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const shuffled = [...entries].sort(() => Math.random() - 0.5);

    if (quizType === "basic") {
      const correctIds = shuffled.map((e) => e.dictionary_id).filter((id): id is string => id !== null);
      const distractors = getRandomWords(correctIds, shuffled.length * 3);

      const qs: QuizQuestion[] = shuffled.map((entry, i) => {
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
      setQuestions(qs);
    } else {
      setQuestions(shuffled.map((entry) => ({ entry })));
    }
    setLoading(false);
  }, [entries, quizType]);

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-400">퀴즈 준비 중...</div>
    );
  }

  const current = questions[currentIdx];
  if (!current) return null;

  const totalQ = questions.length;

  function checkBasicAnswer(selected: string) {
    const correct =
      selected.toLowerCase().trim() ===
      current.entry.word.toLowerCase().trim();
    setIsCorrect(correct);
    if (correct) setCorrectCount((prev) => prev + 1);
    setShowResult(true);
  }

  function handleBasicSelect(word: string) {
    setSelectedChoice(word);
    checkBasicAnswer(word);
  }

  function handleSpellingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    const correct =
      answer.toLowerCase().trim() ===
      current.entry.word.toLowerCase().trim();

    if (correct) {
      setIsCorrect(true);
      setCorrectCount((prev) => prev + 1);
      setShowResult(true);
      setRetrying(false);
    } else {
      // 틀림 → 재시도 (답 보여주고 다시 입력)
      setRetrying(true);
      setAnswer("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleNext() {
    if (currentIdx + 1 >= totalQ) {
      const finalCorrect = correctCount + (isCorrect ? 1 : 0);
      onComplete(totalQ, finalCorrect);
      return;
    }
    setCurrentIdx((prev) => prev + 1);
    setAnswer("");
    setSelectedChoice(null);
    setShowResult(false);
    setIsCorrect(false);
    setRetrying(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-500">
          {currentIdx + 1} / {totalQ}
        </span>
        <button onClick={onCancel} className="text-sm text-gray-400">
          그만하기
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] rounded-full transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
        />
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
        <>
          {retrying && (
            <div className="text-center mb-3 text-red-500 font-semibold text-sm">
              틀렸어요! 다시 입력해보세요
              <div className="text-xs text-gray-400 mt-1">
                힌트: <span className="font-mono tracking-wider">{current.entry.word[0]}{"_".repeat(current.entry.word.length - 1)}</span>
              </div>
            </div>
          )}
          <form onSubmit={handleSpellingSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={showResult}
              placeholder="영어 단어를 입력하세요"
              className={`w-full border-2 rounded-xl px-4 py-3.5 text-base text-center font-semibold focus:outline-none ${
                retrying
                  ? "border-red-300 focus:border-red-400"
                  : "border-gray-200 focus:border-[#6c5ce7]"
              }`}
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
        </>
      )}

      {/* Result feedback */}
      {showResult && (
        <div className="mt-4 text-center">
          {quizType === "basic" ? (
            <div
              className={`text-lg font-bold ${isCorrect ? "text-green-600" : "text-red-500"}`}
            >
              {isCorrect ? "정답! 🎉" : `오답! 정답: ${current.entry.word}`}
            </div>
          ) : (
            <div className="text-lg font-bold text-green-600">
              정답! 🎉 🍬+1
            </div>
          )}
          <button
            onClick={handleNext}
            className="mt-4 w-full bg-[var(--accent,#6c5ce7)] text-white py-3 rounded-xl font-bold"
          >
            {currentIdx + 1 >= totalQ ? "결과 보기" : "다음 문제"}
          </button>
        </div>
      )}
    </div>
  );
}
