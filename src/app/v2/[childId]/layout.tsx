"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useThemeOverride } from "@/hooks/useThemeOverride";
import { USERS } from "@/lib/constants";
import Link from "next/link";
import { PinModal } from "@/components/PinModal";
import { useRealtimeFlags } from "@/hooks/useRealtimeFlags";

export default function V2ChildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const { childId: sessionChildId, loaded, login } = useSession();
  const { override: themeOverride } = useThemeOverride(childId);

  const child = USERS.find((c) => c.id === childId);
  useRealtimeFlags();

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

  if (!child) {
    router.replace("/");
    return null;
  }

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

  const themeClass = `theme-preset-${themeOverride || child.theme}`;

  return (
    <div
      className={themeClass}
      style={{ background: "var(--bg)", minHeight: "100dvh" }}
    >
      {children}

      {/* v1으로 돌아가기 FAB */}
      <Link
        href={`/${childId}`}
        className="fixed bottom-20 right-4 z-50 w-11 h-11 rounded-full bg-gray-800/80 text-white flex items-center justify-center text-lg shadow-lg active:scale-95 transition-transform"
        title="기존 버전으로 돌아가기"
      >
        ←
      </Link>
    </div>
  );
}
