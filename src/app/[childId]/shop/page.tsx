"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import {
  getBalance,
  getRewards,
  exchangeReward,
  getTransactions,
} from "@/lib/coins";
import { BottomNav } from "@/components/BottomNav";
import { RewardCard } from "@/components/RewardCard";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import type { CoinReward, CoinTransaction } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  task_complete: "할일 완료",
  task_uncomplete: "완료 취소",
  allclear_bonus: "올클리어 보너스",
  exchange: "교환",
  admin_adjust: "관리자 조정",
};

export default function ShopPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const { message: toastMsg, showToast } = useToast();

  const [flagsLoaded, setFlagsLoaded] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [rewards, setRewards] = useState<CoinReward[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [confirmReward, setConfirmReward] = useState<CoinReward | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [txPage, setTxPage] = useState(0);
  const TX_PER_PAGE = 10;

  useEffect(() => {
    loadFeatureFlags().then(() => setFlagsLoaded(true));
  }, []);

  const featureDisabled = flagsLoaded && !isFeatureEnabled(childId, "coins");

  useEffect(() => {
    if (featureDisabled) router.replace(`/${childId}`);
  }, [featureDisabled, childId, router]);

  useEffect(() => {
    if (!flagsLoaded || featureDisabled) return;
    Promise.all([
      getBalance(childId).then(setBalance),
      getRewards().then(setRewards),
      getTransactions(childId, 200).then(setTransactions),
    ]);
  }, [childId, flagsLoaded, featureDisabled]);

  if (!flagsLoaded || featureDisabled) return null;

  if (balance === null) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  async function handleExchange(reward: CoinReward) {
    setExchanging(true);
    const result = await exchangeReward(childId, reward);
    setExchanging(false);
    setConfirmReward(null);

    if (result.ok) {
      setBalance(result.newBalance ?? null);
      showToast(`${reward.emoji} ${reward.name} 교환 완료!`);
      getTransactions(childId, 200).then(setTransactions);
    } else {
      showToast("별사탕이 부족해요!");
    }
  }

  return (
    <div className="pt-2">
      {/* Header */}
      <div
        className="flex items-center justify-between py-4 sticky top-0 z-10"
        style={{ background: "var(--bg)" }}
      >
        <h1 className="text-xl font-bold md:text-2xl">🍬 별사탕</h1>
        <span />
      </div>

      {/* Balance */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-amber-500 mb-1">
          🍬 {balance}
        </div>
        <div className="text-sm text-gray-400">모은 별사탕</div>
      </div>

      {/* Rewards Grid */}
      {rewards.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 md:text-sm">
            🎁 보상 교환
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-3">
            {rewards.map((r) => (
              <RewardCard
                key={r.id}
                reward={r}
                balance={balance}
                onExchange={setConfirmReward}
              />
            ))}
          </div>
        </>
      )}

      {/* Transaction History */}
      <div className="mb-20">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 md:text-sm">
          📋 최근 내역
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-sm">
            아직 내역이 없어요
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {transactions
                .slice(txPage * TX_PER_PAGE, (txPage + 1) * TX_PER_PAGE)
                .map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-700">
                        {TYPE_LABELS[tx.type] ?? tx.type}
                      </div>
                      {tx.reason && (
                        <div className="text-xs text-gray-400">{tx.reason}</div>
                      )}
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        tx.amount > 0 ? "text-green-500" : "text-red-400"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount}
                    </div>
                  </div>
                ))}
            </div>

            {/* Pagination */}
            {transactions.length > TX_PER_PAGE && (
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setTxPage((p) => p - 1)}
                  disabled={txPage === 0}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 active:bg-gray-200 disabled:opacity-30 disabled:active:bg-gray-100"
                >
                  ← 이전
                </button>
                <span className="text-xs text-gray-400">
                  {txPage + 1} / {Math.ceil(transactions.length / TX_PER_PAGE)}
                </span>
                <button
                  onClick={() => setTxPage((p) => p + 1)}
                  disabled={(txPage + 1) * TX_PER_PAGE >= transactions.length}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 active:bg-gray-200 disabled:opacity-30 disabled:active:bg-gray-100"
                >
                  다음 →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Exchange Confirm Modal */}
      {confirmReward && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] animate-fade-in"
          onClick={() => !exchanging && setConfirmReward(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[280px] max-w-[85vw] text-center animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-3">{confirmReward.emoji}</div>
            <div className="text-lg font-bold mb-1">{confirmReward.name}</div>
            <div className="text-sm text-gray-500 mb-4">
              🍬 {confirmReward.cost}개 사용
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReward(null)}
                disabled={exchanging}
                className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-500 active:bg-gray-200"
              >
                아니요
              </button>
              <button
                onClick={() => handleExchange(confirmReward)}
                disabled={exchanging}
                className="flex-1 py-2.5 bg-amber-500 rounded-xl text-sm font-semibold text-white active:opacity-80"
              >
                {exchanging ? "교환 중..." : "교환할래요!"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />
    </div>
  );
}
