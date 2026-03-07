"use client";

import { useState, useEffect } from "react";
import { reloadDictionary } from "@/lib/vocab";
import { getAvailableVoices, speakWord, speakKorean } from "@/lib/tts";

interface VocabSettingsProps {
  onClose: () => void;
  onToast: (msg: string) => void;
  onVoiceChange?: (en: string, ko: string) => void;
}

export function VocabSettings({ onClose, onToast, onVoiceChange }: VocabSettingsProps) {
  const [reloading, setReloading] = useState(false);
  const [enVoices, setEnVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [koVoices, setKoVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [enVoiceName, setEnVoiceName] = useState("");
  const [koVoiceName, setKoVoiceName] = useState("");

  useEffect(() => {
    getAvailableVoices().then((voices) => {
      setEnVoices(voices.filter((v) => v.lang.startsWith("en")));
      setKoVoices(voices.filter((v) => v.lang.startsWith("ko")));
      setEnVoiceName(localStorage.getItem("vocab_voice_en") ?? "");
      setKoVoiceName(localStorage.getItem("vocab_voice_ko") ?? "");
    });
  }, []);

  function handleEnVoiceChange(name: string) {
    setEnVoiceName(name);
    localStorage.setItem("vocab_voice_en", name);
    onVoiceChange?.(name, koVoiceName);
    const label = name || "default";
    speakWord(`I am ${label}`, 1, name || undefined);
  }

  function handleKoVoiceChange(name: string) {
    setKoVoiceName(name);
    localStorage.setItem("vocab_voice_ko", name);
    onVoiceChange?.(enVoiceName, name);
    const label = name || "기본";
    speakKorean(`저는 ${label} 입니다`, 1, name || undefined);
  }

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
          <button onClick={onClose} className="text-gray-400 text-xl px-2 active:text-gray-600">✕</button>
        </div>

        <div className="flex flex-col gap-3">
          {/* TTS 화자 설정 */}
          <div className="bg-gray-50 rounded-xl px-4 py-3.5">
            <div className="text-xs font-semibold text-gray-500 mb-3">TTS 화자</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 w-6 shrink-0">🇺🇸</span>
              <select
                value={enVoiceName}
                onChange={(e) => handleEnVoiceChange(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
              >
                <option value="">기본</option>
                {enVoices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6 shrink-0">🇰🇷</span>
              <select
                value={koVoiceName}
                onChange={(e) => handleKoVoiceChange(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
              >
                <option value="">기본</option>
                {koVoices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
            </div>
          </div>

          {/* 사전 리로드 */}
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
              <div className="text-xs text-gray-400">IndexedDB 초기화 후 최신 데이터로 재구성</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
