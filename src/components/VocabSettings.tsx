"use client";

import { useState, useEffect } from "react";
import { getAvailableVoices, speakWord, speakKorean } from "@/lib/tts";

export function VocabSettings() {
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
    const label = name || "default";
    speakWord(`I am ${label}`, 1, name || undefined);
  }

  function handleKoVoiceChange(name: string) {
    setKoVoiceName(name);
    localStorage.setItem("vocab_voice_ko", name);
    const label = name || "기본";
    speakKorean(`저는 ${label} 입니다`, 1, name || undefined);
  }

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      <h2 className="text-lg font-bold mb-4">🔊 TTS 화자</h2>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 w-6 shrink-0">🇺🇸</span>
        <select
          value={enVoiceName}
          onChange={(e) => handleEnVoiceChange(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white text-gray-700"
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
          className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white text-gray-700"
        >
          <option value="">기본</option>
          {koVoices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
        </select>
      </div>
    </section>
  );
}
