import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect } from "../../vendor/preact-hooks.mjs";
import { getChildren } from "../lib/api.js";
import { navigate } from "../lib/state.js";

export function Home() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChildren().then((data) => {
      setChildren(data);
      setLoading(false);
    });
  }, []);

  if (loading) return html`<div class="loading">불러오는 중...</div>`;

  return html`
    <div class="home">
      <h2>🍡 뭉치</h2>
      <p>누구의 할일을 볼까요?</p>
      <div class="child-cards">
        ${children.map(
          (child) => html`
            <div class="child-card" onClick=${() => navigate("dashboard", child.id)}>
              <span class="emoji">${child.emoji}</span>
              <div class="info">
                <div class="name">${child.name}</div>
                <div class="subtitle">${child.theme === "starry" ? "반짝별 수호자" : "초코별 탐험가"}</div>
              </div>
            </div>
          `
        )}
      </div>
    </div>
  `;
}
