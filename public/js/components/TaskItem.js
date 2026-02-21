import { html } from "../../vendor/htm-preact.mjs";
import { useState } from "../../vendor/preact-hooks.mjs";

export function TaskItem({ task, onToggle }) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    await onToggle(task.id, !task.completed);
    setLoading(false);
  }

  return html`
    <li class="task-item ${task.completed ? "completed" : ""}">
      <button class="task-check ${task.completed ? "checked" : ""}"
        onClick=${handleToggle}
        disabled=${loading}>
        ${task.completed ? "✓" : ""}
      </button>
      <span class="task-title">${task.title}</span>
    </li>
  `;
}
