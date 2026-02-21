import { execSync } from "node:child_process";
import { CHILDREN } from "../config.js";
import { readCache, writeCache, type Task, type CacheData } from "./cache.js";

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

function todayKST(): string {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
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
  const d = new Date(dueDate);
  // KST = UTC + 9
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export async function syncAll(): Promise<CacheData> {
  const today = todayKST();
  const cache = readCache();

  for (const child of CHILDREN) {
    const items = parseReminders(child.listName);
    // 오늘 dueDate에 해당하는 항목만 필터
    const todayItems = items.filter((item) => dueDateToKST(item.dueDate) === today);
    const tasks = todayItems.map(toTask);

    if (!cache[child.id]) cache[child.id] = {};

    // 오늘 데이터만 갱신 (과거 데이터 보존)
    cache[child.id][today] = {
      date: today,
      tasks,
      syncedAt: new Date().toISOString(),
    };
  }

  writeCache(cache);
  console.log(`[sync] Synced at ${new Date().toISOString()} — today: ${today}`);
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
