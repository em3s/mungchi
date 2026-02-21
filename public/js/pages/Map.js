import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect } from "../../vendor/preact-hooks.mjs";
import { getMap } from "../lib/api.js";
import { navigate } from "../lib/state.js";
import { BottomNav } from "../components/BottomNav.js";

export function MapPage({ childId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getMap(childId).then(setData);
  }, [childId]);

  if (!data) return html`<div class="loading">불러오는 중...</div>`;

  return html`
    <div class="map-page">
      <div class="header">
        <button class="back-btn" onClick=${() => navigate("dashboard", childId)}>←</button>
        <h1>🗺️ 달성 맵</h1>
        <span />
      </div>

      <div style="text-align:center;margin-bottom:16px;color:#636e72;">
        총 완료: <strong>${data.totalCompleted}</strong>개
      </div>

      <div class="map-path">
        ${data.milestones.map(
          (m, i) => html`
            <div class="map-node ${m.unlocked ? "unlocked" : ""} ${m.current ? "current" : ""}">
              <div class="node-icon">${m.emoji}</div>
              <div class="node-label">
                <div class="title">${m.label}</div>
                <div class="req">${m.required}개 필요</div>
              </div>
            </div>
            ${i < data.milestones.length - 1 &&
            html`<div class="map-connector ${m.unlocked ? "active" : ""}"></div>`}
          `,
        )}
      </div>

      <${BottomNav} active="map" childId=${childId} />
    </div>
  `;
}
