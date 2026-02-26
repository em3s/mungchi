// 초코 화폐 시스템 — 잔액 조회, 거래 기록, 보상 교환

import { supabase } from "@/lib/supabase/client";
import { mutate } from "swr";
import type { CoinTransaction, CoinReward } from "@/lib/types";

// --- 잔액 ---

export async function getBalance(childId: string): Promise<number> {
  const { data } = await supabase
    .from("coin_balances")
    .select("balance")
    .eq("user_id", childId)
    .single();
  return data?.balance ?? 0;
}

// --- 거래 기록 + 잔액 갱신 (Supabase RPC — 원자적) ---

export async function addTransaction(
  childId: string,
  amount: number,
  type: CoinTransaction["type"],
  reason?: string,
  refId?: string,
): Promise<{ ok: boolean; newBalance?: number }> {
  const { data, error } = await supabase.rpc("add_coin_transaction", {
    p_user_id: childId,
    p_amount: amount,
    p_type: type,
    p_reason: reason ?? null,
    p_ref_id: refId ?? null,
  });

  if (error) return { ok: false };

  const newBalance = data as number;
  mutate(`coin_balance:${childId}`);
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
    .eq("user_id", childId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as CoinTransaction[]) ?? [];
}

// --- 보상 카탈로그 ---

export async function getRewards(): Promise<CoinReward[]> {
  const { data } = await supabase
    .from("coin_rewards")
    .select("*")
    .eq("active", true)
    .order("sort_order")
    .order("created_at");
  return (data as CoinReward[]) ?? [];
}

export async function exchangeReward(
  childId: string,
  reward: CoinReward,
): Promise<{ ok: boolean; newBalance?: number }> {
  // 원자적 교환 시도 (잔액 확인 + 차감을 DB 레벨에서 직렬화)
  const { data, error } = await supabase.rpc("exchange_reward", {
    p_user_id: childId,
    p_cost: reward.cost,
    p_reason: `${reward.emoji} ${reward.name}`,
    p_ref_id: reward.id,
  });

  if (!error) {
    if (data === -1) return { ok: false }; // 잔액 부족
    const newBalance = data as number;
    mutate(`coin_balance:${childId}`);
    return { ok: true, newBalance };
  }

  // Fallback: RPC 미설치 시 기존 방식
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
  mutate("coin_rewards");
}
