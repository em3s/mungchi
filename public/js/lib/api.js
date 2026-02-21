const BASE = "/api";

async function fetchJSON(url, opts) {
  const res = await fetch(BASE + url, opts);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getChildren() {
  return fetchJSON("/children");
}

export function getToday(childId) {
  return fetchJSON(`/children/${childId}/today`);
}

export function getBadges(childId) {
  return fetchJSON(`/children/${childId}/badges`);
}

export function getStats(childId, range = "week") {
  return fetchJSON(`/children/${childId}/stats?range=${range}`);
}

export function getMap(childId) {
  return fetchJSON(`/children/${childId}/map`);
}

export function syncNow() {
  return fetchJSON("/sync", { method: "POST" });
}
