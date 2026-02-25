"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, Button, List, ListInput } from "konsta/react";

interface V2TaskAddSheetProps {
  opened: boolean;
  onSubmit: (title: string) => void;
  onClose: () => void;
}

export function V2TaskAddSheet({ opened, onSubmit, onClose }: V2TaskAddSheetProps) {
  const [title, setTitle] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened) {
      setTitle("");
      // Focus the input inside ListInput after sheet animation
      setTimeout(() => {
        const input = containerRef.current?.querySelector("input");
        input?.focus();
      }, 150);
    }
  }, [opened]);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    onSubmit(title);
    setTitle("");
  }, [title, onSubmit]);

  return (
    <Sheet opened={opened} onBackdropClick={onClose}>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <Button clear small onClick={onClose}>
          취소
        </Button>
        <span className="text-base font-bold">할일 추가</span>
        <Button clear small onClick={handleSubmit} disabled={!title.trim()}>
          <span className="font-bold">추가</span>
        </Button>
      </div>

      <div ref={containerRef}>
        <List strongIos outlineIos className="!my-2">
          <ListInput
            type="text"
            placeholder="할일을 입력하세요"
            value={title}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </List>
      </div>
    </Sheet>
  );
}
