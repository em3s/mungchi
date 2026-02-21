import { html } from "../../vendor/htm-preact.mjs";

export function ProgressRing({ rate = 0, size = 160, stroke = 12 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - rate);
  const pct = Math.round(rate * 100);

  return html`
    <div class="progress-ring-wrap">
      <div class="progress-ring-container">
        <svg viewBox="0 0 ${size} ${size}">
          <circle class="progress-ring-bg" cx="${size / 2}" cy="${size / 2}" r="${radius}" />
          <circle class="progress-ring-fill"
            cx="${size / 2}" cy="${size / 2}" r="${radius}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}" />
        </svg>
        <div class="progress-ring-text">
          <div class="pct">${pct}%</div>
          <div class="label">${rate === 1 ? "올클리어!" : "달성률"}</div>
        </div>
      </div>
    </div>
  `;
}
