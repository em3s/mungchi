import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect, useCallback } from "../../vendor/preact-hooks.mjs";
import { getToday, getStats, toggleTask as apiToggle, syncNow } from "../lib/api.js";
import { navigate } from "../lib/state.js";
import { ProgressRing } from "../components/ProgressRing.js";
import { TaskItem } from "../components/TaskItem.js";
import { BottomNav } from "../components/BottomNav.js";
import { showToast } from "../components/Toast.js";

export function Dashboard({ childId }) {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    getToday(childId).then(setData);
    getStats(childId, "week").then(setStats);
  }, [childId]);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(taskId, completed) {
    const result = await apiToggle(childId, taskId, completed);
    if (result.newBadges?.length > 0) {
      for (const b of result.newBadges) {
        showToast(`🏅 새 뱃지: ${b.name || b.badgeId}!`);
      }
    }
    load();
  }

  async function handleSync() {
    setSyncing(true);
    await syncNow();
    load();
    setSyncing(false);
    showToast("싱크 완료!");
  }

  if (!data) return html`<div class="loading">불러오는 중...</div>`;

  const themeClass = `theme-${data.child.theme}`;
  const todoTasks = data.tasks.filter((t) => !t.completed);
  const doneTasks = data.tasks.filter((t) => t.completed);

  return html`
    <div class="dashboard ${themeClass}">
      <div class="header">
        <button class="back-btn" onClick=${() => navigate("home")}>←</button>
        <h1>${data.child.emoji} ${data.child.name}</h1>
        <button class="sync-btn ${syncing ? "spinning" : ""}" onClick=${handleSync}>🔄</button>
      </div>

      <${ProgressRing} rate=${data.stats.rate} />

      <div class="section-title">할 일 (${todoTasks.length})</div>
      ${todoTasks.length === 0 && doneTasks.length === 0
        ? html`<div class="task-empty">오늘 할일이 없어요. 싱크해보세요!</div>`
        : todoTasks.length === 0
        ? html`<div class="task-empty">모두 완료! 🎉</div>`
        : html`
            <ul class="task-list">
              ${todoTasks.map((t) => html`<${TaskItem} key=${t.id} task=${t} onToggle=${handleToggle} />`)}
            </ul>
          `}

      ${doneTasks.length > 0 && html`
        <div class="section-title">완료 (${doneTasks.length})</div>
        <ul class="task-list">
          ${doneTasks.map((t) => html`<${TaskItem} key=${t.id} task=${t} onToggle=${handleToggle} />`)}
        </ul>
      `}

      ${stats && html`
        <div class="section-title">이번 주</div>
        <div class="stats-bars">
          ${stats.stats.map((s) => {
            const h = Math.max(4, s.rate * 80);
            const day = new Date(s.date + "T00:00:00").toLocaleDateString("ko", { weekday: "short" });
            return html`
              <div class="stats-bar" style="height:${h}px">
                <span class="bar-label">${day}</span>
              </div>
            `;
          })}
        </div>
      `}

      <${BottomNav} active="dashboard" childId=${childId} />
    </div>
  `;
}
