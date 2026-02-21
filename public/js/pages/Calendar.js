import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect, useCallback } from "../../vendor/preact-hooks.mjs";
import { getDate, getMonth, getChildren } from "../lib/api.js";
import { navigate } from "../lib/state.js";
import { BottomNav } from "../components/BottomNav.js";
import { TaskItem } from "../components/TaskItem.js";

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
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function Calendar({ childId }) {
  const today = todayKST();
  const [year, setYear] = useState(() => parseInt(today.slice(0, 4)));
  const [month, setMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);
  const [monthData, setMonthData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [child, setChild] = useState(null);

  // 아이 정보 로드
  useEffect(() => {
    getChildren().then((children) => {
      const c = children.find((ch) => ch.id === childId);
      if (c) setChild(c);
    });
  }, [childId]);

  // 월간 데이터 로드
  const loadMonth = useCallback(() => {
    const monthStr = formatMonth(year, month);
    getMonth(childId, monthStr).then(setMonthData);
  }, [childId, year, month]);

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

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  }

  function handleDateClick(date) {
    setSelectedDate(date === selectedDate ? null : date);
  }

  if (!child) return html`<div class="loading">불러오는 중...</div>`;

  const themeClass = `theme-${child.theme}`;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const days = monthData?.days ?? {};

  // 달력 셀 생성
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null); // 빈 셀
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayInfo = days[dateStr];
    cells.push({ day: d, date: dateStr, data: dayInfo || null });
  }

  // 선택된 날짜 포맷
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

  return html`
    <div class="calendar-page ${themeClass}">
      <div class="header">
        <button class="back-btn" onClick=${() => navigate("home")}>←</button>
        <h1>${child.emoji} ${child.name}</h1>
        <div style="width:40px"></div>
      </div>

      <div class="cal-nav">
        <button class="cal-arrow" onClick=${prevMonth}>←</button>
        <span class="cal-title">${year}년 ${month + 1}월</span>
        <button class="cal-arrow" onClick=${nextMonth}>→</button>
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

      ${selectedDate && html`
        <div class="cal-detail">
          <div class="cal-detail-header">
            <span class="cal-detail-date">${formatSelectedDate(selectedDate)}</span>
            ${dayData && dayData.stats.total > 0 && html`
              <span class="cal-detail-rate ${getRateClass(dayData.stats.rate)}">
                ${dayData.stats.rate >= 1 ? "⭐" : ""} ${Math.round(dayData.stats.rate * 100)}%
              </span>
            `}
          </div>

          ${!dayData
            ? html`<div class="cal-detail-empty">불러오는 중...</div>`
            : dayData.tasks.length === 0
            ? html`<div class="cal-detail-empty">이 날의 데이터가 없어요</div>`
            : html`
              <ul class="task-list">
                ${dayData.tasks.map((t) => html`<${TaskItem} key=${t.id} task=${t} />`)}
              </ul>
            `}
        </div>
      `}

      <${BottomNav} active="calendar" childId=${childId} />
    </div>
  `;
}
