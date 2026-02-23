"use client";

import { useState } from "react";
import { reloadDictionary } from "@/lib/vocab";

interface VocabSettingsProps {
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function VocabSettings({ onClose, onToast }: VocabSettingsProps) {
  const [reloading, setReloading] = useState(false);

  async function handleReload() {
    setReloading(true);
    try {
      const count = await reloadDictionary();
      onToast(`사전 리로드 완료 (${count}개)`);
    } catch {
      onToast("사전 리로드 실패");
    } finally {
      setReloading(false);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-[999] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">사전 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 text-xl px-2 active:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleReload}
            disabled={reloading}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl active:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <span className="text-xl">{reloading ? "⏳" : "🔄"}</span>
            <div className="text-left">
              <div className="font-semibold text-sm text-gray-800">
                {reloading ? "리로드 중..." : "사전 리로드"}
              </div>
              <div className="text-xs text-gray-400">
                IndexedDB 초기화 후 최신 데이터로 재구성
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
