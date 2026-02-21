import { html } from "../../vendor/htm-preact.mjs";

export function TaskItem({ task }) {
  return html`
    <li class="task-item ${task.completed ? "completed" : ""}">
      <span class="task-check ${task.completed ? "checked" : ""}">
        ${task.completed ? "✓" : ""}
      </span>
      <span class="task-title">${task.title}</span>
    </li>
  `;
}
