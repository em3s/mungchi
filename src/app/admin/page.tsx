"use client";

import { PinModal } from "@/components/PinModal";
import { Toast } from "@/components/Toast";
import { TopTabs } from "@/components/TopTabs";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { AdminVocabSection } from "@/components/admin/AdminVocabSection";
import { VocabSettings } from "@/components/VocabSettings";

export default function AdminPage() {
  const { message, showToast } = useToast();

  const { authed, loaded, onPinSuccess: handlePinSuccess } = useAuth();

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
      <VocabSettings />
      <Toast message={message} />
    </div>
  );
}
