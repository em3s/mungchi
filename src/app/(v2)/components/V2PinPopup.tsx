"use client";

import { useState, useCallback } from "react";
import { Popup, Navbar, Block, Button } from "konsta/react";
import { PIN } from "@/lib/constants";

interface V2PinPopupProps {
  title: string;
  subtitle: string;
  emoji?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function V2PinPopup({
  title,
  subtitle,
  emoji,
  onSuccess,
  onCancel,
}: V2PinPopupProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleKey = useCallback(
    (digit: string) => {
      setError(false);
      const next = input + digit;
      if (next.length >= PIN.length) {
        if (next === PIN) {
          onSuccess();
        } else {
          setError(true);
          setInput("");
        }
      } else {
        setInput(next);
      }
    },
    [input, onSuccess]
  );

  const handleDelete = useCallback(() => {
    setError(false);
    setInput((prev) => prev.slice(0, -1));
  }, []);

  const dots = Array.from({ length: PIN.length }, (_, i) => i < input.length);

  return (
    <Popup opened onBackdropClick={onCancel}>
      <Navbar
        title={title}
        right={
          <Button clear onClick={onCancel}>
            취소
          </Button>
        }
      />

      <Block className="!text-center !pt-6">
        {emoji && <div className="text-5xl mb-2">{emoji}</div>}
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
                    ? "bg-[var(--accent,#6c5ce7)] border-[var(--accent,#6c5ce7)]"
                    : "border-gray-400 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-[#e17055] text-sm font-semibold -mt-2 mb-4">
            비밀번호가 틀렸어요
          </div>
        )}

        {/* PIN keypad */}
        <div className="grid grid-cols-3 gap-2 w-[220px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Button
              key={n}
              rounded
              clear
              onClick={() => handleKey(String(n))}
              className="!aspect-square !text-xl !font-semibold"
            >
              {n}
            </Button>
          ))}
          <div className="aspect-square" />
          <Button
            rounded
            clear
            onClick={() => handleKey("0")}
            className="!aspect-square !text-xl !font-semibold"
          >
            0
          </Button>
          <Button
            rounded
            clear
            onClick={handleDelete}
            className="!aspect-square !text-xl"
          >
            ⌫
          </Button>
        </div>
      </Block>
    </Popup>
  );
}
