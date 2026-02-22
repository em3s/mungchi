"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { CHILDREN } from "@/lib/constants";

export default function ChildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  const router = useRouter();
  const { childId: sessionChildId, loaded } = useSession();

  // params를 사용하기 위해 use() 대신 직접 처리
  // Next.js App Router에서 layout의 params는 동기적 접근 가능
  useEffect(() => {
    if (loaded && !sessionChildId) {
      router.replace("/");
    }
  }, [loaded, sessionChildId, router]);

  if (!loaded) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  if (!sessionChildId) return null;

  // 테마 설정
  const child = CHILDREN.find((c) => c.id === sessionChildId);
  const themeClass = child ? `theme-${child.theme}` : "";

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
