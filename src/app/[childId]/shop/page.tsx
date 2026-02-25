"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { isFeatureEnabled } from "@/lib/features";
import {
  getBalance,
  getRewards,
  exchangeReward,
  getTransactions,
} from "@/lib/coins";
import { BottomNav } from "@/components/BottomNav";
import { Loading } from "@/components/Loading";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PageHeader } from "@/components/PageHeader";
import { RewardCard } from "@/components/RewardCard";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import type { CoinReward } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  task_complete: "할일 완료",
  task_uncomplete: "완료 취소",
  allclear_bonus: "올클리어 보너스",
  exchange: "교환",
  admin_adjust: "관리자 조정",
  vocab_quiz: "단어 퀴즈",
  game: "게임",
};

export default function ShopPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const { message: toastMsg, showToast } = useToast();

  const [confirmReward, setConfirmReward] = useState<CoinReward | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [txPage, setTxPage] = useState(0);
  const TX_PER_PAGE = 10;
  const { allowed } = useFeatureGuard(childId, "coins");

  const { data: balance, mutate: mutateBalance } = useSWR(
    allowed ? `coin_balance:${childId}` : null,
    () => getBalance(childId),
  );
  const { data: rewards } = useSWR(
    allowed ? "coin_rewards" : null,
    getRewards,
  );
  const { data: transactions, mutate: mutateTransactions } = useSWR(
    allowed ? `coin_transactions:${childId}` : null,
    () => getTransactions(childId, 200),
  );

  if (!allowed) return null;

  if (balance === undefined) {
    return <Loading />;
  }

  async function handleExchange(reward: CoinReward) {
    setExchanging(true);
    const result = await exchangeReward(childId, reward);
    setExchanging(false);
    setConfirmReward(null);

    if (result.ok) {
      mutateBalance(result.newBalance ?? undefined, { revalidate: false });
      showToast(`${reward.emoji} ${reward.name} 교환 완료!`);
      mutateTransactions();
    } else {
      showToast("초코가 부족해요!");
    }
  }

  return (
    <div className="pt-2">
      {/* Header */}
      <PageHeader title="🍪 초코" />

      {/* Balance */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-amber-500 mb-1">
          🍪 {balance}
        </div>
        <div className="text-sm text-gray-400">모은 초코</div>
      </div>

      {/* Game Banner */}
      {isFeatureEnabled(childId, "game") && (
        <button
          onClick={() => router.push(`/${childId}/game`)}
          className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-2xl p-4 mb-6 flex items-center justify-between active:opacity-80"
        >
          <div className="text-left">
            <div className="font-bold text-base">🦖 공룡 달리기</div>
            <div className="text-xs opacity-80">1🍪로 한 판 플레이!</div>
          </div>
          <div className="text-2xl">▶</div>
        </button>
      )}

      {/* Rewards Grid */}
      {rewards && rewards.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 md:text-sm">
            🍪 초코샵
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

        {!transactions || transactions.length === 0 ? (
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
        <ConfirmModal
          title={confirmReward.name}
          emoji={confirmReward.emoji}
          subtitle={`🍪 ${confirmReward.cost}개 사용`}
          confirmLabel={exchanging ? "교환 중..." : "교환할래요!"}
          confirmColor="bg-amber-500"
          disabled={exchanging}
          onConfirm={() => handleExchange(confirmReward)}
          onCancel={() => setConfirmReward(null)}
        />
      )}

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />
    </div>
  );
}
