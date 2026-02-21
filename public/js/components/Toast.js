import { html } from "../../vendor/htm-preact.mjs";
import { useState, useEffect } from "../../vendor/preact-hooks.mjs";

let _showToast = null;

export function showToast(message) {
  if (_showToast) _showToast(message);
}

export function ToastContainer() {
  const [msg, setMsg] = useState(null);

  _showToast = (message) => {
    setMsg(message);
    setTimeout(() => setMsg(null), 3000);
  };

  if (!msg) return null;

  return html`<div class="toast">${msg}</div>`;
}
