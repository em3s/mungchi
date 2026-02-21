import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect, useCallback, useRef } from "../../vendor/preact-hooks.mjs";
import { getToday, getDate, getMonth, syncNow } from "../lib/api.js";
import { navigate, logout } from "../lib/state.js";

const LOCK_PASSWORD = "999999";
import { ProgressRing } from "../components/ProgressRing.js";
import { TaskItem } from "../components/TaskItem.js";
import { BottomNav } from "../components/BottomNav.js";
import { showToast } from "../components/Toast.js";

const CHEERS = {
  perfect: [
    "와! 올클리어! 넌 진짜 최고야! 🎉",
    "완벽해! 오늘 정말 멋졌어! ✨",
    "대박! 전부 다 해냈어! 👏",
    "우와~ 100%! 자랑스러워! 🌟",
    "올클! 이 기세로 내일도 화이팅! 🔥",
  ],
  good: [
    "잘하고 있어! 조금만 더! 💪",
    "절반 넘었어! 끝까지 가보자! 🏃",
    "좋아좋아~ 이 조자! 👍",
    "대단해! 거의 다 왔어! ⭐",
  ],
  start: [
    "시작이 반이야! 하나씩 해보자! 🐣",
    "첫 발을 내딛었어! 잘하고 있어! 👣",
    "좋아~ 하나 했다! 계속 가보자! 🌱",
  ],
  zero: [
    "오늘도 파이팅! 하나부터 시작해볼까? 💫",
    "할 수 있어! 첫 번째를 눌러봐! ✊",
    "준비됐지? 시작해보자! 🚀",
    "오늘의 모험이 기다리고 있어! 🗺️",
  ],
};

function getCheer(rate) {
  const list =
    rate === 1 ? CHEERS.perfect : rate >= 0.5 ? CHEERS.good : rate > 0 ? CHEERS.start : CHEERS.zero;
  return list[Math.floor(Math.random() * list.length)];
}

