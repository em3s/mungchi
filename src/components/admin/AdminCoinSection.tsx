"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { USERS } from "@/lib/constants";
import {
  getBalance,
  addTransaction,
  getTransactions,
  invalidateRewardsCache,
} from "@/lib/coins";
import {
  getVocabConfig,
  setVocabConfig as saveVocabConfig,
} from "@/lib/vocab";
import type { CoinReward, CoinTransaction } from "@/lib/types";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface Props {
  showToast: (msg: string) => void;
}

export function AdminCoinSection({ showToast }: Props) {
  // 초코 관리
  const [coinBalances, setCoinBalances] = useState<Record<string, number>>({});
  const [adjustChildId, setAdjustChildId] = useState("sihyun");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [coinRewards, setCoinRewards] = useState<CoinReward[]>([]);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardEmoji, setNewRewardEmoji] = useState("🎁");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newRewardCost, setNewRewardCost] = useState("");
  const [coinTxChild, setCoinTxChild] = useState("sihyun");
  const [coinTxList, setCoinTxList] = useState<CoinTransaction[]>([]);

  // 단어장 보상 설정
  const [vocabConfig, setVocabConfigState] = useState<Record<string, number>>({});
  const [editingConfig, setEditingConfig] = useState<Record<string, string>>({});

  const loadCoinData = useCallback(async () => {
    const entries = await Promise.all(
      USERS.map(async (u) => [u.id, await getBalance(u.id)] as const)
    );
    setCoinBalances(Object.fromEntries(entries));
    const { data } = await supabase
      .from("coin_rewards")
      .select("*")
      .order("sort_order")
      .order("created_at");
    setCoinRewards((data as CoinReward[]) ?? []);
  }, []);

  useEffect(() => {
    loadCoinData();
    getVocabConfig().then(setVocabConfigState);
  }, [loadCoinData]);

  return (
    <>
      {/* === 초코 관리 섹션 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">🍪 초코 관리</h2>

        {/* 잔액 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">잔액</label>
          {USERS.map((child) => (
            <div key={child.id} className="flex items-center justify-between py-2">
              <span className="text-sm">{child.emoji} {child.name}</span>
              <span className="font-bold text-amber-600">🍪 {coinBalances[child.id] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* 수동 조정 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">수동 조정</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {USERS.map((child) => (
              <button
                key={child.id}
                onClick={() => setAdjustChildId(child.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  adjustChildId === child.id
                    ? "bg-[#6c5ce7] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {child.emoji} {child.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="금액 (+/-)"
              className="w-20 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="사유"
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={async () => {
                const amt = parseInt(adjustAmount);
                if (!amt || isNaN(amt)) return;
                const result = await addTransaction(
                  adjustChildId,
                  amt,
                  "admin_adjust",
                  adjustReason || "관리자 조정",
                );
                if (result.ok) {
                  setCoinBalances((prev) => ({
                    ...prev,
                    [adjustChildId]: result.newBalance ?? 0,
                  }));
                  showToast(`초코 ${amt > 0 ? "+" : ""}${amt} 완료`);
                  setAdjustAmount("");
                  setAdjustReason("");
                } else {
                  showToast("조정 실패");
                }
              }}
              disabled={!adjustAmount || isNaN(parseInt(adjustAmount))}
              className="bg-amber-500 text-white px-3 py-2 rounded-xl text-sm font-semibold shrink-0 disabled:opacity-40 active:opacity-80"
            >
              적용
            </button>
          </div>
        </div>

        {/* 거래 내역 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-semibold text-gray-600">최근 거래</label>
            {USERS.map((child) => (
              <button
                key={child.id}
                onClick={async () => {
                  setCoinTxChild(child.id);
                  const txs = await getTransactions(child.id, 10);
                  setCoinTxList(txs);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  coinTxChild === child.id
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {child.emoji}
              </button>
            ))}
          </div>
          {coinTxList.length > 0 && (
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {coinTxList.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-500">
                    {tx.type === "task_complete" ? "완료" : tx.type === "task_uncomplete" ? "취소" : tx.type === "allclear_bonus" ? "올클보너스" : tx.type === "exchange" ? "교환" : "조정"}
                    {tx.reason ? ` · ${tx.reason}` : ""}
                  </span>
                  <span className={`font-bold ${tx.amount > 0 ? "text-green-500" : "text-red-400"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* === 보상 카탈로그 섹션 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">🎁 보상 카탈로그</h2>

        {/* 기존 보상 목록 */}
        {coinRewards.length > 0 ? (
          <div className="flex flex-col gap-2 mb-4">
            {coinRewards.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2"
              >
                <span className="text-sm min-w-0 flex-1 truncate">
                  {r.emoji} {r.name}
                  <span className="text-amber-500 ml-2">🍪 {r.cost}</span>
                  {!r.active && <span className="text-red-400 ml-1">(비활성)</span>}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={async () => {
                      await supabase
                        .from("coin_rewards")
                        .update({ active: !r.active })
                        .eq("id", r.id);
                      invalidateRewardsCache();
                      loadCoinData();
                      showToast(r.active ? "비활성화됨" : "활성화됨");
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      r.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
                    }`}
                  >
                    {r.active ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.from("coin_rewards").delete().eq("id", r.id);
                      invalidateRewardsCache();
                      loadCoinData();
                      showToast("보상 삭제됨");
                    }}
                    className="text-gray-400 hover:text-red-500 text-lg"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400 mb-4">등록된 보상이 없습니다</div>
        )}

        {/* 보상 추가 */}
        <div className="relative">
          {showEmojiPicker && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
              onClick={() => setShowEmojiPicker(false)}>
              <div className="animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setNewRewardEmoji(emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  searchPlaceholder="이모지 검색..."
                  width={320}
                  height={380}
                />
              </div>
            </div>
          )}
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-12 shrink-0 border border-gray-200 rounded-xl px-2 py-2 text-xl text-center bg-white active:bg-gray-50"
            >
              {newRewardEmoji}
            </button>
            <input
              type="text"
              value={newRewardName}
              onChange={(e) => setNewRewardName(e.target.value)}
              placeholder="보상 이름"
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={newRewardCost}
              onChange={(e) => setNewRewardCost(e.target.value)}
              placeholder="가격"
              className="w-24 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={async () => {
                const cost = parseInt(newRewardCost);
                if (!newRewardName.trim() || !cost || cost <= 0) return;
                const { error } = await supabase.from("coin_rewards").insert({
                  name: newRewardName.trim(),
                  emoji: newRewardEmoji || "🎁",
                  cost,
                });
                if (error) {
                  showToast("추가 실패");
                  return;
                }
                invalidateRewardsCache();
                loadCoinData();
                setNewRewardName("");
                setNewRewardEmoji("🎁");
                setNewRewardCost("");
                showToast("보상 추가됨!");
              }}
              disabled={!newRewardName.trim() || !newRewardCost}
              className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80"
            >
              추가
            </button>
          </div>
        </div>
      </section>

      {/* === 단어장 보상 설정 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">📖 단어장 보상 설정</h2>
        {[
          { key: "basic_reward", label: "객관식 퀴즈 보상", def: 1 },
          { key: "advanced_reward", label: "주관식 퀴즈 보상", def: 1 },
          { key: "min_words", label: "퀴즈 최소 단어 수", def: 3 },
        ].map(({ key, label, def }) => (
          <div
            key={key}
            className="flex items-center justify-between py-2"
          >
            <span className="text-sm text-gray-600">{label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={
                  editingConfig[key] ??
                  String(vocabConfig[key] ?? def)
                }
                onChange={(e) =>
                  setEditingConfig((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                className="w-16 border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-center"
              />
              <button
                onClick={async () => {
                  const val = parseInt(
                    editingConfig[key] ??
                      String(vocabConfig[key] ?? def),
                  );
                  if (isNaN(val) || val < 0) return;
                  const ok = await saveVocabConfig(key, val);
                  if (ok) {
                    setVocabConfigState((prev) => ({
                      ...prev,
                      [key]: val,
                    }));
                    showToast(`${label} → ${val}`);
                  }
                }}
                className="text-sm bg-[#6c5ce7] text-white px-3 py-1.5 rounded-xl font-semibold"
              >
                저장
              </button>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
