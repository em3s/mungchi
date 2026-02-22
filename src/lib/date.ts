/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
export function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** KST 기준 날짜 변환 */
export function toKSTDate(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** 날짜 오프셋 계산 */
export function dateOffset(base: string, days: number): string {
  const d = new Date(base + "T00:00:00+09:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 월 포맷 (YYYY-MM) */
export function formatMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** 해당 월의 일수 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 해당 월 1일의 요일 (0=일, 6=토) */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
