"use client";

import { useEffect, useState, useCallback } from "react";
import { PinModal } from "@/components/PinModal";
import { Toast } from "@/components/Toast";
import { TopTabs } from "@/components/TopTabs";
import { useToast } from "@/hooks/useToast";
import { AdminVocabSection } from "@/components/admin/AdminVocabSection";

const SESSION_KEY = "mungchi_session";

export default function AdminPage() {
  const { message, showToast } = useToast();

  const [authed, setAuthed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY) === "true") setAuthed(true);
    setLoaded(true);
  }, []);

  const handlePinSuccess = useCallback(() => {
    localStorage.setItem(SESSION_KEY, "true");
    setAuthed(true);
  }, []);

  if (!loaded) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  if (!authed) {
    return (
      <PinModal
        title="뭉치 단어장"
        subtitle="비밀번호를 입력하세요"
        emoji="🔒"
        onSuccess={handlePinSuccess}
      />
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 pt-4 pb-20">
      <TopTabs />
      <AdminVocabSection showToast={showToast} />
      <Toast message={message} />
    </div>
  );
}
