// 앱 PIN 은 서버 환경변수 APP_PIN 에만 둔다(코드·브라우저 번들에 없음). 숫자 4~12자리.
import { createHash, timingSafeEqual } from "node:crypto";

export function appPin(): string | null {
  const p = process.env.APP_PIN ?? "";
  return /^\d{4,12}$/.test(p) ? p : null;
}

export function pinOk(given: unknown, pin: string): boolean {
  if (typeof given !== "string") return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(pin).digest();
  return timingSafeEqual(a, b);
}