function todayKST() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function formatMonth(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const CONFETTI_EMOJIS = ["🎉", "⭐", "✨", "🌟", "🎊", "💫", "🎉", "⭐", "✨", "🌟", "🎊", "💫"];

export function Dashboard({ childId }) {
  const [data, setData] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockInput, setLockInput] = useState("");
  const [lockError, setLockError] = useState(false);
  const lastSyncRef = useRef(0);
  const prevRateRef = useRef(null);
  const cheerRef = useRef({ rate: -1, message: "" });

  // 달력 상태
  const today = todayKST();
  const [calYear, setCalYear] = useState(() => parseInt(today.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);
  const [monthData, setMonthData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayData, setDayData] = useState(null);

  // 활성 달성률 (hooks에서 사용하므로 먼저 계산)
  const activeRate = data ? (selectedDate && dayData ? dayData.stats.rate : data.stats.rate) : 0;

  const load = useCallback(() => {
    getToday(childId).then(setData);
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  // 월간 데이터 로드
  const loadMonth = useCallback(() => {
    const monthStr = formatMonth(calYear, calMonth);
    getMonth(childId, monthStr).then(setMonthData);
  }, [childId, calYear, calMonth]);

  useEffect(() => {
    loadMonth();
    setSelectedDate(null);
    setDayData(null);
  }, [loadMonth]);

  // 선택된 날짜 데이터 로드
  useEffect(() => {
    if (!selectedDate) {
      setDayData(null);
      return;
    }
    getDate(childId, selectedDate).then(setDayData);
  }, [childId, selectedDate]);

  // 올클리어 컨페티
  useEffect(() => {
    if (
      prevRateRef.current !== null &&
      prevRateRef.current < 1 &&
      activeRate === 1 &&
      !selectedDate
    ) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    prevRateRef.current = activeRate;
  }, [activeRate, selectedDate]);

  // 응원 메시지 (rate 변경 시만 갱신)
  if (data && activeRate !== cheerRef.current.rate) {
    cheerRef.current = { rate: activeRate, message: getCheer(activeRate) };
  }

  async function handleSync() {
    const now = Date.now();
    if (now - lastSyncRef.current < 5000) return;
    lastSyncRef.current = now;
    setSyncing(true);
    await syncNow();
    load();
    loadMonth();
    setSyncing(false);
    showToast("싱크 완료!");
  }

  function prevMonth() {
    if (calMonth === 0) {
      setCalYear(calYear - 1);
      setCalMonth(11);
    } else setCalMonth(calMonth - 1);
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalYear(calYear + 1);
      setCalMonth(0);
    } else setCalMonth(calMonth + 1);
  }

  function handleDateClick(date) {
    setSelectedDate(date === selectedDate ? null : date);
  }

  function goToday() {
    const t = todayKST();
    setCalYear(parseInt(t.slice(0, 4)));
    setCalMonth(parseInt(t.slice(5, 7)) - 1);
    setSelectedDate(null);
  }

  function openLockModal() {
    setShowLockModal(true);
    setLockInput("");
    setLockError(false);
  }

  function closeLockModal() {
    setShowLockModal(false);
    setLockInput("");
    setLockError(false);
  }

  function handleLockKey(digit) {
    setLockError(false);
    const next = lockInput + digit;
    if (next.length >= LOCK_PASSWORD.length) {
      if (next === LOCK_PASSWORD) {
        logout();
        navigate("home");
      } else {
        setLockError(true);
        setLockInput("");
      }
    } else {
      setLockInput(next);
    }
  }

  function handleLockDelete() {
    setLockError(false);
    setLockInput((prev) => prev.slice(0, -1));
  }

  function formatSelectedDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const weekday = WEEKDAYS[d.getDay()];
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}월 ${day}일 (${weekday})`;
  }

  function getRateClass(rate) {
    if (rate >= 1) return "rate-full";
    if (rate >= 0.5) return "rate-half";
    if (rate > 0) return "rate-low";
    return "";
  }

  if (!data) return html`<div class="loading">불러오는 중...</div>`;

  const themeClass = `theme-${data.child.theme}`;
  const activeTasks = selectedDate && dayData ? dayData.tasks : data.tasks;
  const activeLabel = selectedDate ? formatSelectedDate(selectedDate) : "오늘";
  const todoTasks = activeTasks.filter((t) => !t.completed);
  const doneTasks = activeTasks.filter((t) => t.completed);

  // 달력 셀 생성
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const days = monthData?.days ?? {};

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayInfo = days[dateStr];
    cells.push({ day: d, date: dateStr, data: dayInfo || null });
  }

  return html`
    <div class="dashboard ${themeClass}">
      ${showConfetti &&
      html`
        <div class="confetti-container">
          ${CONFETTI_EMOJIS.map(
            (emoji, i) => html` <span class="confetti-piece" style="--i: ${i}">${emoji}</span> `,
          )}
        </div>
      `}

      <div class="header">
        <h1
          onTouchStart=${(e) => { e.currentTarget._lt = setTimeout(openLockModal, 800); }}
          onTouchEnd=${(e) => { clearTimeout(e.currentTarget._lt); }}
          onTouchMove=${(e) => { clearTimeout(e.currentTarget._lt); }}
        >${data.child.emoji} ${data.child.name}</h1>
        <button class="sync-btn ${syncing ? "spinning" : ""}" onClick=${handleSync}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
        </button>
      </div>

      <div class="cal-nav">
        <button class="cal-arrow" onClick=${prevMonth}>←</button>
        <span class="cal-title">${calYear}년 ${calMonth + 1}월</span>
        <button class="cal-arrow" onClick=${nextMonth}>→</button>
        <button class="cal-today-btn" onClick=${goToday}>오늘</button>
      </div>

      <div class="cal-grid">
        ${WEEKDAYS.map(
          (w) => html`
            <div class="cal-weekday${w === "일" ? " sun" : w === "토" ? " sat" : ""}">${w}</div>
          `,
        )}
        ${cells.map((cell) => {
          if (!cell) return html`<div class="cal-cell empty"></div>`;
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const hasData = cell.data != null;
          const rateClass = hasData ? getRateClass(cell.data.rate) : "";
          const isSun = new Date(cell.date + "T00:00:00").getDay() === 0;
          const isSat = new Date(cell.date + "T00:00:00").getDay() === 6;
          return html`
            <div
              class="cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}${hasData
                ? " has-data"
                : ""}${isSun ? " sun" : ""}${isSat ? " sat" : ""}"
              onClick=${() => handleDateClick(cell.date)}
            >
              <span class="cal-day">${cell.day}</span>
              ${hasData && html`<span class="cal-dot ${rateClass}"></span>`}
            </div>
          `;
        })}
      </div>

      <${ProgressRing} rate=${activeRate} />
      <div class="cheer-message" key=${cheerRef.current.message}>${cheerRef.current.message}</div>

      <div class="section-title">${activeLabel} — 할 일 (${todoTasks.length})</div>
      ${todoTasks.length === 0 && doneTasks.length === 0
        ? html`<div class="task-empty">
            ${selectedDate ? "이 날의 데이터가 없어요" : "오늘 할일이 없어요. 싱크해보세요!"}
          </div>`
        : todoTasks.length === 0
          ? html`<div class="task-empty">모두 완료! 🎉</div>`
          : html`
              <ul class="task-list">
                ${todoTasks.map((t) => html`<${TaskItem} key=${t.id} task=${t} />`)}
              </ul>
            `}
      ${doneTasks.length > 0 &&
      html`
        <div class="section-title">완료 (${doneTasks.length})</div>
        <ul class="task-list">
          ${doneTasks.map((t) => html`<${TaskItem} key=${t.id} task=${t} />`)}
        </ul>
      `}

      <${BottomNav} active="dashboard" childId=${childId} />

      ${showLockModal &&
      html`
        <div class="logout-overlay" onClick=${closeLockModal}>
          <div class="logout-modal" onClick=${(e) => e.stopPropagation()}>
            <div class="logout-modal-title">잠금 해제</div>
            <div class="logout-modal-subtitle">비밀번호를 입력하세요</div>
            <div class="pin-dots small">
              ${Array.from({ length: LOCK_PASSWORD.length }, (_, i) => i < lockInput.length).map(
                (filled, i) =>
                  html`<div
                    key=${i}
                    class="pin-dot ${filled ? "filled" : ""} ${lockError ? "error" : ""}"
                  ></div>`,
              )}
            </div>
            ${lockError && html`<div class="pin-error">비밀번호가 틀렸어요</div>`}
            <div class="pin-pad small">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                (n) =>
                  html`<button class="pin-btn" onClick=${() => handleLockKey(String(n))}>
                    ${n}
                  </button>`,
              )}
              <div class="pin-btn empty"></div>
              <button class="pin-btn" onClick=${() => handleLockKey("0")}>0</button>
              <button class="pin-btn delete" onClick=${handleLockDelete}>⌫</button>
            </div>
            <button class="logout-cancel-btn" onClick=${closeLockModal}>취소</button>
          </div>
        </div>
      `}
    </div>
  `;
}
