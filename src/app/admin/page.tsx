"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { USERS, PIN } from "@/lib/constants";
import { todayKST } from "@/lib/date";
import {
  ALL_FEATURES,
  getFeatureState,
  setFeatureFlag,
  loadFeatureFlags,
  type FeatureKey,
} from "@/lib/features";

import { PinModal } from "@/components/PinModal";
import { SupervisorFAB } from "@/components/SupervisorFAB";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import {
  getBalance,
  addTransaction,
  getTransactions,
  invalidateRewardsCache,
} from "@/lib/coins";
import {
  getVocabConfig,
  setVocabConfig as saveVocabConfig,
  invalidateDictionary,
  loadDictionary,
  createList,
} from "@/lib/vocab";
import type { DictionaryEntry } from "@/lib/types";
import type { CoinReward, CoinTransaction } from "@/lib/types";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

const ADMIN_SESSION_KEY = "mungchi_admin";

interface TemplateTask {
  title: string;
  forChildren: string[];
}

interface CustomTemplate {
  id: string;
  name: string;
  tasks: TemplateTask[];
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { message, showToast } = useToast();

  // 인증 상태
  const [authed, setAuthed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 벌크 추가
  const [selectedChildren, setSelectedChildren] = useState<string[]>([
    "sihyun",
    "misong",
  ]);
  const [selectedDates, setSelectedDates] = useState<string[]>([todayKST()]);
  const [dateInput, setDateInput] = useState(todayKST());
  const [taskText, setTaskText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 커스텀 템플릿
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 템플릿 수정 모달
  const [editTemplate, setEditTemplate] = useState<CustomTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editTasks, setEditTasks] = useState("");

  // 피쳐플래그
  const [flagsLoaded, setFlagsLoaded] = useState(false);
  const [, setFlagTick] = useState(0);

  const reloadFlags = useCallback(async () => {
    await loadFeatureFlags();
    setFlagTick((t) => t + 1);
  }, []);

  const toggleDbFlag = useCallback(
    async (childId: string, feature: FeatureKey) => {
      const state = getFeatureState(childId, feature);
      const ok = await setFeatureFlag(childId, feature, !state.db);
      if (ok) {
        setFlagTick((t) => t + 1);
        showToast("피쳐플래그 변경됨");
      } else {
        showToast("변경 실패");
      }
    },
    [showToast]
  );

  // 별사탕 관리
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
  const [vocabConfig, setVocabConfigState] = useState<Record<string, number>>(
    {},
  );
  const [editingConfig, setEditingConfig] = useState<Record<string, string>>(
    {},
  );

  // 사전 관리
  const [dictWord, setDictWord] = useState("");
  const [dictMeaning, setDictMeaning] = useState("");
  const [dictLevel, setDictLevel] = useState(1);
  const [dictBulk, setDictBulk] = useState("");

  // 랜덤 단어장
  const [randomChildIds, setRandomChildIds] = useState<string[]>(["sihyun", "misong"]);
  const [randomCount, setRandomCount] = useState("10");
  const [randomTitle, setRandomTitle] = useState("");
  const [randomLevel, setRandomLevel] = useState<string>("all");
  const [randomGenerating, setRandomGenerating] = useState(false);
  const [randomPreview, setRandomPreview] = useState<DictionaryEntry[]>([]);

  // 날짜 복제
  const [cloneChildId, setCloneChildId] = useState("sihyun");
  const [cloneSourceDate, setCloneSourceDate] = useState(todayKST());
  const [cloneTargetDates, setCloneTargetDates] = useState<string[]>([]);
  const [cloneTargetInput, setCloneTargetInput] = useState("");
  const [clonePreview, setClonePreview] = useState<string[]>([]);
  const [cloneLoading, setCloneLoading] = useState(false);

  // 세션 확인
  useEffect(() => {
    const session = localStorage.getItem(ADMIN_SESSION_KEY);
    if (session === "true") {
      setAuthed(true);
      sessionStorage.setItem("mungchi_supervisor", "true");
    }
    setLoaded(true);
  }, []);

  // 커스텀 템플릿 로드
  const loadTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from("task_templates")
      .select("*")
      .order("created_at");
    if (!error && data) setCustomTemplates(data as CustomTemplate[]);
  }, []);

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
    if (authed) {
      loadTemplates();
      reloadFlags().then(() => setFlagsLoaded(true));
      loadCoinData();
      getVocabConfig().then(setVocabConfigState);
    }
  }, [authed, loadTemplates, reloadFlags, loadCoinData]);

  // PIN 성공
  const handlePinSuccess = useCallback(() => {
    localStorage.setItem(ADMIN_SESSION_KEY, "true");
    sessionStorage.setItem("mungchi_supervisor", "true");
    setAuthed(true);
  }, []);

  // --- 벌크 추가 ---
  const toggleChild = useCallback((childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId)
        ? prev.filter((c) => c !== childId)
        : [...prev, childId]
    );
  }, []);

  const addDate = useCallback(() => {
    if (dateInput && !selectedDates.includes(dateInput)) {
      setSelectedDates((prev) => [...prev, dateInput].sort());
    }
  }, [dateInput, selectedDates]);

  const removeDate = useCallback((date: string) => {
    setSelectedDates((prev) => prev.filter((d) => d !== date));
  }, []);

  const lines = taskText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const totalCount = selectedChildren.length * selectedDates.length * lines.length;

  const handleBulkAdd = useCallback(async () => {
    if (totalCount === 0) return;
    setSubmitting(true);
    try {
      const rows = selectedChildren.flatMap((childId) =>
        selectedDates.flatMap((date) =>
          lines.map((title) => ({
            user_id: childId,
            title,
            date,
            priority: 0,
          }))
        )
      );
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;

      const childNames = selectedChildren
        .map((id) => USERS.find((c) => c.id === id)?.name)
        .join(", ");
      showToast(`${childNames}에게 ${rows.length}개 할일 추가 완료!`);
      setTaskText("");
    } catch {
      showToast("추가 실패. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }, [totalCount, selectedChildren, selectedDates, lines, showToast]);

  // --- 템플릿 적용 ---
  const applyTemplate = useCallback(
    (tasks: TemplateTask[]) => {
      // 선택된 아이에 맞는 할일만 필터링하여 textarea에 입력
      const titles = tasks
        .filter((t) =>
          t.forChildren.some((c) => selectedChildren.includes(c))
        )
        .map((t) => t.title);
      const unique = [...new Set(titles)];
      setTaskText(unique.join("\n"));
    },
    [selectedChildren]
  );

  // --- 커스텀 템플릿 저장 ---
  const saveTemplate = useCallback(async () => {
    if (!templateName.trim() || lines.length === 0) return;
    const tasks: TemplateTask[] = lines.map((title) => ({
      title,
      forChildren: [...selectedChildren],
    }));
    const { error } = await supabase
      .from("task_templates")
      .insert({ name: templateName.trim(), tasks });
    if (error) {
      showToast("저장 실패");
      return;
    }
    showToast(`"${templateName.trim()}" 템플릿 저장!`);
    setTemplateName("");
    loadTemplates();
  }, [templateName, lines, selectedChildren, showToast, loadTemplates]);

  const deleteTemplate = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("task_templates").delete().eq("id", id);
      setConfirmDeleteId(null);
      if (error) {
        showToast("삭제 실패");
        return;
      }
      showToast("템플릿 삭제됨");
      loadTemplates();
    },
    [showToast, loadTemplates]
  );

  // --- 템플릿 수정 ---
  const openEditModal = useCallback((tmpl: CustomTemplate) => {
    setEditTemplate(tmpl);
    setEditName(tmpl.name);
    setEditTasks(tmpl.tasks.map((t) => t.title).join("\n"));
  }, []);

  const updateTemplate = useCallback(async () => {
    if (!editTemplate || !editName.trim()) return;
    const editLines = editTasks
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (editLines.length === 0) return;
    const tasks: TemplateTask[] = editLines.map((title) => ({
      title,
      forChildren: [...selectedChildren],
    }));
    const { error } = await supabase
      .from("task_templates")
      .update({ name: editName.trim(), tasks })
      .eq("id", editTemplate.id);
    if (error) {
      showToast("수정 실패");
      return;
    }
    showToast(`"${editName.trim()}" 템플릿 수정 완료!`);
    setEditTemplate(null);
    loadTemplates();
  }, [editTemplate, editName, editTasks, selectedChildren, showToast, loadTemplates]);

  // --- 날짜 복제 ---
  const loadClonePreview = useCallback(async () => {
    setCloneLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("title")
      .eq("user_id", cloneChildId)
      .eq("date", cloneSourceDate)
      .order("priority", { ascending: false })
      .order("created_at");
    setClonePreview(data?.map((t) => t.title) ?? []);
    setCloneLoading(false);
  }, [cloneChildId, cloneSourceDate]);

  useEffect(() => {
    if (authed) loadClonePreview();
  }, [authed, cloneChildId, cloneSourceDate, loadClonePreview]);

  const addCloneTarget = useCallback(() => {
    if (cloneTargetInput && !cloneTargetDates.includes(cloneTargetInput)) {
      setCloneTargetDates((prev) => [...prev, cloneTargetInput].sort());
    }
  }, [cloneTargetInput, cloneTargetDates]);

  const removeCloneTarget = useCallback((date: string) => {
    setCloneTargetDates((prev) => prev.filter((d) => d !== date));
  }, []);

  const handleClone = useCallback(async () => {
    if (clonePreview.length === 0 || cloneTargetDates.length === 0) return;
    setSubmitting(true);
    try {
      const { data: source } = await supabase
        .from("tasks")
        .select("title, priority")
        .eq("user_id", cloneChildId)
        .eq("date", cloneSourceDate);
      if (!source || source.length === 0) {
        showToast("복제할 할일이 없습니다");
        return;
      }
      const copies = cloneTargetDates.flatMap((date) =>
        source.map((t) => ({
          user_id: cloneChildId,
          title: t.title,
          date,
          priority: t.priority,
        }))
      );
      const { error } = await supabase.from("tasks").insert(copies);
      if (error) throw error;

      const childName = USERS.find((c) => c.id === cloneChildId)?.name;
      showToast(
        `${childName}: ${cloneTargetDates.length}일 × ${source.length}개 = ${copies.length}개 복제 완료!`
      );
      setCloneTargetDates([]);
    } catch {
      showToast("복제 실패. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }, [
    clonePreview,
    cloneTargetDates,
    cloneChildId,
    cloneSourceDate,
    showToast,
  ]);

  // 로딩
  if (!loaded) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  // PIN 인증
  if (!authed) {
    return (
      <PinModal
        title="관리자"
        subtitle="비밀번호를 입력하세요"
        emoji="🔒"
        onSuccess={handlePinSuccess}
        onCancel={() => router.push("/")}
      />
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 pt-6 pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🔧 관리</h1>
        <button
          className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg active:bg-gray-200"
          onClick={() => router.push("/")}
        >
          홈으로
        </button>
      </div>

      {/* === 피쳐플래그 섹션 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">🚩 피쳐플래그</h2>
        {!flagsLoaded ? (
          <div className="text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {USERS.map((child) => (
              <div key={child.id} className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600 w-16 shrink-0">
                  {child.emoji} {child.name}
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {ALL_FEATURES.map((feat) => {
                    const state = getFeatureState(child.id, feat.key);
                    return (
                      <button
                        key={feat.key}
                        onClick={() => toggleDbFlag(child.id, feat.key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          state.db
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {feat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === 별사탕 관리 섹션 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">🍬 별사탕 관리</h2>

        {/* 잔액 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">잔액</label>
          {USERS.map((child) => (
            <div key={child.id} className="flex items-center justify-between py-2">
              <span className="text-sm">{child.emoji} {child.name}</span>
              <span className="font-bold text-amber-600">🍬 {coinBalances[child.id] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* 수동 조정 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">수동 조정</label>
          <div className="flex gap-2 mb-2">
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
              className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="사유"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
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
                  showToast(`별사탕 ${amt > 0 ? "+" : ""}${amt} 완료`);
                  setAdjustAmount("");
                  setAdjustReason("");
                } else {
                  showToast("조정 실패");
                }
              }}
              disabled={!adjustAmount || isNaN(parseInt(adjustAmount))}
              className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80"
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
                <span className="text-sm">
                  {r.emoji} {r.name}
                  <span className="text-amber-500 ml-2">🍬 {r.cost}</span>
                  {!r.active && <span className="text-red-400 ml-1">(비활성)</span>}
                </span>
                <div className="flex gap-1">
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
        <div className="flex gap-2 relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-12 border border-gray-200 rounded-xl px-2 py-2 text-xl text-center bg-white active:bg-gray-50"
          >
            {newRewardEmoji}
          </button>
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
          <input
            type="text"
            value={newRewardName}
            onChange={(e) => setNewRewardName(e.target.value)}
            placeholder="보상 이름"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={newRewardCost}
            onChange={(e) => setNewRewardCost(e.target.value)}
            placeholder="가격"
            className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm"
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
            className="bg-amber-500 text-white px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80"
          >
            +
          </button>
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

      {/* === 사전 관리 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">📚 사전 관리</h2>

        {/* 단건 추가 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            단어 추가
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={dictWord}
              onChange={(e) => setDictWord(e.target.value)}
              placeholder="English word"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={dictMeaning}
              onChange={(e) => setDictMeaning(e.target.value)}
              placeholder="한글 뜻"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <select
              value={dictLevel}
              onChange={(e) => setDictLevel(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-2 py-2 text-sm"
            >
              <option value={1}>쉬움</option>
              <option value={2}>보통</option>
              <option value={3}>어려움</option>
            </select>
            <button
              onClick={async () => {
                if (!dictWord.trim() || !dictMeaning.trim()) return;
                const { error } = await supabase
                  .from("dictionary")
                  .upsert(
                    {
                      word: dictWord.trim().toLowerCase(),
                      meaning: dictMeaning.trim(),
                      level: dictLevel,
                    },
                    { onConflict: "word" },
                  );
                if (error) {
                  showToast("추가 실패");
                  return;
                }
                await invalidateDictionary();
                showToast(`"${dictWord.trim()}" 추가됨!`);
                setDictWord("");
                setDictMeaning("");
              }}
              disabled={!dictWord.trim() || !dictMeaning.trim()}
              className="bg-[#6c5ce7] text-white px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {/* 벌크 추가 */}
        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            벌크 추가 (한 줄에: 영어단어[Tab]한글뜻)
          </label>
          <textarea
            value={dictBulk}
            onChange={(e) => setDictBulk(e.target.value)}
            placeholder={"apple\t사과\nbook\t책\ncat\t고양이"}
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none mb-2"
          />
          <button
            onClick={async () => {
              const bulkLines = dictBulk
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
              const rows = bulkLines
                .map((line) => {
                  const [word, meaning] = line.split("\t");
                  return word && meaning
                    ? {
                        word: word.trim().toLowerCase(),
                        meaning: meaning.trim(),
                        level: 1,
                      }
                    : null;
                })
                .filter(
                  (r): r is { word: string; meaning: string; level: number } =>
                    r !== null,
                );
              if (rows.length === 0) return;
              const { error } = await supabase
                .from("dictionary")
                .upsert(rows, { onConflict: "word" });
              if (error) {
                showToast("벌크 추가 실패");
                return;
              }
              invalidateDictionary();
              showToast(`${rows.length}개 단어 추가됨!`);
              setDictBulk("");
            }}
            disabled={!dictBulk.trim()}
            className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-base disabled:opacity-40"
          >
            벌크 추가
          </button>
        </div>
      </section>

      {/* === 랜덤 단어장 생성 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">🎲 랜덤 단어장 생성</h2>

        {/* 대상 아이 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">대상 아이</label>
          <div className="flex gap-3">
            {USERS.map((child) => (
              <button
                key={child.id}
                onClick={() =>
                  setRandomChildIds((prev) =>
                    prev.includes(child.id)
                      ? prev.filter((c) => c !== child.id)
                      : [...prev, child.id],
                  )
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  randomChildIds.includes(child.id)
                    ? "bg-[#6c5ce7] text-white shadow-md"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <span>{child.emoji}</span>
                <span>{child.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 단어장 이름 + 단어 수 + 레벨 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-1">단어장 이름</label>
          <input
            type="text"
            value={randomTitle}
            onChange={(e) => setRandomTitle(e.target.value)}
            placeholder="예: 동물 단어, 3월 1주차"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 mb-4">
          <div className="w-24">
            <label className="text-sm font-semibold text-gray-600 block mb-1">단어 수</label>
            <input
              type="number"
              value={randomCount}
              onChange={(e) => setRandomCount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center"
            />
          </div>
          <div className="w-24">
            <label className="text-sm font-semibold text-gray-600 block mb-1">난이도</label>
            <select
              value={randomLevel}
              onChange={(e) => setRandomLevel(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm"
            >
              <option value="all">전체</option>
              <option value="1">쉬움</option>
              <option value="2">보통</option>
              <option value="3">어려움</option>
            </select>
          </div>
        </div>

        {/* 미리보기 */}
        {randomPreview.length > 0 && (
          <div className="mb-4 bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">{randomPreview.length}개 단어 미리보기:</div>
            <div className="flex flex-col gap-1">
              {randomPreview.map((entry) => (
                <div key={entry.id} className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700">{entry.word}</span>
                  <span className="text-gray-500">{entry.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const count = parseInt(randomCount);
              if (!count || count <= 0) return;
              const dict = await loadDictionary();
              let pool = dict;
              if (randomLevel !== "all") {
                pool = dict.filter((e) => e.level === parseInt(randomLevel));
              }
              const shuffled = [...pool].sort(() => Math.random() - 0.5);
              setRandomPreview(shuffled.slice(0, count));
            }}
            disabled={!randomCount || parseInt(randomCount) <= 0}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm active:bg-gray-200 disabled:opacity-40"
          >
            미리보기
          </button>
          <button
            onClick={async () => {
              const count = parseInt(randomCount);
              const listName = randomTitle.trim();
              if (!count || count <= 0 || randomChildIds.length === 0 || !listName) return;
              setRandomGenerating(true);
              try {
                const dict = await loadDictionary();
                let pool = dict;
                if (randomLevel !== "all") {
                  pool = dict.filter((e) => e.level === parseInt(randomLevel));
                }

                let created = 0;
                for (const childId of randomChildIds) {
                  const { ok, listId } = await createList(childId, listName);
                  if (!ok || !listId) continue;

                  const shuffled = [...pool].sort(() => Math.random() - 0.5);
                  const selected = shuffled.slice(0, count);
                  if (selected.length === 0) continue;

                  const rows = selected.map((e) => ({
                    user_id: childId,
                    list_id: listId,
                    dictionary_id: e.id,
                    word: e.word,
                    meaning: e.meaning,
                  }));
                  const { error } = await supabase.from("vocab_entries").insert(rows);
                  if (error) throw error;
                  created += selected.length;
                }

                const names = randomChildIds
                  .map((id) => USERS.find((u) => u.id === id)?.name)
                  .join(", ");
                showToast(`${names}에게 ${created}개 랜덤 단어 추가!`);
                setRandomPreview([]);
              } catch {
                showToast("생성 실패");
              } finally {
                setRandomGenerating(false);
              }
            }}
            disabled={randomChildIds.length === 0 || !randomCount || parseInt(randomCount) <= 0 || !randomTitle.trim() || randomGenerating}
            className="flex-1 bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40 active:opacity-80"
          >
            {randomGenerating ? "생성 중..." : "단어장 생성"}
          </button>
        </div>
      </section>

      {/* === 벌크 추가 섹션 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">📝 벌크 추가</h2>

        {/* 대상 아이 선택 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            대상 아이
          </label>
          <div className="flex gap-3">
            {USERS.map((child) => (
              <button
                key={child.id}
                onClick={() => toggleChild(child.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedChildren.includes(child.id)
                    ? "bg-[#6c5ce7] text-white shadow-md"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <span>{child.emoji}</span>
                <span>{child.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 날짜 선택 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            날짜
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={addDate}
              className="bg-[#6c5ce7] text-white px-4 py-2 rounded-xl text-sm font-semibold active:opacity-80"
            >
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date) => (
              <span
                key={date}
                className="inline-flex items-center gap-1 bg-purple-50 text-[#6c5ce7] px-3 py-1 rounded-lg text-sm font-medium"
              >
                {date}
                <button
                  onClick={() => removeDate(date)}
                  className="text-purple-300 hover:text-purple-600 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 할일 입력 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            할일 (줄바꿈으로 구분)
          </label>
          <textarea
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder={"🪥 아침 양치하기\n📚 리딩게이트\n🏃 운동하기"}
            rows={6}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#6c5ce7] transition-colors"
          />
          {lines.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              {lines.length}개 항목 입력됨
            </div>
          )}
        </div>

        {/* 추가 버튼 */}
        <button
          onClick={handleBulkAdd}
          disabled={totalCount === 0 || submitting}
          className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-base disabled:opacity-40 active:opacity-80 transition-opacity"
        >
          {submitting
            ? "추가 중..."
            : totalCount > 0
              ? `${totalCount}개 할일 추가`
              : "할일을 입력하세요"}
        </button>
      </section>

      {/* === 템플릿 섹션 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">📋 템플릿</h2>

        <div className="mb-4">
          {customTemplates.length > 0 ? (
            <div className="flex flex-col gap-2 mb-3">
              {customTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2"
                >
                  <button
                    onClick={() => applyTemplate(tmpl.tasks)}
                    className="text-sm font-medium flex-1 text-left active:opacity-70"
                  >
                    {tmpl.name}{" "}
                    <span className="text-gray-400">
                      ({tmpl.tasks.length}개)
                    </span>
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEditModal(tmpl)}
                      className="text-gray-400 hover:text-[#6c5ce7] text-base"
                    >
                      ✏️
                    </button>
                    {confirmDeleteId === tmpl.id ? (
                      <>
                        <button
                          onClick={() => deleteTemplate(tmpl.id)}
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg font-semibold active:opacity-80"
                        >
                          삭제
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-lg font-semibold active:opacity-80"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(tmpl.id)}
                        className="text-gray-400 hover:text-red-500 text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 mb-3">
              저장된 템플릿이 없습니다
            </div>
          )}

          {/* 현재 입력을 템플릿으로 저장 */}
          {lines.length > 0 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="템플릿 이름"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6c5ce7]"
              />
              <button
                onClick={saveTemplate}
                disabled={!templateName.trim()}
                className="bg-[#6c5ce7] text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80"
              >
                저장
              </button>
            </div>
          )}
        </div>
      </section>

      {/* === 날짜 복제 섹션 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">📅 날짜 복제</h2>

        {/* 대상 아이 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            대상 아이
          </label>
          <div className="flex gap-3">
            {USERS.map((child) => (
              <button
                key={child.id}
                onClick={() => setCloneChildId(child.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  cloneChildId === child.id
                    ? "bg-[#6c5ce7] text-white shadow-md"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <span>{child.emoji}</span>
                <span>{child.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 복제할 날짜 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            복제할 날짜
          </label>
          <input
            type="date"
            value={cloneSourceDate}
            onChange={(e) => setCloneSourceDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
          {/* 미리보기 */}
          <div className="mt-2 bg-gray-50 rounded-xl p-3">
            {cloneLoading ? (
              <div className="text-sm text-gray-400">불러오는 중...</div>
            ) : clonePreview.length > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="text-xs text-gray-500 mb-1">
                  {clonePreview.length}개 할일:
                </div>
                {clonePreview.map((title, i) => (
                  <div key={i} className="text-sm text-gray-700">
                    {title}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                해당 날짜에 할일이 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 붙여넣을 날짜 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            붙여넣을 날짜
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={cloneTargetInput}
              onChange={(e) => setCloneTargetInput(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={addCloneTarget}
              className="bg-[#6c5ce7] text-white px-4 py-2 rounded-xl text-sm font-semibold active:opacity-80"
            >
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {cloneTargetDates.map((date) => (
              <span
                key={date}
                className="inline-flex items-center gap-1 bg-purple-50 text-[#6c5ce7] px-3 py-1 rounded-lg text-sm font-medium"
              >
                {date}
                <button
                  onClick={() => removeCloneTarget(date)}
                  className="text-purple-300 hover:text-purple-600 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 복제 버튼 */}
        <button
          onClick={handleClone}
          disabled={
            clonePreview.length === 0 ||
            cloneTargetDates.length === 0 ||
            submitting
          }
          className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-base disabled:opacity-40 active:opacity-80 transition-opacity"
        >
          {submitting
            ? "복제 중..."
            : clonePreview.length > 0 && cloneTargetDates.length > 0
              ? `${cloneTargetDates.length}일에 ${clonePreview.length}개씩 복제`
              : "복제할 대상을 선택하세요"}
        </button>
      </section>

      {/* === 템플릿 수정 모달 === */}
      {editTemplate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] animate-fade-in"
          onClick={() => setEditTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[320px] max-w-[85vw] animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">✏️ 템플릿 수정</h3>

            <label className="text-sm font-semibold text-gray-600 block mb-1">
              이름
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#6c5ce7]"
            />

            <label className="text-sm font-semibold text-gray-600 block mb-1">
              할일 (줄바꿈으로 구분)
            </label>
            <textarea
              value={editTasks}
              onChange={(e) => setEditTasks(e.target.value)}
              rows={6}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm resize-none mb-4 focus:outline-none focus:border-[#6c5ce7]"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setEditTemplate(null)}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-semibold active:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={updateTemplate}
                disabled={!editName.trim() || !editTasks.trim()}
                className="flex-1 bg-[#6c5ce7] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      <SupervisorFAB />
      <Toast message={message} />
    </div>
  );
}
