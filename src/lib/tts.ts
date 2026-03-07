// 영어/한국어 TTS — 화자 선택 지원

let defaultEnglishVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const enUS = voices.filter((v) => v.lang === "en-US" || v.lang === "en_US");
  if (enUS.length) return enUS.find((v) => v.localService) ?? enUS[0];
  const en = voices.filter((v) => v.lang.startsWith("en"));
  if (en.length) return en.find((v) => v.localService) ?? en[0];
  const nonKo = voices.find((v) => !v.lang.startsWith("ko"));
  if (nonKo) return nonKo;
  return null;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const onReady = () => { resolve(speechSynthesis.getVoices()); };
    speechSynthesis.addEventListener("voiceschanged", onReady, { once: true });
    setTimeout(onReady, 500);
  });
}

async function ensureVoice(): Promise<void> {
  if (voicesLoaded) return;
  const voices = await loadVoices();
  defaultEnglishVoice = pickEnglishVoice(voices);
  voicesLoaded = true;
}

export async function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return loadVoices();
}

function speakOnce(text: string, lang: string, voice: SpeechSynthesisVoice | null): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.9;
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

const REPEAT_PAUSE_MS = 2000;

export async function speakWord(word: string, times: number = 1, voiceName?: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  await ensureVoice();

  let voice = defaultEnglishVoice;
  if (voiceName) {
    const found = speechSynthesis.getVoices().find((v) => v.name === voiceName);
    if (found) voice = found;
  }

  for (let i = 0; i < times; i++) {
    await speakOnce(word, "en-US", voice);
    if (i < times - 1) await new Promise((r) => setTimeout(r, REPEAT_PAUSE_MS));
  }
}

export async function speakKorean(text: string, times: number = 1, voiceName?: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.cancel();

  const voices = speechSynthesis.getVoices();
  let voice: SpeechSynthesisVoice | null = null;
  if (voiceName) {
    voice = voices.find((v) => v.name === voiceName) ?? null;
  }
  if (!voice) {
    voice =
      voices.find((v) => v.lang.startsWith("ko") && v.localService) ??
      voices.find((v) => v.lang.startsWith("ko")) ??
      null;
  }

  for (let i = 0; i < times; i++) {
    await speakOnce(text, "ko-KR", voice);
    if (i < times - 1) await new Promise((r) => setTimeout(r, REPEAT_PAUSE_MS));
  }
}
