import fs from "node:fs";
import path from "node:path";
import { CACHE_PATH, BADGES_PATH, DATA_DIR } from "../config.js";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  priority: number;
  notes?: string;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  syncedAt: string;
}

export interface CacheData {
  [childId: string]: {
    [date: string]: DayData;
  };
}

export interface BadgeRecord {
  id: string;
  badgeId: string;
  childId: string;
  earnedAt: string;
  context?: Record<string, unknown>;
}

export interface BadgesData {
  badges: BadgeRecord[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readCache(): CacheData {
  ensureDataDir();
  if (!fs.existsSync(CACHE_PATH)) return {};
  const raw = fs.readFileSync(CACHE_PATH, "utf-8");
  return JSON.parse(raw);
}

export function writeCache(data: CacheData) {
  ensureDataDir();
  const tmp = CACHE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, CACHE_PATH);
}

export function readBadges(): BadgesData {
  ensureDataDir();
  if (!fs.existsSync(BADGES_PATH)) return { badges: [] };
  const raw = fs.readFileSync(BADGES_PATH, "utf-8");
  return JSON.parse(raw);
}

export function writeBadges(data: BadgesData) {
  ensureDataDir();
  const tmp = BADGES_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, BADGES_PATH);
}
