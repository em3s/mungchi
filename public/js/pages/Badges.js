import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect } from "../../vendor/preact-hooks.mjs";
import { getBadges } from "../lib/api.js";
import { navigate } from "../lib/state.js";
import { BottomNav } from "../components/BottomNav.js";

const CATEGORY_LABELS = {
  daily: "📋 일일",
  streak: "🔥 연속",
  milestone: "🏔️ 마일스톤",
  weekly: "📈 주간",
  special: "✨ 스페셜",
};

const CATEGORY_ORDER = ["daily", "streak", "milestone", "weekly", "special"];

const GRADE_LABELS = {
  common: "일반",
  rare: "레어",
  epic: "에픽",
  legendary: "전설",
};

export function Badges({ childId }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getBadges(childId).then(setData);
  }, [childId]);

  if (!data) return html`<div class="loading">불러오는 중...</div>`;

  const badges = data.badges;
  const earnedCount = badges.filter((b) => b.earned).length;
  const totalCount = badges.length;

  // 카테고리별 그룹
  const grouped = {};
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = badges.filter((b) => b.category === cat);
  }

  function closeModal() {
    setSelected(null);
  }

  return html`
    <div class="badges-page">
      <div class="header">
        <button class="back-btn" onClick=${() => navigate("dashboard", childId)}>←</button>
        <h1>🏅 뱃지</h1>
        <span class="badge-counter">${earnedCount}/${totalCount}</span>
      </div>

      <div class="badge-progress-bar">
        <div class="badge-progress-fill" style="width: ${(earnedCount / totalCount) * 100}%"></div>
      </div>

      ${CATEGORY_ORDER.map((cat) => {
        const catBadges = grouped[cat];
        if (!catBadges || catBadges.length === 0) return null;
        const catEarned = catBadges.filter((b) => b.earned).length;
        return html`
          <div class="badge-category">
            <div class="badge-category-title">
              ${CATEGORY_LABELS[cat]} <span class="badge-category-count">${catEarned}/${catBadges.length}</span>
            </div>
            <div class="badges-grid">
              ${catBadges.map((b) => html`
                <div
                  class="badge-card ${b.earned ? "earned" : "locked"} ${b.grade}"
                  onClick=${() => setSelected(b)}
                >
                  <div class="badge-emoji">${b.earned ? b.emoji : "🔒"}</div>
                  <div class="badge-name">${b.earned ? b.name : "???"}</div>
                  <span class="badge-grade ${b.grade}">${GRADE_LABELS[b.grade]}</span>
                  ${b.earned && b.earnedCount > 1 ? html`<span class="badge-count">×${b.earnedCount}</span>` : null}
                </div>
              `)}
            </div>
          </div>
        `;
      })}

      ${selected && html`
        <div class="badge-modal-overlay" onClick=${closeModal}>
          <div class="badge-modal ${selected.earned ? "earned" : "locked"} ${selected.grade}" onClick=${(e) => e.stopPropagation()}>
            <div class="badge-modal-emoji">${selected.earned ? selected.emoji : "🔒"}</div>
            <div class="badge-modal-name">${selected.earned ? selected.name : "???"}</div>
            <span class="badge-grade ${selected.grade}">${GRADE_LABELS[selected.grade]}</span>
            <div class="badge-modal-desc">
              ${selected.earned ? selected.description : selected.hint}
            </div>
            ${selected.earned && selected.repeatable && html`
              <div class="badge-modal-repeat">🔄 반복 획득 가능 · ${selected.earnedCount}회 달성</div>
            `}
            ${selected.earned && !selected.repeatable && html`
              <div class="badge-modal-repeat">🏅 1회 한정 뱃지</div>
            `}
            <button class="badge-modal-close" onClick=${closeModal}>닫기</button>
          </div>
        </div>
      `}

      <${BottomNav} active="badges" childId=${childId} />
    </div>
  `;
}
