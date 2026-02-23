// 별사탕 화폐 시스템 — 잔액 조회, 거래 기록, 보상 교환

import { supabase } from "@/lib/supabase/client";
import { cached, invalidate } from "@/lib/cache";
import type { CoinTransaction, CoinReward } from "@/lib/types";

const BALANCE_TTL = 30_000; // 30초
const REWARDS_TTL = 60_000; // 1분

// --- 잔액 ---

export async function getBalance(childId: string): Promise<number> {
  return cached(`coin_balance:${childId}`, BALANCE_TTL, async () => {
    const { data } = await supabase
      .from("coin_balances")
      .select("balance")
      .eq("child_id", childId)
      .single();
    return data?.balance ?? 0;
  });
}

// --- 거래 기록 + 잔액 갱신 ---

export async function addTransaction(
  childId: string,
  amount: number,
  type: CoinTransaction["type"],
  reason?: string,
  refId?: string,
): Promise<{ ok: boolean; newBalance?: number }> {
  const { error: txErr } = await supabase.from("coin_transactions").insert({
    child_id: childId,
    amount,
    type,
    reason: reason ?? null,
    ref_id: refId ?? null,
  });
  if (txErr) return { ok: false };

  const { data: current } = await supabase
    .from("coin_balances")
    .select("balance")
    .eq("child_id", childId)
    .single();

  const newBalance = Math.max(0, (current?.balance ?? 0) + amount);
  const { error: balErr } = await supabase
    .from("coin_balances")
    .upsert({
      child_id: childId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    });

  if (balErr) return { ok: false };

  invalidate(`coin_balance:${childId}`);
  return { ok: true, newBalance };
}

// --- 거래 내역 ---

export async function getTransactions(
  childId: string,
  limit = 50,
): Promise<CoinTransaction[]> {
  const { data } = await supabase
    .from("coin_transactions")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as CoinTransaction[]) ?? [];
}

// --- 보상 카탈로그 ---

export async function getRewards(): Promise<CoinReward[]> {
  return cached("coin_rewards", REWARDS_TTL, async () => {
    const { data } = await supabase
      .from("coin_rewards")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("created_at");
    return (data as CoinReward[]) ?? [];
  });
}

export async function exchangeReward(
  childId: string,
  reward: CoinReward,
): Promise<{ ok: boolean; newBalance?: number }> {
  const balance = await getBalance(childId);
  if (balance < reward.cost) return { ok: false };

  return addTransaction(
    childId,
    -reward.cost,
    "exchange",
    `${reward.emoji} ${reward.name}`,
    reward.id,
  );
}

export function invalidateRewardsCache(): void {
  invalidate("coin_rewards");
}
