"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useUser } from "@/hooks/useUser";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { useThemeOverride } from "@/hooks/useThemeOverride";
import { useToast } from "@/hooks/useToast";
import { BottomNav } from "@/components/BottomNav";
import { Toast } from "@/components/Toast";
import { addTransaction, getBalance } from "@/lib/coins";
import {
  getPetCatalogs,
  getPetItemCatalogs,
  getPetState,
  getPetInventory,
  adoptPet,
  savePetState,
  addInventoryItem,
  useInventoryItem,
  calcLiveStats,
  calcHouseBonus,
  getLevelFromExp,
  getExpToNextLevel,
  getPetEmoji,
  getPetMood,
  LEVEL_EXP_THRESHOLDS,
} from "@/lib/pets";
import type { PetCatalog, PetItemCatalog, PetLiveStats } from "@/lib/types";

// ===== 스탯 바 =====
function StatBar({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base w-5">{icon}</span>
      <span className="text-xs text-gray-500 w-10">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
    </div>
  );
}

// ===== 펫 없을 때: 입양 화면 =====
function AdoptView({
  userId,
  catalogs,
  balance,
  onAdopted,
}: {
  userId: string;
  catalogs: PetCatalog[];
  balance: number;
  onAdopted: () => void;
}) {
  const [selected, setSelected] = useState<PetCatalog | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdopt = async () => {
    if (!selected || !nickname.trim()) return;
    if (balance < selected.cost) return;
    setLoading(true);

    const txResult = await addTransaction(
      userId,
      -selected.cost,
      "pet_buy",
      `${selected.emoji_baby} ${selected.name} 입양`,
      selected.id,
    );
    if (!txResult.ok) {
      setLoading(false);
      return;
    }

    const adoptResult = await adoptPet(userId, selected.id, nickname.trim());
    setLoading(false);
    if (adoptResult.ok) onAdopted();
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="text-center">
        <div className="text-4xl mb-2">🐾</div>
        <h2 className="text-xl font-bold text-gray-800">동물 친구를 입양해요!</h2>
        <p className="text-sm text-gray-500 mt-1">초코로 귀여운 동물을 키워보세요</p>
      </div>

      {/* 펫 선택 */}
      <div className="grid grid-cols-3 gap-3">
        {catalogs.map((cat) => {
          const canAfford = balance >= cat.cost;
          const isSelected = selected?.id === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => canAfford && setSelected(cat)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-105"
                  : canAfford
                  ? "border-gray-200 bg-white active:scale-95"
                  : "border-gray-100 bg-gray-50 opacity-50"
              }`}
            >
              <span className="text-3xl">{cat.emoji_baby}</span>
              <span className="text-xs font-semibold text-gray-700">{cat.name}</span>
              <span className="text-xs text-[var(--accent)] font-bold">🍪{cat.cost}</span>
            </button>
          );
        })}
      </div>

      {/* 이름 입력 */}
      {selected && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-2 font-medium">
            {selected.emoji_baby} {selected.name}의 이름을 지어주세요
          </p>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            placeholder="이름 입력..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={10}
          />
          {selected.description && (
            <p className="text-xs text-gray-400 mt-2">{selected.description}</p>
          )}
          <button
            onClick={handleAdopt}
            disabled={!nickname.trim() || loading || balance < selected.cost}
            className="mt-3 w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
          >
            {loading ? "입양 중..." : `🍪${selected.cost} 초코로 입양하기`}
          </button>
        </div>
      )}

      {balance === 0 && (
        <p className="text-center text-xs text-gray-400">초코가 없어요. 할일을 완료하면 초코를 받아요! 🍪</p>
      )}
    </div>
  );
}

// ===== 아이템 카드 =====
function ItemCard({
  item,
  qty,
  balance,
  onBuy,
  onUse,
}: {
  item: PetItemCatalog;
  qty: number;
  balance: number;
  onBuy: (item: PetItemCatalog) => void;
  onUse: (item: PetItemCatalog) => void;
}) {
  const isHouse = item.category === "house";
  const canAfford = balance >= item.cost;

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{item.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
          {item.description && (
            <p className="text-xs text-gray-400 leading-tight">{item.description}</p>
          )}
        </div>
        <span className="text-xs text-[var(--accent)] font-bold shrink-0">🍪{item.cost}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onBuy(item)}
          disabled={!canAfford}
          className="flex-1 py-1.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold disabled:opacity-40 active:scale-95 transition-all"
        >
          구매
        </button>
        {!isHouse && (
          <button
            onClick={() => onUse(item)}
            disabled={qty <= 0}
            className="flex-1 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold disabled:opacity-40 active:scale-95 transition-all"
          >
            사용 {qty > 0 ? `(${qty})` : ""}
          </button>
        )}
        {isHouse && qty > 0 && (
          <div className="flex-1 py-1.5 rounded-xl bg-green-50 text-green-600 text-xs font-bold text-center">
            보유중 ✓
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 메인 페이지 =====
export default function PetPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId, user } = useUser(params);
  useFeatureGuard(childId, "pet");
  const { override: themeOverride } = useThemeOverride(childId);
  const { message: toastMsg, showToast } = useToast();

  const [tab, setTab] = useState<"main" | "shop">("main");
  const [shopCategory, setShopCategory] = useState<"food" | "house" | "toy" | "care">("food");
  const [liveStats, setLiveStats] = useState<PetLiveStats | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adoptKey, setAdoptKey] = useState(0); // 입양 후 리페치 트리거
  const [showGuide, setShowGuide] = useState(false);

  // SWR 데이터
  const { data: balance = 0, mutate: mutateBalance } = useSWR(
    childId ? `coin_balance:${childId}` : null,
    () => getBalance(childId),
  );
  const { data: petState, mutate: mutatePetState } = useSWR(
    childId ? [`pet_state:${childId}`, adoptKey] : null,
    () => getPetState(childId),
  );
  const { data: catalogs = [] } = useSWR("pet_catalogs", getPetCatalogs);
  const { data: itemCatalogs = [] } = useSWR("pet_item_catalogs", getPetItemCatalogs);
  const { data: inventory = [], mutate: mutateInventory } = useSWR(
    childId ? `pet_inventory:${childId}` : null,
    () => getPetInventory(childId),
  );

  const catalog = catalogs.find((c) => c.id === petState?.catalog_id) ?? null;

  // house bonus 계산
  const houseBonus = calcHouseBonus(inventory, itemCatalogs);

  // 실시간 스탯 업데이트 (1분마다)
  useEffect(() => {
    if (!petState) { setLiveStats(null); return; }
    const update = () => setLiveStats(calcLiveStats(petState, houseBonus));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [petState, houseBonus]);

  // 인벤토리에서 아이템 수량 조회
  const getQty = (itemId: string) =>
    inventory.find((inv) => inv.item_id === itemId)?.quantity ?? 0;

  // 아이템 구매
  const handleBuy = useCallback(
    async (item: PetItemCatalog) => {
      if (balance < item.cost || actionLoading) return;
      setActionLoading(true);

      const txResult = await addTransaction(
        childId,
        -item.cost,
        "pet_item",
        `${item.emoji} ${item.name} 구매`,
        item.id,
      );
      if (!txResult.ok) {
        showToast("초코가 부족해요 🍪");
        setActionLoading(false);
        return;
      }

      const invResult = await addInventoryItem(childId, item.id, 1);
      if (!invResult.ok) {
        showToast("구매에 실패했어요");
        setActionLoading(false);
        return;
      }

      mutateBalance();
      mutateInventory();
      showToast(`${item.emoji} ${item.name} 구매 완료!`);
      setActionLoading(false);
    },
    [childId, balance, actionLoading, mutateBalance, mutateInventory, showToast],
  );

  // 아이템 사용
  const handleUse = useCallback(
    async (item: PetItemCatalog) => {
      if (!petState || getQty(item.id) <= 0 || actionLoading) return;
      setActionLoading(true);

      const useResult = await useInventoryItem(childId, item.id);
      if (!useResult.ok) {
        showToast("사용에 실패했어요");
        setActionLoading(false);
        return;
      }

      // 스탯 업데이트
      const currentStats = calcLiveStats(petState, houseBonus);
      const newHunger = Math.min(100, currentStats.hunger + item.hunger_effect);
      const newHappiness = Math.min(100, currentStats.happiness + item.happiness_effect);
      const newHealth = Math.min(100, currentStats.health + item.health_effect);
      const newExp = petState.exp + item.exp_effect;
      const newLevel = getLevelFromExp(newExp);

      const now = new Date().toISOString();
      const patch: Parameters<typeof savePetState>[1] = {
        hunger: newHunger,
        happiness: newHappiness,
        health: newHealth,
        exp: newExp,
        level: newLevel,
        ...(item.hunger_effect > 0 ? { last_fed_at: now } : {}),
        ...(item.happiness_effect > 0 ? { last_played_at: now } : {}),
        ...(item.health_effect > 0 ? { last_cared_at: now } : {}),
      };

      await savePetState(childId, patch);
      mutatePetState();
      mutateInventory();

      const wasLevelUp = newLevel > petState.level;
      showToast(wasLevelUp ? `🎉 레벨 업! Lv.${newLevel}` : `${item.emoji} 사용했어요!`);
      setActionLoading(false);
    },
    [childId, petState, inventory, houseBonus, actionLoading, mutatePetState, mutateInventory, showToast],
  );

  // 놀기 (아이템 없이도 가능, 쿨타임 30분)
  const handlePlay = useCallback(async () => {
    if (!petState || actionLoading) return;
    const lastPlayed = new Date(petState.last_played_at).getTime();
    const cooldown = 30 * 60 * 1000;
    if (Date.now() - lastPlayed < cooldown) {
      const remainMin = Math.ceil((cooldown - (Date.now() - lastPlayed)) / 60000);
      showToast(`${remainMin}분 후에 또 놀 수 있어요 🎾`);
      return;
    }

    setActionLoading(true);
    const currentStats = calcLiveStats(petState, houseBonus);
    const newHappiness = Math.min(100, currentStats.happiness + 15);
    const newExp = petState.exp + 8;
    const newLevel = getLevelFromExp(newExp);

    await savePetState(childId, {
      happiness: newHappiness,
      exp: newExp,
      level: newLevel,
      last_played_at: new Date().toISOString(),
    });

    mutatePetState();
    const wasLevelUp = newLevel > petState.level;
    showToast(wasLevelUp ? `🎉 레벨 업! Lv.${newLevel}` : "신나게 놀았어요! 🎾");
    setActionLoading(false);
  }, [childId, petState, houseBonus, actionLoading, mutatePetState, showToast]);

  if (!childId) return null;

  const themeClass = themeOverride
    ? `theme-${themeOverride}`
    : user
    ? `theme-${user.theme}`
    : "";

  const hasPet = !!petState;

  // 필터된 상점 아이템
  const shopItems = itemCatalogs.filter((i) => i.category === shopCategory);

  const expProgress = petState ? getExpToNextLevel(petState.exp) : null;

  return (
    <div className={`min-h-screen bg-gray-50 pb-24 ${themeClass}`}>
      <div className="max-w-[480px] mx-auto">

        {/* 설명서 모달 */}
        {showGuide && (
          <div
            className="fixed inset-0 bg-black/50 z-[999] flex items-end justify-center animate-fade-in"
            onClick={() => setShowGuide(false)}
          >
            <div
              className="bg-white rounded-t-3xl w-full max-w-[480px] max-h-[80vh] overflow-y-auto pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">🐾 동물 키우기 설명서</h2>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-gray-400 text-xl font-bold px-2"
                >
                  ✕
                </button>
              </div>

              <div className="px-5 py-4 flex flex-col gap-5 text-sm text-gray-700">

                {/* 입양 */}
                <section>
                  <h3 className="font-bold text-gray-800 mb-2">🏠 동물 입양하기</h3>
                  <p className="leading-relaxed text-gray-500">
                    초코를 내고 원하는 동물을 입양해요. 이름을 직접 지어줄 수 있어요!
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                    {[
                      { e: "🐶", n: "강아지", c: 50 },
                      { e: "🐱", n: "고양이", c: 50 },
                      { e: "🐹", n: "햄스터", c: 30 },
                      { e: "🐰", n: "토끼", c: 40 },
                      { e: "🐣", n: "병아리", c: 35 },
                      { e: "🐟", n: "물고기", c: 20 },
                    ].map((p) => (
                      <div key={p.n} className="bg-gray-50 rounded-xl py-2">
                        <div className="text-2xl">{p.e}</div>
                        <div className="font-semibold">{p.n}</div>
                        <div className="text-[var(--accent)] font-bold">🍪{p.c}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 스탯 */}
                <section>
                  <h3 className="font-bold text-gray-800 mb-2">📊 스탯 (0~100)</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2 bg-orange-50 rounded-xl p-3">
                      <span className="text-xl">🍖</span>
                      <div>
                        <p className="font-semibold">배고픔</p>
                        <p className="text-xs text-gray-500">4시간마다 -10씩 줄어요. 0이 되면 건강이 나빠져요!</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-pink-50 rounded-xl p-3">
                      <span className="text-xl">😊</span>
                      <div>
                        <p className="font-semibold">행복도</p>
                        <p className="text-xs text-gray-500">6시간마다 -8씩 줄어요. 놀아주거나 장난감을 주면 올라가요.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-green-50 rounded-xl p-3">
                      <span className="text-xl">❤️</span>
                      <div>
                        <p className="font-semibold">건강</p>
                        <p className="text-xs text-gray-500">배고픔이 20 이하면 서서히 줄어요. 케어 아이템으로 회복해요.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 상호작용 */}
                <section>
                  <h3 className="font-bold text-gray-800 mb-2">🎮 상호작용</h3>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                      <span className="text-base">🍖</span>
                      <span><b>먹이 주기</b> — 인벤토리의 먹이를 선택해서 줘요</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                      <span className="text-base">🎾</span>
                      <span><b>같이 놀기</b> — 아이템 없이도 가능! 쿨타임 30분</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                      <span className="text-base">🪮</span>
                      <span><b>케어</b> — 브러시·목욕으로 건강과 행복도 회복</span>
                    </div>
                  </div>
                </section>

                {/* 상점 */}
                <section>
                  <h3 className="font-bold text-gray-800 mb-2">🛒 상점 아이템</h3>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="bg-orange-50 rounded-xl p-3">
                      <p className="font-semibold mb-1">🍖 먹이 (소모품)</p>
                      <p className="text-gray-500">사료 5🍪 · 간식 3🍪 · 특별간식 10🍪</p>
                      <p className="text-gray-400 mt-0.5">구매하면 인벤토리에 저장돼요</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="font-semibold mb-1">🏠 집 (영구 효과)</p>
                      <p className="text-gray-500">아늑한 집 30🍪 (+10 행복) · 멋진 집 80🍪 (+20 행복)</p>
                      <p className="text-gray-400 mt-0.5">보유하면 행복도가 항상 높게 유지돼요!</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-3">
                      <p className="font-semibold mb-1">🎾 장난감 (소모품)</p>
                      <p className="text-gray-500">공 8🍪 · 인형 12🍪 · 터널 15🍪</p>
                      <p className="text-gray-400 mt-0.5">사용하면 행복도 + 경험치가 올라가요</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="font-semibold mb-1">🪮 케어 (소모품)</p>
                      <p className="text-gray-500">브러시 8🍪 · 목욕세트 5🍪</p>
                      <p className="text-gray-400 mt-0.5">건강과 행복도를 회복해줘요</p>
                    </div>
                  </div>
                </section>

                {/* 레벨 */}
                <section>
                  <h3 className="font-bold text-gray-800 mb-2">⭐ 레벨 성장</h3>
                  <p className="text-gray-500 text-xs mb-2">먹이 주기·놀기·케어를 할 때마다 경험치가 쌓여요!</p>
                  <div className="flex flex-col gap-1.5 text-xs">
                    {[
                      { lv: 1, emoji: "아기", exp: "0~49", tip: "🐶 아기 모습" },
                      { lv: 2, emoji: "아기", exp: "50~149", tip: "✨ 조금 더 성장" },
                      { lv: 3, emoji: "청소년", exp: "150~299", tip: "🐕 청소년 모습으로 변해요" },
                      { lv: 4, emoji: "어른", exp: "300~499", tip: "💪 다 컸어요!" },
                      { lv: 5, emoji: "어른", exp: "500+", tip: "👑 최대 레벨 달성!" },
                    ].map((row) => (
                      <div key={row.lv} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                        <span className="font-bold text-[var(--accent)] w-10">Lv.{row.lv}</span>
                        <span className="text-gray-400 w-14">{row.exp}</span>
                        <span className="text-gray-600">{row.tip}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <p className="text-center text-xs text-gray-400 pb-2">꾸준히 돌봐주면 건강하게 자라요 💕</p>
              </div>
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div className="px-4 pt-6 pb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">🐾 동물친구</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(true)}
              className="text-gray-400 text-sm font-bold w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
            >
              ?
            </button>
            {hasPet && (
              <span className="text-sm text-gray-500">
                잔액 <span className="text-[var(--accent)] font-bold">🍪{balance}</span>
              </span>
            )}
          </div>
        </div>

        {/* 펫 없을 때 */}
        {!hasPet && (
          <AdoptView
            userId={childId}
            catalogs={catalogs}
            balance={balance}
            onAdopted={() => {
              setAdoptKey((k) => k + 1);
              mutateBalance();
            }}
          />
        )}

        {/* 펫 있을 때 */}
        {hasPet && catalog && liveStats && (
          <>
            {/* 탭 */}
            <div className="px-4 mb-3 flex gap-2">
              {(["main", "shop"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    tab === t
                      ? "bg-[var(--accent)] text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  {t === "main" ? "🐾 내 동물" : "🛒 상점"}
                </button>
              ))}
            </div>

            {/* 메인 탭 */}
            {tab === "main" && (
              <div className="px-4 flex flex-col gap-4">
                {/* 펫 카드 */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-center">
                  <div className="text-7xl mb-2 animate-bounce-slow">
                    {getPetEmoji(catalog, petState.level)}
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-lg font-bold text-gray-800">{petState.nickname}</span>
                    <span className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full font-bold">
                      Lv.{petState.level}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{getPetMood(liveStats)}</p>

                  {/* 스탯 */}
                  <div className="flex flex-col gap-2.5">
                    <StatBar
                      label="배고픔"
                      value={liveStats.hunger}
                      icon="🍖"
                      color={liveStats.hunger > 50 ? "bg-orange-400" : liveStats.hunger > 20 ? "bg-yellow-400" : "bg-red-400"}
                    />
                    <StatBar
                      label="행복도"
                      value={liveStats.happiness}
                      icon="😊"
                      color={liveStats.happiness > 50 ? "bg-pink-400" : liveStats.happiness > 20 ? "bg-yellow-400" : "bg-red-400"}
                    />
                    <StatBar
                      label="건강"
                      value={liveStats.health}
                      icon="❤️"
                      color={liveStats.health > 50 ? "bg-green-400" : liveStats.health > 20 ? "bg-yellow-400" : "bg-red-400"}
                    />
                  </div>

                  {/* 경험치 */}
                  {expProgress && (
                    <div className="mt-3 flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>경험치</span>
                        <span>
                          {expProgress.current}/{expProgress.needed} → Lv.{petState.level + 1}
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                          style={{ width: `${(expProgress.current / expProgress.needed) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {!expProgress && petState.level >= 5 && (
                    <p className="mt-2 text-xs text-[var(--accent)] font-bold">✨ 최대 레벨!</p>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 mb-3 font-medium">인벤토리로 상호작용</p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* 먹이 — 인벤토리에서 첫 번째 food 아이템 사용 */}
                    {itemCatalogs.filter((i) => i.category === "food").map((item) => {
                      const qty = getQty(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleUse(item)}
                          disabled={qty <= 0 || actionLoading}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-100 disabled:opacity-40 active:scale-95 transition-all"
                        >
                          <span className="text-xl">{item.emoji}</span>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-gray-700">{item.name}</span>
                            <span className="text-xs text-gray-400">{qty > 0 ? `${qty}개 보유` : "없음"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 놀기 버튼 */}
                  <button
                    onClick={handlePlay}
                    disabled={actionLoading}
                    className="mt-2 w-full py-2.5 rounded-xl bg-pink-50 border border-pink-100 text-sm font-bold text-pink-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>🎾</span>
                    <span>같이 놀기 (+15 행복, 쿨타임 30분)</span>
                  </button>
                </div>

                {/* 인벤토리 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm font-bold text-gray-700 mb-3">🎒 인벤토리</p>
                  {inventory.filter((inv) => inv.quantity > 0).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">아이템이 없어요. 상점에서 구매해보세요!</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {inventory
                        .filter((inv) => inv.quantity > 0)
                        .map((inv) => {
                          const item = itemCatalogs.find((i) => i.id === inv.item_id);
                          if (!item) return null;
                          return (
                            <div
                              key={inv.id}
                              className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-2.5 py-1.5"
                            >
                              <span className="text-base">{item.emoji}</span>
                              <span className="text-xs font-medium text-gray-700">{item.name}</span>
                              <span className="text-xs font-bold text-[var(--accent)]">×{inv.quantity}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 상점 탭 */}
            {tab === "shop" && (
              <div className="px-4 flex flex-col gap-4">
                {/* 잔액 */}
                <div className="bg-[var(--accent)]/10 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">내 초코</span>
                  <span className="text-lg font-bold text-[var(--accent)]">🍪 {balance}</span>
                </div>

                {/* 카테고리 탭 */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {(
                    [
                      { key: "food", label: "먹이", icon: "🍖" },
                      { key: "house", label: "집", icon: "🏠" },
                      { key: "toy", label: "장난감", icon: "🎾" },
                      { key: "care", label: "케어", icon: "🪮" },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setShopCategory(cat.key)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                        shopCategory === cat.key
                          ? "bg-[var(--accent)] text-white"
                          : "bg-white text-gray-500 border border-gray-200"
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>

                {/* 아이템 목록 */}
                <div className="grid grid-cols-1 gap-3">
                  {shopItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      qty={getQty(item.id)}
                      balance={balance}
                      onBuy={handleBuy}
                      onUse={handleUse}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />
    </div>
  );
}
