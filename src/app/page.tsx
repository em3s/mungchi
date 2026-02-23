"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CHILDREN } from "@/lib/constants";
import { PinModal } from "@/components/PinModal";
import { useSession } from "@/hooks/useSession";

export default function HomePage() {
  const router = useRouter();
  const { childId, loaded, login } = useSession();
  const [selectedChild, setSelectedChild] = useState<
    (typeof CHILDREN)[0] | null
  >(null);

  // 롱프레스 → 관리 페이지 진입
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleTitleDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      router.push("/admin");
    }, 800);
  }, [router]);
  const handleTitleUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // 세션이 있으면 대시보드로 이동
  useEffect(() => {
    if (loaded && childId) {
      router.replace(`/${childId}`);
    }
  }, [loaded, childId, router]);

  if (!loaded) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  if (childId) return null; // 리다이렉트 중

  return (
    <div className="max-w-[480px] mx-auto px-4 pt-10 text-center md:max-w-[640px] md:px-6">
      <h2
        className="text-2xl font-bold mb-2 md:text-3xl select-none cursor-default"
        onPointerDown={handleTitleDown}
        onPointerUp={handleTitleUp}
        onPointerLeave={handleTitleUp}
      >
        🍡 뭉치
      </h2>
      <p className="text-gray-500 mb-8 md:text-lg">누구의 할일을 볼까요?</p>

      <div className="flex flex-col gap-4">
        {CHILDREN.map((child) => (
          <button
            key={child.id}
            onClick={() => setSelectedChild(child)}
            className="flex items-center gap-4 bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all active:scale-[0.97] active:shadow-[0_1px_6px_rgba(0,0,0,0.1)] text-left md:p-7 md:gap-5 md:rounded-3xl"
          >
            <span className="text-5xl md:text-6xl">{child.emoji}</span>
            <div>
              <div className="text-xl font-bold md:text-2xl">{child.name}</div>
              <div className="text-gray-500 text-sm mt-1 md:text-base">
                {child.theme === "starry"
                  ? "반짝별 수호자"
                  : child.theme === "choco"
                    ? "초코별 탐험가"
                    : child.theme === "shield"
                      ? "방패별 수호자"
                      : "하트별 수호자"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedChild && (
        <PinModal
          title={selectedChild.name}
          subtitle="비밀번호를 입력하세요"
          emoji={selectedChild.emoji}
          onSuccess={() => {
            login(selectedChild.id);
            router.push(`/${selectedChild.id}`);
          }}
          onCancel={() => setSelectedChild(null)}
        />
      )}
    </div>
  );
}
