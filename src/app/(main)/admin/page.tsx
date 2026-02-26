"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PinModal } from "@/components/PinModal";
import { SupervisorFAB } from "@/components/SupervisorFAB";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { AdminFeatureFlags } from "@/components/admin/AdminFeatureFlags";
import { AdminCoinSection } from "@/components/admin/AdminCoinSection";
import { AdminVocabSection } from "@/components/admin/AdminVocabSection";
import { AdminTaskSection } from "@/components/admin/AdminTaskSection";

const ADMIN_SESSION_KEY = "mungchi_admin";

export default function AdminPage() {
  const router = useRouter();
  const { message, showToast } = useToast();

  // 인증 상태
  const [authed, setAuthed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 세션 확인
  useEffect(() => {
    const session = localStorage.getItem(ADMIN_SESSION_KEY);
    if (session === "true") {
      setAuthed(true);
      sessionStorage.setItem("mungchi_supervisor", "true");
    }
    setLoaded(true);
  }, []);

  // PIN 성공
  const handlePinSuccess = useCallback(() => {
    localStorage.setItem(ADMIN_SESSION_KEY, "true");
    sessionStorage.setItem("mungchi_supervisor", "true");
    setAuthed(true);
  }, []);

  // 로딩
  if (!loaded) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  // PIN 인증
  if (!authed) {
    return (
      <PinModal
        title="관리자"
        subtitle="비밀번호를 입력하세요"
        emoji="🔒"
        onSuccess={handlePinSuccess}
        onCancel={() => router.push("/")}
      />
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 pt-6 pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🔧 관리</h1>
        <button
          className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg active:bg-gray-200"
          onClick={() => router.push("/")}
        >
          홈으로
        </button>
      </div>

      <AdminFeatureFlags showToast={showToast} />
      <AdminCoinSection showToast={showToast} />
      <AdminVocabSection showToast={showToast} />
      <AdminTaskSection showToast={showToast} />

      <SupervisorFAB />
      <Toast message={message} />
    </div>
  );
}
