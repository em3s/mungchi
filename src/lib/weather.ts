// 날씨 예보 — Open-Meteo API (서울 고정, API키 불필요)

import { cached } from "@/lib/cache";

export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  weatherCode: number;
  weatherLabel: string;
  weatherEmoji: string;
  isExtreme: boolean;
  alertMessage: string | null;
}

const WMO_CODES: Record<
  number,
  { label: string; emoji: string; extreme: boolean; alert: string | null }
> = {
  0: { label: "맑음", emoji: "☀️", extreme: false, alert: null },
  1: { label: "대체로 맑음", emoji: "🌤️", extreme: false, alert: null },
  2: { label: "구름 조금", emoji: "⛅", extreme: false, alert: null },
  3: { label: "흐림", emoji: "☁️", extreme: false, alert: null },
  45: { label: "안개", emoji: "🌫️", extreme: false, alert: null },
  48: { label: "짙은 안개", emoji: "🌫️", extreme: true, alert: "짙은 안개 주의" },
  51: { label: "이슬비", emoji: "🌦️", extreme: false, alert: null },
  53: { label: "이슬비", emoji: "🌦️", extreme: false, alert: null },
  55: { label: "강한 이슬비", emoji: "🌦️", extreme: false, alert: null },
  56: { label: "얼어붙는 비", emoji: "🌧️", extreme: true, alert: "결빙 주의" },
  57: { label: "얼어붙는 비", emoji: "🌧️", extreme: true, alert: "결빙 주의" },
  61: { label: "약한 비", emoji: "🌧️", extreme: false, alert: null },
  63: { label: "비", emoji: "🌧️", extreme: false, alert: null },
  65: { label: "강한 비", emoji: "🌧️", extreme: true, alert: "강한 비 주의" },
  66: { label: "얼어붙는 비", emoji: "🌧️", extreme: true, alert: "결빙 주의" },
  67: { label: "강한 결빙비", emoji: "🌧️", extreme: true, alert: "심한 결빙 주의" },
  71: { label: "약한 눈", emoji: "🌨️", extreme: false, alert: null },
  73: { label: "눈", emoji: "❄️", extreme: false, alert: null },
  75: { label: "강한 눈", emoji: "❄️", extreme: true, alert: "폭설 주의" },
  77: { label: "싸락눈", emoji: "🌨️", extreme: false, alert: null },
  80: { label: "소나기", emoji: "🌦️", extreme: false, alert: null },
  81: { label: "소나기", emoji: "🌧️", extreme: false, alert: null },
  82: { label: "강한 소나기", emoji: "⛈️", extreme: true, alert: "강한 소나기 주의" },
  85: { label: "눈보라", emoji: "🌨️", extreme: false, alert: null },
  86: { label: "강한 눈보라", emoji: "🌨️", extreme: true, alert: "폭설 주의" },
  95: { label: "천둥번개", emoji: "⛈️", extreme: true, alert: "뇌우 주의" },
  96: { label: "우박 번개", emoji: "⛈️", extreme: true, alert: "우박 주의" },
  99: { label: "강한 우박", emoji: "⛈️", extreme: true, alert: "심한 우박 주의" },
};

const WEATHER_TTL = 30 * 60 * 1000; // 30분

const API_URL =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=37.5665&longitude=126.9780" +
  "&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weathercode" +
  "&timezone=Asia/Seoul";

export async function fetchWeather(): Promise<DailyWeather[]> {
  return cached<DailyWeather[]>("weather_forecast", WEATHER_TTL, async () => {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Weather fetch failed");
    const json = await res.json();
    const { daily } = json;

    return daily.time.map((date: string, i: number) => {
      const code = daily.weathercode[i];
      const info = WMO_CODES[code] ?? {
        label: "알 수 없음",
        emoji: "❓",
        extreme: false,
        alert: null,
      };
      return {
        date,
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        apparentMax: Math.round(daily.apparent_temperature_max[i]),
        apparentMin: Math.round(daily.apparent_temperature_min[i]),
        weatherCode: code,
        weatherLabel: info.label,
        weatherEmoji: info.emoji,
        isExtreme: info.extreme,
        alertMessage: info.alert,
      };
    });
  });
}
