import { execSync } from "node:child_process";
import { CHILDREN } from "../config.js";
import { readCache, writeCache, type Task, type CacheData } from "./cache.js";
import { todayKST, toKSTDate } from "../lib/date.js";

interface RemindctlItem {
  id: string;
  title: string;
  isCompleted: boolean;
  completionDate?: string;
  dueDate?: string;
  priority?: string;
  notes?: string;
  listName?: string;
  listID?: string;
}

function parseReminders(listName: string): RemindctlItem[] {
  try {
    const output = execSync(
      `remindctl show all --list "${listName}" --json`,
      { encoding: "utf-8", timeout: 10000 }
    );
    return JSON.parse(output);
  } catch (err) {
    console.error(`Failed to fetch reminders for "${listName}":`, err);
    return [];
  }
}

function toTask(item: RemindctlItem, index: number): Task {
  return {
    id: item.id || `task-${index}`,
    title: item.title,
    completed: item.isCompleted,
    completedAt: item.completionDate,
    dueDate: item.dueDate,
    priority: item.priority === "none" ? 0 : Number(item.priority) || 0,
    notes: item.notes,
  };
}

function dueDateToKST(dueDate?: string): string | null {
  if (!dueDate) return null;
  return toKSTDate(new Date(dueDate));
}

export async function syncAll(): Promise<CacheData> {
  const cache = readCache();
  const syncedAt = new Date().toISOString();

  for (const child of CHILDREN) {
    const items = parseReminders(child.listName);
    if (!cache[child.id]) cache[child.id] = {};

    // 날짜별로 그룹핑 (dueDate 없는 항목은 무시)
    const byDate: Record<string, RemindctlItem[]> = {};
    for (const item of items) {
      const date = dueDateToKST(item.dueDate);
      if (!date) continue;
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(item);
    }

    // 모든 날짜 데이터 갱신
    for (const [date, dateItems] of Object.entries(byDate)) {
      cache[child.id][date] = {
        date,
        tasks: dateItems.map(toTask),
        syncedAt,
      };
    }
  }

  writeCache(cache);
  console.log(`[sync] Synced at ${syncedAt}`);
  return cache;
}

export async function toggleTask(
  childId: string,
  taskId: string,
  completed: boolean
): Promise<boolean> {
  const child = CHILDREN.find((c) => c.id === childId);
  if (!child) return false;

  try {
    const flag = completed ? "--complete" : "--incomplete";
    execSync(`remindctl edit "${taskId}" ${flag}`, {
      encoding: "utf-8",
      timeout: 10000,
    });

    // 캐시도 업데이트
    const cache = readCache();
    const today = todayKST();
    const dayData = cache[childId]?.[today];
    if (dayData) {
      const task = dayData.tasks.find((t) => t.id === taskId);
      if (task) {
        task.completed = completed;
        task.completedAt = completed ? new Date().toISOString() : undefined;
        writeCache(cache);
      }
    }
    return true;
  } catch (err) {
    console.error(`Failed to toggle task ${taskId}:`, err);
    return false;
  }
}
