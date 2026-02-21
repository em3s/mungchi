import { SYNC_INTERVAL_MS } from "../config.js";
import { syncAll } from "./reminders.js";

export function startScheduler() {
  // 서버 시작 시 즉시 싱크
  syncAll().catch((err) => console.error("[scheduler] Initial sync failed:", err));

  // 5분마다 자동 싱크
  setInterval(() => {
    syncAll().catch((err) => console.error("[scheduler] Scheduled sync failed:", err));
  }, SYNC_INTERVAL_MS);

  console.log(`[scheduler] Auto-sync every ${SYNC_INTERVAL_MS / 60000} minutes`);
}
