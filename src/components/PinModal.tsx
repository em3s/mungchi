"use client";

import { useState, useCallback, useEffect } from "react";

interface PinModalProps {
  title: string;
  subtitle: string;
  emoji?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function PinModal({
  title,
  subtitle,
  emoji,
  onSuccess,
  onCancel,
}: PinModalProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<"" | "wrong" | "server">("");
  const [length, setLength] = useState(6);
  const [checking, setChecking] = useState(false);

  // PIN 은 서버에만 있다. 자릿수만 받아 점 개수를 맞춘다.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/pin", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.length === "number") setLength(d.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleKey = useCallback(
    async (digit: string) => {
      if (checking) return;
      setError("");
      const next = input + digit;
      if (next.length < length) {
        setInput(next);
        return;
      }
      setInput(next);
      setChecking(true);
      try {
        const r = await fetch("/api/pin", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pin: next }),
        });
        if (r.ok) {
          onSuccess();
          return;
        }
        setError(r.status === 401 ? "wrong" : "server");
      } catch {
        setError("server");
      } finally {
        setChecking(false);
      }
      setInput("");
    },
    [input, length, checking, onSuccess]
  );

  const handleDelete = useCallback(() => {
    setError("");
    setInput((prev) => prev.slice(0, -1));
  }, []);

  const dots = Array.from({ length }, (_, i) => i < input.length);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl p-7 text-center w-[300px] max-w-[85vw] animate-pop-in flex flex-col items-center md:w-[360px] md:p-9"
        onClick={(e) => e.stopPropagation()}
      >
        {emoji && <div className="text-5xl mb-1">{emoji}</div>}
        <div className="text-xl font-extrabold mb-1 md:text-2xl">{title}</div>
        <div className="text-sm text-gray-500 mb-5">{subtitle}</div>

        {/* PIN dots */}
        <div className="flex justify-center gap-2 mb-4">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-[2.5px] transition-all ${
                error
                  ? "border-[#e17055] animate-pin-shake"
                  : filled
                    ? "bg-[#6c5ce7] border-[#6c5ce7]"
                    : "border-gray-400 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-[#e17055] text-sm font-semibold -mt-2 mb-4">
            {error === "wrong" ? "비밀번호가 틀렸어요" : "확인하지 못했어요. 잠시 뒤 다시 해 주세요"}
          </div>
        )}

        {/* PIN pad */}
        <div className="grid grid-cols-3 gap-2 w-[220px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              className="aspect-square rounded-full bg-white shadow-sm text-xl font-semibold text-gray-800 active:bg-gray-100 active:scale-[0.93] transition-all flex items-center justify-center md:text-lg"
              onClick={() => handleKey(String(n))}
            >
              {n}
            </button>
          ))}
          <div className="aspect-square" />
          <button
            className="aspect-square rounded-full bg-white shadow-sm text-xl font-semibold text-gray-800 active:bg-gray-100 active:scale-[0.93] transition-all flex items-center justify-center md:text-lg"
            onClick={() => handleKey("0")}
          >
            0
          </button>
          <button
            className="aspect-square rounded-full text-xl text-gray-500 flex items-center justify-center active:bg-gray-100 transition-all"
            onClick={handleDelete}
          >
            ⌫
          </button>
        </div>

        {onCancel && (
          <button
            className="mt-4 px-8 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-500 active:bg-gray-200"
            onClick={onCancel}
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
