// 영어/한국어 TTS — 화자 선택 지원

// 기호만 구분자로 처리, 공백은 구문의 일부로 유지
// 단어 내부 하이픈(well-known)은 보호, 기호·구두점만 쉬어 읽기
const ALPHA_KO = "[a-zA-Z\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]";
const INTRA_HYPHEN_RE = new RegExp(`(${ALPHA_KO})-(?=${ALPHA_KO})`, "g");
// 영문자·한글·공백·\x01(하이픈 자리표) 이외 문자가 1개 이상이면 구분자
const SYMBOL_SEP_RE = /[^a-zA-Z\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\s\x01]+/g;

function splitForTTS(text: string): string[] {
  return text
    .replace(INTRA_HYPHEN_RE, "$1\x01") // 단어 내부 하이픈 보호
    .split(SYMBOL_SEP_RE)
    .map((p) => p.trim().replace(/\x01/g, "-")) // 하이픈 복원
    .filter((p) => p.length > 0);
}

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

const SYMBOL_PAUSE_MS = 700;
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

  const parts = splitForTTS(word);
  for (let i = 0; i < times; i++) {
    for (let j = 0; j < parts.length; j++) {
      await speakOnce(parts[j], "en-US", voice);
      if (j < parts.length - 1) await new Promise((r) => setTimeout(r, SYMBOL_PAUSE_MS));
    }
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
