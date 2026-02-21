import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect, useCallback } from "../../vendor/preact-hooks.mjs";
import { getChildren } from "../lib/api.js";
import { navigate, login } from "../lib/state.js";

const PASSWORD = "49634963";

export function Home() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    getChildren().then((data) => {
      setChildren(data);
      setLoading(false);
    });
  }, []);

  const handleChildClick = useCallback((child) => {
    setSelectedChild(child);
    setPinInput("");
    setPinError(false);
  }, []);

  const handleKey = useCallback(
    (digit) => {
      setPinError(false);
      const next = pinInput + digit;
      if (next.length >= PASSWORD.length) {
        if (next === PASSWORD) {
          login(selectedChild.id);
          navigate("dashboard", selectedChild.id);
        } else {
          setPinError(true);
          setPinInput("");
        }
      } else {
        setPinInput(next);
      }
    },
    [pinInput, selectedChild],
  );

  const handleDelete = useCallback(() => {
    setPinError(false);
    setPinInput((prev) => prev.slice(0, -1));
  }, []);

  const closeModal = useCallback(() => {
    setSelectedChild(null);
    setPinInput("");
    setPinError(false);
  }, []);

  if (loading) return html`<div class="loading">불러오는 중...</div>`;

  const dots = Array.from({ length: PASSWORD.length }, (_, i) => i < pinInput.length);

  return html`
    <div class="home">
      <h2>🍡 뭉치</h2>
      <p>누구의 할일을 볼까요?</p>
      <div class="child-cards">
        ${children.map(
          (child) => html`
            <div class="child-card" onClick=${() => handleChildClick(child)}>
              <span class="emoji">${child.emoji}</span>
              <div class="info">
                <div class="name">${child.name}</div>
                <div class="subtitle">
                  ${child.theme === "starry" ? "반짝별 수호자" : "초코별 탐험가"}
                </div>
              </div>
            </div>
          `,
        )}
      </div>
      ${selectedChild &&
      html`
        <div class="logout-overlay" onClick=${closeModal}>
          <div class="logout-modal" onClick=${(e) => e.stopPropagation()}>
            <div class="logout-modal-emoji">${selectedChild.emoji}</div>
            <div class="logout-modal-title">${selectedChild.name}</div>
            <div class="logout-modal-subtitle">비밀번호를 입력하세요</div>
            <div class="pin-dots small">
              ${dots.map(
                (filled, i) =>
                  html`<div
                    key=${i}
                    class="pin-dot ${filled ? "filled" : ""} ${pinError ? "error" : ""}"
                  ></div>`,
              )}
            </div>
            ${pinError && html`<div class="pin-error">비밀번호가 틀렸어요</div>`}
            <div class="pin-pad small">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                (n) =>
                  html`<button class="pin-btn" onClick=${() => handleKey(String(n))}>
                    ${n}
                  </button>`,
              )}
              <div class="pin-btn empty"></div>
              <button class="pin-btn" onClick=${() => handleKey("0")}>0</button>
              <button class="pin-btn delete" onClick=${handleDelete}>⌫</button>
            </div>
            <button class="logout-cancel-btn" onClick=${closeModal}>취소</button>
          </div>
        </div>
      `}
    </div>
  `;
}
