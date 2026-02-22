"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { CHILDREN } from "@/lib/constants";
import { PinModal } from "@/components/PinModal";

export default function ChildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const { childId: sessionChildId, loaded, login } = useSession();

  const child = CHILDREN.find((c) => c.id === childId);

  const handlePinSuccess = useCallback(() => {
    login(childId);
  }, [login, childId]);

  if (!loaded) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  // 유효하지 않은 childId
  if (!child) {
    router.replace("/");
    return null;
  }

  // 세션 없거나 다른 아이의 세션 → PIN 입력
  if (sessionChildId !== childId) {
    return (
      <PinModal
        title={child.name}
        subtitle="비밀번호를 입력하세요"
        emoji={child.emoji}
        onSuccess={handlePinSuccess}
        onCancel={() => router.push("/")}
      />
    );
  }

  const themeClass = `theme-${child.theme}`;

  return (
    <div
      className={themeClass}
      style={{ background: "var(--bg)", minHeight: "100dvh" }}
    >
      <div className="max-w-[480px] mx-auto px-4 pb-20 md:max-w-[640px] md:px-6 md:pb-24">
        {children}
      </div>
    </div>
  );
}
