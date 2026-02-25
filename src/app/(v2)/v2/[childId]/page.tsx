"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogButton,
  Toast,
  Button,
  Fab,
} from "konsta/react";
import { supabase } from "@/lib/supabase/client";
import { todayKST, formatMonth, WEEKDAYS } from "@/lib/date";
import { getCheer } from "@/lib/constants";
import type { Task, MonthDays, CalendarEvent } from "@/lib/types";

// v1 visual components
import { ProgressRing } from "@/components/ProgressRing";
import { TaskItem } from "@/components/TaskItem";
import { Calendar } from "@/components/Calendar";
import { ConfettiEffect } from "@/components/ConfettiEffect";
import { PageHeader } from "@/components/PageHeader";
import { Loading } from "@/components/Loading";
import { BottomNav } from "@/components/BottomNav";
import { WeatherWidget } from "@/components/WeatherWidget";
import { TimelineBar } from "@/components/TimelineBar";

// Konsta-powered v2 components
import { V2TaskAddSheet } from "../../components/V2TaskAddSheet";
import { V2PinPopup } from "../../components/V2PinPopup";

// hooks & utils
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/useToast";
import { useEmojiOverride } from "@/hooks/useEmojiOverride";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useLongPress } from "@/hooks/useLongPress";
import { useUser } from "@/hooks/useUser";
import { useFeatureFlags } from "@/hooks/useFeatureGuard";
import { isFeatureEnabled } from "@/lib/features";
import { addTransaction } from "@/lib/coins";

