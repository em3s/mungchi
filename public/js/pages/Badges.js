import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect } from "../../vendor/preact-hooks.mjs";
import { getBadges } from "../lib/api.js";
import { navigate } from "../lib/state.js";
import { BottomNav } from "../components/BottomNav.js";

export function Badges({ childId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getBadges(childId).then(setData);
  }, [childId]);

  if (!data) return html`<div class="loading">불러오는 중...</div>`;

  // 등급별 정렬: legendary > epic > rare > common
  const gradeOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const sorted = [...data.badges].sort(
    (a, b) => (gradeOrder[a.grade] ?? 9) - (gradeOrder[b.grade] ?? 9)
  );

  return html`
    <div class="badges-page">
      <div class="header">
        <button class="back-btn" onClick=${() => navigate("dashboard", childId)}>←</button>
        <h1>🏅 뱃지 (${sorted.length})</h1>
        <span />
      </div>

      ${sorted.length === 0
        ? html`<div class="badge-empty">아직 획득한 뱃지가 없어요.<br/>할일을 완료하면 뱃지를 받을 수 있어요!</div>`
        : html`
            <div class="badges-grid">
              ${sorted.map(
                (b) => html`
                  <div class="badge-card">
                    <div class="badge-emoji">${b.emoji}</div>
                    <div class="badge-name">${b.name}</div>
                    <span class="badge-grade ${b.grade}">${b.grade}</span>
                  </div>
                `
              )}
            </div>
          `}

      <${BottomNav} active="badges" childId=${childId} />
    </div>
  `;
}
