import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export const DATA_DIR = path.join(ROOT, "data");
export const CACHE_PATH = path.join(DATA_DIR, "cache.json");
export const BADGES_PATH = path.join(DATA_DIR, "badges.json");
export const PUBLIC_DIR = path.join(ROOT, "public");

export interface Child {
  id: string;
  name: string;
  listName: string;
  theme: "starry" | "choco";
  emoji: string;
}

export const CHILDREN: Child[] = [
  {
    id: "sihyun",
    name: "시현",
    listName: "반짝별 수호자 - 시현",
    theme: "starry",
    emoji: "⭐",
  },
  {
    id: "misong",
    name: "미송",
    listName: "초코별 탐험가 - 미송",
    theme: "choco",
    emoji: "🍫",
  },
];

export function getChild(id: string): Child | undefined {
  return CHILDREN.find((c) => c.id === id);
}

export const PORT = Number(process.env.PORT) || 3000;
export const SYNC_INTERVAL = "*/5 * * * *"; // 5분마다
