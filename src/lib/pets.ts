// 동물 키우기 시스템

import { supabase } from "@/lib/supabase/client";
import { mutate } from "swr";
import type {
  PetCatalog,
  PetItemCatalog,
  PetState,
  PetInventoryItem,
  PetLiveStats,
} from "@/lib/types";

// ===== 레벨 시스템 =====

export const LEVEL_EXP_THRESHOLDS = [0, 50, 150, 300, 500]; // level 1~5

export function getLevelFromExp(exp: number): number {
  for (let i = LEVEL_EXP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_EXP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getExpToNextLevel(exp: number): { current: number; needed: number } | null {
  const level = getLevelFromExp(exp);
  if (level >= 5) return null;
  const currentThreshold = LEVEL_EXP_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_EXP_THRESHOLDS[level];
  return {
    current: exp - currentThreshold,
    needed: nextThreshold - currentThreshold,
  };
}

export function getPetEmoji(catalog: PetCatalog, level: number): string {
  if (level <= 2) return catalog.emoji_baby;
  if (level === 3) return catalog.emoji_teen;
  return catalog.emoji_adult;
}

// ===== 실시간 스탯 계산 (시간 기반 감소) =====

// 배고픔: 4시간마다 -10
const HUNGER_DECAY_PER_MS = 10 / (4 * 60 * 60 * 1000);
// 행복도: 6시간마다 -8
const HAPPINESS_DECAY_PER_MS = 8 / (6 * 60 * 60 * 1000);

export function calcLiveStats(
  state: PetState,
  houseBonus: number,
  now: Date = new Date(),
): PetLiveStats {
  const fedElapsed = now.getTime() - new Date(state.last_fed_at).getTime();
  const playedElapsed = now.getTime() - new Date(state.last_played_at).getTime();

  const hunger = Math.max(0, Math.round(state.hunger - fedElapsed * HUNGER_DECAY_PER_MS));
  const happinessRaw = Math.max(
    0,
    Math.round(state.happiness - playedElapsed * HAPPINESS_DECAY_PER_MS),
  );
  const happiness = Math.min(100, happinessRaw + houseBonus);

  // 건강: 배고픔이 낮으면 서서히 감소
  const healthDecay = hunger < 20 ? Math.round(fedElapsed / (24 * 60 * 60 * 1000)) * 5 : 0;
  const health = Math.max(0, state.health - healthDecay);

  return {
    hunger,
    happiness,
    health,
    passiveHappinessBonus: houseBonus,
  };
}

export function getPetMood(stats: PetLiveStats): string {
  if (stats.health <= 20) return "몸이 좋지 않아요 😢";
  if (stats.hunger <= 20) return "배고파요! 🍖";
  if (stats.happiness <= 20) return "심심해요! 🎾";
  if (stats.hunger >= 80 && stats.happiness >= 80) return "행복해요! 💕";
  if (stats.hunger >= 60 && stats.happiness >= 60) return "기분이 좋아요 😊";
  return "잘 지내고 있어요 🙂";
}

// ===== DB 조회 =====

export async function getPetCatalogs(): Promise<PetCatalog[]> {
  const { data } = await supabase
    .from("pet_catalog")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data as PetCatalog[]) ?? [];
}

export async function getPetItemCatalogs(): Promise<PetItemCatalog[]> {
  const { data } = await supabase
    .from("pet_item_catalog")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data as PetItemCatalog[]) ?? [];
}

export async function getPetState(userId: string): Promise<PetState | null> {
  const { data } = await supabase
    .from("pet_states")
    .select("*")
    .eq("user_id", userId)
    .single();
  return (data as PetState) ?? null;
}

export async function getPetInventory(userId: string): Promise<PetInventoryItem[]> {
  const { data } = await supabase
    .from("pet_inventory")
    .select("*")
    .eq("user_id", userId);
  return (data as PetInventoryItem[]) ?? [];
}

// 인벤토리에서 house 아이템의 passive bonus 합산
export function calcHouseBonus(
  inventory: PetInventoryItem[],
  items: PetItemCatalog[],
): number {
  return inventory.reduce((sum, inv) => {
    if (inv.quantity <= 0) return sum;
    const item = items.find((i) => i.id === inv.item_id);
    if (!item || item.category !== "house") return sum;
    return sum + item.passive_happiness_bonus;
  }, 0);
}

// ===== DB 쓰기 =====

export async function adoptPet(
  userId: string,
  catalogId: string,
  nickname: string,
): Promise<{ ok: boolean }> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("pet_states").upsert({
    user_id: userId,
    catalog_id: catalogId,
    nickname,
    hunger: 80,
    happiness: 80,
    health: 100,
    level: 1,
    exp: 0,
    last_fed_at: now,
    last_played_at: now,
    last_cared_at: now,
    adopted_at: now,
    updated_at: now,
  });
  if (error) return { ok: false };
  mutate(`pet_state:${userId}`);
  return { ok: true };
}

// 펫 스탯 저장 (상호작용 후)
export async function savePetState(
  userId: string,
  patch: Partial<Pick<PetState, "hunger" | "happiness" | "health" | "exp" | "level" | "last_fed_at" | "last_played_at" | "last_cared_at">>,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("pet_states")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false };
  mutate(`pet_state:${userId}`);
  return { ok: true };
}

// 아이템 구매 — 인벤토리에 수량 추가
export async function addInventoryItem(
  userId: string,
  itemId: string,
  qty = 1,
): Promise<{ ok: boolean }> {
  // upsert: 이미 있으면 quantity += qty
  const { data: existing } = await supabase
    .from("pet_inventory")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("pet_inventory")
      .update({ quantity: existing.quantity + qty, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { ok: false };
  } else {
    const { error } = await supabase.from("pet_inventory").insert({
      user_id: userId,
      item_id: itemId,
      quantity: qty,
    });
    if (error) return { ok: false };
  }

  mutate(`pet_inventory:${userId}`);
  return { ok: true };
}

// 아이템 사용 — 수량 -1
export async function useInventoryItem(
  userId: string,
  itemId: string,
): Promise<{ ok: boolean }> {
  const { data: existing } = await supabase
    .from("pet_inventory")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .single();

  if (!existing || existing.quantity <= 0) return { ok: false };

  const { error } = await supabase
    .from("pet_inventory")
    .update({ quantity: existing.quantity - 1, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) return { ok: false };
  mutate(`pet_inventory:${userId}`);
  return { ok: true };
}

// SWR 캐시 무효화
export function invalidatePetCache(userId: string) {
  mutate(`pet_state:${userId}`);
  mutate(`pet_inventory:${userId}`);
}
