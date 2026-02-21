import { html } from "../../vendor/htm-preact.mjs";
import { navigate } from "../lib/state.js";

export function BottomNav({ active, childId }) {
  function go(page) {
    navigate(page, childId);
  }

  return html`
    <div class="bottom-nav">
      <div class="nav-inner">
        <button
          class="nav-btn ${active === "dashboard" ? "active" : ""}"
          onClick=${() => go("dashboard")}
        >
          <span class="icon">📋</span>
          <span>할일</span>
        </button>
        <button
          class="nav-btn ${active === "badges" ? "active" : ""}"
          onClick=${() => go("badges")}
        >
          <span class="icon">🏅</span>
          <span>뱃지</span>
        </button>
        <button class="nav-btn ${active === "map" ? "active" : ""}" onClick=${() => go("map")}>
          <span class="icon">🗺️</span>
          <span>달성맵</span>
        </button>
      </div>
    </div>
  `;
}