export default function V2DashboardPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId, user: child } = useUser(params);
  const router = useRouter();
  const { logout } = useSession();
  const { message: toastMsg, showToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [confirmUntoggle, setConfirmUntoggle] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const prevRateRef = useRef<number | null>(null);
  const cheerRef = useRef({ rate: -1, message: "" });
  const bonusGivenRef = useRef(false);

  const { flagsLoaded } = useFeatureFlags();
  const weatherEnabled = flagsLoaded && isFeatureEnabled(childId, "weather");
  const { coinsEnabled, coinBalance, setCoinBalance } = useCoinBalance(childId);

  const today = todayKST();
  const [calYear, setCalYear] = useState(() => parseInt(today.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);
  const [monthData, setMonthData] = useState<MonthDays | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTasks, setDayTasks] = useState<Task[] | null>(null);
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);

  const { override: emojiOverride } = useEmojiOverride(childId);
  const displayEmoji = emojiOverride || child?.emoji;

  // --- Data fetching (identical to v1) ---
  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks").select("*").eq("user_id", childId).eq("date", today)
      .order("priority", { ascending: false }).order("created_at");
    if (!error && data) setTasks(data);
    setLoading(false);
  }, [childId, today]);

  const monthReqRef = useRef(0);
  const loadMonth = useCallback(async () => {
    const reqId = ++monthReqRef.current;
    const monthStr = formatMonth(calYear, calMonth);
    const { data } = await supabase
      .from("tasks").select("date, completed").eq("user_id", childId)
      .gte("date", `${monthStr}-01`).lte("date", `${monthStr}-31`);
    if (reqId !== monthReqRef.current) return;
    if (data) {
      const days: MonthDays = {};
      for (const task of data) {
        if (!days[task.date]) days[task.date] = { total: 0, completed: 0, rate: 0 };
        days[task.date].total++;
        if (task.completed) days[task.date].completed++;
      }
      for (const d of Object.values(days)) d.rate = d.total > 0 ? d.completed / d.total : 0;
      setMonthData(days);
    }
  }, [childId, calYear, calMonth]);

  const loadDayTasks = useCallback(async (date: string) => {
    const { data, error } = await supabase
      .from("tasks").select("*").eq("user_id", childId).eq("date", date)
      .order("priority", { ascending: false }).order("created_at");
    if (!error && data) setDayTasks(data);
  }, [childId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadMonth(); setSelectedDate(null); setDayTasks(null); }, [loadMonth]);
  useEffect(() => {
    fetch(`/api/calendar?year=${calYear}&month=${calMonth}`)
      .then((r) => (r.ok ? r.json() : [])).then((d: CalendarEvent[]) => setMonthEvents(d)).catch(() => setMonthEvents([]));
  }, [calYear, calMonth]);
  useEffect(() => { if (selectedDate) loadDayTasks(selectedDate); else setDayTasks(null); }, [selectedDate, loadDayTasks]);

  // --- Computed ---
  const activeTasks = selectedDate && dayTasks ? dayTasks : tasks;
  const activeCompleted = activeTasks.filter((t) => t.completed).length;
  const activeRate = activeTasks.length > 0 ? activeCompleted / activeTasks.length : 0;

  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  function showV2Toast(msg: string) {
    showToast(msg);
    setToastOpen(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastOpen(false), 2500);
  }

  // 올클리어
  useEffect(() => {
    if (prevRateRef.current !== null && prevRateRef.current < 1 && activeRate === 1 && !selectedDate) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      if (coinsEnabled && !bonusGivenRef.current) {
        bonusGivenRef.current = true;
        supabase.from("coin_transactions").select("id").eq("user_id", childId).eq("type", "allclear_bonus")
          .gte("created_at", today + "T00:00:00+09:00").lt("created_at", today + "T24:00:00+09:00").limit(1)
          .then(({ data: existing }) => {
            if (existing && existing.length > 0) return;
            addTransaction(childId, 3, "allclear_bonus", "올클리어 보너스").then((result) => {
              if (result.ok) { setCoinBalance(result.newBalance ?? null); showV2Toast("올클리어 보너스! 초코 +3! 🍪"); }
            });
          });
      }
    }
    if (activeRate < 1) bonusGivenRef.current = false;
    prevRateRef.current = activeRate;
  }, [activeRate, selectedDate, coinsEnabled, childId, today]);

  if (activeRate !== cheerRef.current.rate) {
    cheerRef.current = { rate: activeRate, message: getCheer(activeRate) };
  }

  // --- Handlers ---
  async function handleToggle(task: Task) {
    if (task.completed) { setConfirmUntoggle(task); return; }
    await doToggle(task);
  }

  async function doToggle(task: Task) {
    const newCompleted = !task.completed;
    const { error } = await supabase.from("tasks")
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq("id", task.id);
    if (error) { showV2Toast("변경 실패"); return; }
    const updateList = (list: Task[]) => list.map((t) => t.id === task.id ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : t);
    if (selectedDate && dayTasks) setDayTasks(updateList(dayTasks));
    else setTasks(updateList(tasks));
    if (coinsEnabled && !selectedDate) {
      const amt = newCompleted ? 1 : -1;
      const type = newCompleted ? "task_complete" : "task_uncomplete";
      const result = await addTransaction(childId, amt, type, task.title, task.id);
      if (result.ok) { setCoinBalance(result.newBalance ?? null); if (newCompleted) showV2Toast("초코 +1! 🍪"); }
    }
    loadMonth();
  }

  async function handleAddTask(title: string) {
    if (!title.trim()) return;
    const targetDate = selectedDate || today;
    const { data, error } = await supabase.from("tasks")
      .insert({ user_id: childId, title: title.trim(), date: targetDate, priority: 0 }).select().single();
    if (error || !data) { showV2Toast("추가 실패"); return; }
    if (selectedDate && dayTasks) setDayTasks([...dayTasks, data]);
    if (!selectedDate || targetDate === today) setTasks((prev) => [...prev, data]);
    loadMonth(); setShowAddSheet(false); showV2Toast("할일 추가 완료!");
  }

  async function handleEdit(task: Task, newTitle: string) {
    const { error } = await supabase.from("tasks").update({ title: newTitle }).eq("id", task.id);
    if (error) { showV2Toast("수정 실패"); return; }
    const updateList = (list: Task[]) => list.map((t) => (t.id === task.id ? { ...t, title: newTitle } : t));
    if (selectedDate && dayTasks) setDayTasks(updateList(dayTasks));
    else setTasks(updateList(tasks));
  }

  function handleDelete(task: Task) {
    setConfirmDelete(task);
  }

  async function doDelete(task: Task) {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) { showV2Toast("삭제 실패"); return; }
    if (selectedDate && dayTasks) setDayTasks(dayTasks.filter((t) => t.id !== task.id));
    if (task.date === today) setTasks((prev) => prev.filter((t) => t.id !== task.id));
    loadMonth(); showV2Toast("할일 삭제!");
  }

  function prevMonthNav() { if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); } else setCalMonth(calMonth - 1); }
  function nextMonthNav() { if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); } else setCalMonth(calMonth + 1); }
  function handleDateClick(date: string) { if (date !== selectedDate) setSelectedDate(date); }
  function goToday() { const t = todayKST(); setCalYear(parseInt(t.slice(0, 4))); setCalMonth(parseInt(t.slice(5, 7)) - 1); setSelectedDate(null); }

  const titleLongPress = useLongPress(() => setShowLockModal(true));

  function fmtDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
  }

  if (loading) return <Loading />;

  const activeLabel = selectedDate ? fmtDate(selectedDate) : "오늘";
  const todoTasks = activeTasks.filter((t) => !t.completed);
  const doneTasks = activeTasks.filter((t) => t.completed);
  const eventDates = new Set(monthEvents.map((e) => e.date));
  const activeDate = selectedDate || today;
  const dayEventsArr = monthEvents.filter((e) => e.date === activeDate);

  return (
    <div className="pt-2">
      {showConfetti && <ConfettiEffect />}

      {/* v1 Header */}
      <PageHeader
        title={<>{displayEmoji} {child?.name}</>}
        titleProps={titleLongPress}
        coinBalance={coinsEnabled ? coinBalance : undefined}
      />

      {weatherEnabled && <WeatherWidget today={today} />}

      <Calendar
        year={calYear} month={calMonth} monthData={monthData} today={today}
        selectedDate={selectedDate} eventDates={eventDates}
        onDateClick={handleDateClick} onPrevMonth={prevMonthNav}
        onNextMonth={nextMonthNav} onGoToday={goToday}
      />

      <ProgressRing rate={activeRate} />
      <div className="text-center text-base font-semibold -mt-3 mb-2 animate-cheer-bounce md:text-lg"
        style={{ color: "var(--accent, #6c5ce7)" }} key={cheerRef.current.message}>
        {cheerRef.current.message}
      </div>

      <TimelineBar events={dayEventsArr} date={activeDate} />

      {/* Task section header — no add button (FAB replaces it) */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider md:text-sm">
          {activeLabel} — 할 일 ({todoTasks.length})
        </div>
      </div>

      {/* v1 TaskItem list */}
      {todoTasks.length === 0 && doneTasks.length === 0 ? (
        <div className="text-center py-10 text-gray-400 md:text-lg">
          {selectedDate ? "이 날의 데이터가 없어요" : "오늘 할일이 없어요. 추가해보세요!"}
        </div>
      ) : todoTasks.length === 0 ? (
        <div className="text-center py-10 text-gray-400 md:text-lg">모두 완료! 🎉</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {todoTasks.map((t) => (
            <TaskItem key={t.id} task={t} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </ul>
      )}

      {doneTasks.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3 md:text-sm">
            완료 ({doneTasks.length})
          </div>
          <ul className="flex flex-col gap-2">
            {doneTasks.map((t) => (
              <TaskItem key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </ul>
        </>
      )}

      {/* v1 BottomNav */}
      <BottomNav childId={childId} />

      {/* === Konsta enhancements === */}

      {/* FAB — floating add button */}
      <Fab
        className="!fixed !right-4 !bottom-20 !z-40"
        icon={<span className="text-2xl leading-none">+</span>}
        onClick={() => setShowAddSheet(true)}
      />

      {/* Sheet — bottom sheet for adding tasks */}
      <V2TaskAddSheet
        opened={showAddSheet}
        onSubmit={handleAddTask}
        onClose={() => setShowAddSheet(false)}
      />

      {/* Dialog — iOS-style confirm modals */}
      <Dialog opened={!!confirmDelete} onBackdropClick={() => setConfirmDelete(null)}
        title="정말 지울까요?"
        content={confirmDelete ? <span className="text-gray-500">&ldquo;{confirmDelete.title}&rdquo;</span> : undefined}
        buttons={<><DialogButton onClick={() => setConfirmDelete(null)}>아니요</DialogButton><DialogButton strong onClick={() => { if (confirmDelete) doDelete(confirmDelete); setConfirmDelete(null); }} className="!text-red-500">지울래요</DialogButton></>}
      />
      <Dialog opened={!!confirmUntoggle} onBackdropClick={() => setConfirmUntoggle(null)}
        title="아직 안 했어요?"
        content={confirmUntoggle ? <span className="text-gray-500">&ldquo;{confirmUntoggle.title}&rdquo;</span> : undefined}
        buttons={<><DialogButton onClick={() => setConfirmUntoggle(null)}>아니요</DialogButton><DialogButton strong onClick={() => { if (confirmUntoggle) doToggle(confirmUntoggle); setConfirmUntoggle(null); }}>아직 안했어요</DialogButton></>}
      />

      {/* Toast — Konsta-style notification */}
      <Toast opened={toastOpen} button={<Button clear small inline onClick={() => setToastOpen(false)}>닫기</Button>}>
        <span className="shrink">{toastMsg}</span>
      </Toast>

      {/* PIN — Konsta Popup */}
      {showLockModal && (
        <V2PinPopup title="잠금 해제" subtitle="비밀번호를 입력하세요"
          onSuccess={() => { logout(); router.push("/"); }}
          onCancel={() => setShowLockModal(false)} />
      )}
    </div>
  );
}
