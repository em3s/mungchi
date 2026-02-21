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

function earnedIcons(count) {
  const units = [];
  const diamonds = Math.floor(count / 1000);
  const crowns = Math.floor((count % 1000) / 100);
  const trophies = Math.floor((count % 100) / 10);
  const medals = count % 10;
  if (diamonds > 0) units.push({ emoji: "💎", n: diamonds });
  if (crowns > 0) units.push({ emoji: "👑", n: crowns });
  if (trophies > 0) units.push({ emoji: "🏆", n: trophies });
  if (medals > 0) units.push({ emoji: "🏅", n: medals });
  return units;
}

export function Badges({ childId }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getBadges(childId).then(setData);
  }, [childId]);

  if (!data) return html`<div class="loading">불러오는 중...</div>`;

  const badges = data.badges;
  const earnedCount = badges.filter((b) => b.earned).length;
  const totalEarned = badges.reduce((sum, b) => sum + (b.earnedCount || 0), 0);
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
        <span class="badge-counter">${earnedCount}/${totalCount} 발견 · ${totalEarned}회 획득</span>
      </div>

      <div class="badge-progress-bar">
        <div class="badge-progress-fill" style="width: ${(earnedCount / totalCount) * 100}%"></div>
      </div>

      ${totalEarned > 0 && html`
        <div class="badge-trophy-shelf">
          ${earnedIcons(totalEarned).map((u, i) => html`
            <span class="trophy-unit" style="--d: ${i}">
              <span class="trophy-emoji">${u.emoji}</span>
              <span class="trophy-count">×${u.n}</span>
            </span>
          `)}
        </div>
      `}

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
                  ${b.earned && b.repeatable ? html`<span class="badge-count">×${b.earnedCount}</span>` : null}
                  ${b.hidden && b.earned ? html`<span class="badge-secret">SECRET</span>` : null}
                </div>
              `)}
            </div>
          </div>
        `;
      })}

      <div class="badge-hidden-hint">🤫 어딘가에 히든 뱃지가 숨어있어요...</div>

      ${selected && html`
        <div class="badge-modal-overlay" onClick=${closeModal}>
          <div class="badge-modal ${selected.earned ? "earned" : "locked"} ${selected.grade}" onClick=${(e) => e.stopPropagation()}>
            <div class="badge-modal-emoji">${selected.earned ? selected.emoji : "🔒"}</div>
            <div class="badge-modal-name">${selected.earned ? selected.name : "???"}</div>
            <span class="badge-grade ${selected.grade}">${GRADE_LABELS[selected.grade]}</span>
            <div class="badge-modal-desc">
              ${selected.earned ? selected.description : selected.hint}
            </div>
            ${selected.hidden && selected.earned ? html`<div class="badge-modal-secret">🤫 히든 뱃지 발견!</div>` : null}
            ${selected.repeatable
              ? html`<div class="badge-modal-repeat">🔄 반복 획득 가능${selected.earned ? ` · ${selected.earnedCount}회 달성` : ""}</div>`
              : html`<div class="badge-modal-repeat">🏅 1회 한정 뱃지${selected.earned ? " · 획득 완료!" : ""}</div>`
            }
            <button class="badge-modal-close" onClick=${closeModal}>닫기</button>
          </div>
        </div>
      `}

      <${BottomNav} active="badges" childId=${childId} />
    </div>
  `;
}
