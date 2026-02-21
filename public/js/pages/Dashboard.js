import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect, useCallback } from "../../vendor/preact-hooks.mjs";
import { getToday, getDate, getMonth, syncNow } from "../lib/api.js";
import { navigate } from "../lib/state.js";
import { ProgressRing } from "../components/ProgressRing.js";
import { TaskItem } from "../components/TaskItem.js";
import { BottomNav } from "../components/BottomNav.js";
import { showToast } from "../components/Toast.js";

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

export function Dashboard({ childId }) {
  const [data, setData] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // 달력 상태
  const today = todayKST();
  const [calYear, setCalYear] = useState(() => parseInt(today.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);
  const [monthData, setMonthData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [calOpen, setCalOpen] = useState(true);

  const load = useCallback(() => {
    getToday(childId).then(setData);
  }, [childId]);

  useEffect(() => { load(); }, [load]);

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

  async function handleSync() {
    setSyncing(true);
    await syncNow();
    load();
    loadMonth();
    setSyncing(false);
    showToast("싱크 완료!");
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
    else setCalMonth(calMonth - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
    else setCalMonth(calMonth + 1);
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

  // 선택된 날짜가 있으면 그 날의 데이터, 없으면 오늘 데이터
  const activeTasks = selectedDate && dayData ? dayData.tasks : data.tasks;
  const activeRate = selectedDate && dayData ? dayData.stats.rate : data.stats.rate;
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
      <div class="header">
        <button class="back-btn" onClick=${() => navigate("home")}>←</button>
        <h1>${data.child.emoji} ${data.child.name}</h1>
        <button class="sync-btn ${syncing ? "spinning" : ""}" onClick=${handleSync}>🔄</button>
      </div>

      <div class="section-title toggle" onClick=${() => setCalOpen(!calOpen)}>
        <span>${calOpen ? "▼" : "▶"} 📅 달력</span>
      </div>

      ${calOpen && html`
        <div class="cal-nav">
          <button class="cal-arrow" onClick=${prevMonth}>←</button>
          <span class="cal-title">${calYear}년 ${calMonth + 1}월</span>
          <button class="cal-arrow" onClick=${nextMonth}>→</button>
          <button class="cal-today-btn" onClick=${goToday}>오늘</button>
        </div>

        <div class="cal-grid">
          ${WEEKDAYS.map((w) => html`
            <div class="cal-weekday${w === "일" ? " sun" : w === "토" ? " sat" : ""}">${w}</div>
          `)}
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
                class="cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}${hasData ? " has-data" : ""}${isSun ? " sun" : ""}${isSat ? " sat" : ""}"
                onClick=${() => handleDateClick(cell.date)}
              >
                <span class="cal-day">${cell.day}</span>
                ${hasData && html`<span class="cal-dot ${rateClass}"></span>`}
              </div>
            `;
          })}
        </div>
      `}

      <${ProgressRing} rate=${activeRate} />

      <div class="section-title">${activeLabel} — 할 일 (${todoTasks.length})</div>
      ${todoTasks.length === 0 && doneTasks.length === 0
        ? html`<div class="task-empty">${selectedDate ? "이 날의 데이터가 없어요" : "오늘 할일이 없어요. 싱크해보세요!"}</div>`
        : todoTasks.length === 0
        ? html`<div class="task-empty">모두 완료! 🎉</div>`
        : html`
            <ul class="task-list">
              ${todoTasks.map((t) => html`<${TaskItem} key=${t.id} task=${t} />`)}
            </ul>
          `}

      ${doneTasks.length > 0 && html`
        <div class="section-title">완료 (${doneTasks.length})</div>
        <ul class="task-list">
          ${doneTasks.map((t) => html`<${TaskItem} key=${t.id} task=${t} />`)}
        </ul>
      `}

      <${BottomNav} active="dashboard" childId=${childId} />
    </div>
  `;
}
