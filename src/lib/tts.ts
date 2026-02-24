// 영어 TTS — 명시적 영어 음성 선택 (iOS/iPad 한국어 기기 대응)

let englishVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // 1순위: en-US
  const enUS = voices.filter((v) => v.lang === "en-US" || v.lang === "en_US");
  if (enUS.length) return enUS.find((v) => v.localService) ?? enUS[0];

  // 2순위: en-GB 등 영어권
  const en = voices.filter((v) => v.lang.startsWith("en"));
  if (en.length) return en.find((v) => v.localService) ?? en[0];

  // 3순위: 한국어가 아닌 아무 음성 (최후 수단)
  const nonKo = voices.find((v) => !v.lang.startsWith("ko"));
  if (nonKo) return nonKo;

  return null;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);

  // iOS Safari: voiceschanged 이벤트 대기
  return new Promise((resolve) => {
    const onReady = () => {
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener("voiceschanged", onReady, { once: true });
    setTimeout(onReady, 500);
  });
}

async function ensureVoice(): Promise<void> {
  if (voicesLoaded) return;

  const voices = await loadVoices();
  englishVoice = pickEnglishVoice(voices);
  voicesLoaded = true;
}

export async function speakWord(word: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  speechSynthesis.cancel();
  await ensureVoice();

  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.9;

  if (englishVoice) {
    u.voice = englishVoice;
  }

  speechSynthesis.speak(u);
}
