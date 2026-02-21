import cron from "node-cron";
import { SYNC_INTERVAL } from "../config.js";
import { syncAll } from "./reminders.js";

export function startScheduler() {
  // 서버 시작 시 즉시 싱크
  syncAll().catch((err) => console.error("[scheduler] Initial sync failed:", err));

  // 5분마다 자동 싱크
  cron.schedule(SYNC_INTERVAL, () => {
    syncAll().catch((err) => console.error("[scheduler] Scheduled sync failed:", err));
  });

  console.log(`[scheduler] Auto-sync every 5 minutes`);
}
