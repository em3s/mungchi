"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    const shuffled = [...entries].sort(() => Math.random() - 0.5);

    if (quizType === "basic") {
      const correctIds = shuffled.map((e) => e.dictionary_id);
      const distractors = getRandomWords(correctIds, shuffled.length * 3);

      const qs: QuizQuestion[] = shuffled.map((entry, i) => {
        const start = i * 3;
        const wrongChoices = distractors.slice(start, start + 3);
        const allChoices = [
          {
            id: entry.dictionary_id,
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

  function checkAnswer(selected: string) {
    const correct =
      selected.toLowerCase().trim() ===
      current.entry.word.toLowerCase().trim();
    setIsCorrect(correct);
    if (correct) setCorrectCount((prev) => prev + 1);
    setShowResult(true);
  }

  function handleBasicSelect(word: string) {
    setSelectedChoice(word);
    checkAnswer(word);
  }

  function handleAdvancedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    checkAnswer(answer);
  }

  function handleNext() {
    if (currentIdx + 1 >= totalQ) {
      onComplete(totalQ, correctCount + (isCorrect ? 1 : 0));
      return;
    }
    setCurrentIdx((prev) => prev + 1);
    setAnswer("");
    setSelectedChoice(null);
    setShowResult(false);
    setIsCorrect(false);
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
        <div className="text-sm text-gray-500 mb-2">이 뜻의 영어 단어는?</div>
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
        <form onSubmit={handleAdvancedSubmit}>
          <input
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
            {currentIdx + 1 >= totalQ ? "결과 보기" : "다음 문제"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- 퀴즈 결과 ---

interface QuizResultProps {
  total: number;
  correct: number;
  candyEarned: number;
  quizType: VocabQuizType;
  alreadyEarned: boolean;
  onClose: () => void;
}

export function QuizResult({
  total,
  correct,
  candyEarned,
  quizType,
  alreadyEarned,
  onClose,
}: QuizResultProps) {
  const rate = total > 0 ? correct / total : 0;
  const perfect = rate === 1;

  return (
    <div className="text-center py-6">
      <div className="text-4xl mb-3">
        {perfect ? "🎉" : rate >= 0.5 ? "👏" : "💪"}
      </div>
      <div className="text-xl font-bold mb-1">
        {correct} / {total} 정답
      </div>
      <div className="text-sm text-gray-500 mb-4">
        {quizType === "basic" ? "객관식" : "주관식"} 퀴즈 완료!
      </div>
      {candyEarned > 0 ? (
        <div className="text-lg font-bold text-amber-500 mb-4">
          🍬 별사탕 +{candyEarned}!
        </div>
      ) : alreadyEarned ? (
        <div className="text-sm text-gray-400 mb-4">
          오늘은 이미 별사탕을 받았어요
        </div>
      ) : null}
      <button
        onClick={onClose}
        className="w-full bg-[var(--accent,#6c5ce7)] text-white py-3 rounded-xl font-bold"
      >
        돌아가기
      </button>
    </div>
  );
}
