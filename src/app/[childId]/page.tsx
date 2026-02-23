"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { todayKST, formatMonth, WEEKDAYS } from "@/lib/date";
import { getCheer, USERS } from "@/lib/constants";
import type { Task, MonthDays, CalendarEvent } from "@/lib/types";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskItem } from "@/components/TaskItem";
import { TaskForm } from "@/components/TaskForm";
import { BottomNav } from "@/components/BottomNav";
import { Calendar } from "@/components/Calendar";
import { ConfettiEffect } from "@/components/ConfettiEffect";
import { Toast } from "@/components/Toast";
import { PinModal } from "@/components/PinModal";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/useToast";
import { isFeatureEnabled, loadFeatureFlags } from "@/lib/features";
import { addTransaction, getBalance } from "@/lib/coins";

export default function DashboardPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const { logout } = useSession();
  const { message: toastMsg, showToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmUntoggle, setConfirmUntoggle] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const prevRateRef = useRef<number | null>(null);
  const cheerRef = useRef({ rate: -1, message: "" });
  const bonusGivenRef = useRef(false);

  // 별사탕
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinsEnabled, setCoinsEnabled] = useState(false);

  // 달력 상태
  const today = todayKST();
  const [calYear, setCalYear] = useState(() => parseInt(today.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(
    () => parseInt(today.slice(5, 7)) - 1
  );
  const [monthData, setMonthData] = useState<MonthDays | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTasks, setDayTasks] = useState<Task[] | null>(null);
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);

  const child = USERS.find((c) => c.id === childId);

  // 오늘 할일 로드
  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", childId)
      .eq("date", today)
      .order("priority", { ascending: false })
      .order("created_at");
    if (!error && data) setTasks(data);
    setLoading(false);
  }, [childId, today]);

  // 월간 데이터 로드
  const loadMonth = useCallback(async () => {
    const monthStr = formatMonth(calYear, calMonth);
    const startDate = `${monthStr}-01`;
    const endDate = `${monthStr}-31`;

    const { data } = await supabase
      .from("tasks")
      .select("date, completed")
      .eq("user_id", childId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (data) {
      const days: MonthDays = {};
      for (const task of data) {
        if (!days[task.date]) {
          days[task.date] = { total: 0, completed: 0, rate: 0 };
        }
        days[task.date].total++;
        if (task.completed) days[task.date].completed++;
      }
      for (const d of Object.values(days)) {
        d.rate = d.total > 0 ? d.completed / d.total : 0;
      }
      setMonthData(days);
    }
  }, [childId, calYear, calMonth]);

  // 선택된 날짜의 할일 로드
  const loadDayTasks = useCallback(
    async (date: string) => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", childId)
        .eq("date", date)
        .order("priority", { ascending: false })
        .order("created_at");
      if (!error && data) setDayTasks(data);
    },
    [childId]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 별사탕 초기화
  useEffect(() => {
    loadFeatureFlags().then(() => {
      const enabled = isFeatureEnabled(childId, "coins");
      setCoinsEnabled(enabled);
      if (enabled) getBalance(childId).then(setCoinBalance);
    });
  }, [childId]);

  useEffect(() => {
    loadMonth();
    setSelectedDate(null);
    setDayTasks(null);
  }, [loadMonth]);

  // 월별 캘린더 이벤트 로드
  useEffect(() => {
    fetch(`/api/calendar?year=${calYear}&month=${calMonth}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CalendarEvent[]) => setMonthEvents(data))
      .catch(() => setMonthEvents([]));
  }, [calYear, calMonth]);

  useEffect(() => {
    if (selectedDate) loadDayTasks(selectedDate);
    else setDayTasks(null);
  }, [selectedDate, loadDayTasks]);

  // 활성 할일과 달성률 계산
  const activeTasks = selectedDate && dayTasks ? dayTasks : tasks;
  const activeTotal = activeTasks.length;
  const activeCompleted = activeTasks.filter((t) => t.completed).length;
  const activeRate = activeTotal > 0 ? activeCompleted / activeTotal : 0;

  // 올클리어 컨페티 + 별사탕 보너스
  useEffect(() => {
    if (
      prevRateRef.current !== null &&
      prevRateRef.current < 1 &&
      activeRate === 1 &&
      !selectedDate
    ) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      if (coinsEnabled && !bonusGivenRef.current) {
        bonusGivenRef.current = true;
        addTransaction(childId, 3, "allclear_bonus", "올클리어 보너스").then(
          (result) => {
            if (result.ok) {
              setCoinBalance(result.newBalance ?? null);
              showToast("올클리어 보너스! 별사탕 +3! 🍬");
            }
          },
        );
      }
    }
    if (activeRate < 1) bonusGivenRef.current = false;
    prevRateRef.current = activeRate;
  }, [activeRate, selectedDate, coinsEnabled, childId, showToast]);

  // 응원 메시지
  if (activeRate !== cheerRef.current.rate) {
    cheerRef.current = { rate: activeRate, message: getCheer(activeRate) };
  }

  // 할일 토글
  async function handleToggle(task: Task) {
    // 체크 취소는 확인 필요
    if (task.completed) {
      setConfirmUntoggle(task);
      return;
    }
    await doToggle(task);
  }

  async function doToggle(task: Task) {
    const newCompleted = !task.completed;
    const { error } = await supabase
      .from("tasks")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) {
      showToast("변경 실패");
      return;
    }

    // 로컬 상태 업데이트
    const updateList = (list: Task[]) =>
      list.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : null,
            }
          : t
      );

    if (selectedDate && dayTasks) {
      setDayTasks(updateList(dayTasks));
    } else {
      setTasks(updateList(tasks));
    }

    // 별사탕 (오늘 날짜만)
    if (coinsEnabled && !selectedDate) {
      if (newCompleted) {
        const result = await addTransaction(
          childId,
          1,
          "task_complete",
          task.title,
          task.id,
        );
        if (result.ok) {
          setCoinBalance(result.newBalance ?? null);
          showToast("별사탕 +1! 🍬");
        }
      } else {
        const result = await addTransaction(
          childId,
          -1,
          "task_uncomplete",
          task.title,
          task.id,
        );
        if (result.ok) setCoinBalance(result.newBalance ?? null);
      }
    }

    loadMonth();
  }

  // 할일 추가
  async function handleAddTask(title: string) {
    const targetDate = selectedDate || today;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: childId,
        title,
        date: targetDate,
        priority: 0,
      })
      .select()
      .single();

    if (error || !data) {
      showToast("추가 실패");
      return;
    }

    if (selectedDate && dayTasks) {
      setDayTasks([...dayTasks, data]);
    }
    if (!selectedDate || targetDate === today) {
      setTasks((prev) => [...prev, data]);
    }
    loadMonth();
    setShowAddForm(false);
    showToast("할일 추가 완료!");
  }

  // 할일 수정
  async function handleEdit(task: Task, newTitle: string) {
    const { error } = await supabase.from("tasks").update({ title: newTitle }).eq("id", task.id);

    if (error) {
      showToast("수정 실패");
      return;
    }

    const updateList = (list: Task[]) =>
      list.map((t) => (t.id === task.id ? { ...t, title: newTitle } : t));

    if (selectedDate && dayTasks) {
      setDayTasks(updateList(dayTasks));
    } else {
      setTasks(updateList(tasks));
    }
  }

  // 할일 삭제 (확인 후)
  function handleDelete(task: Task) {
    setConfirmDelete(task);
  }

  async function doDelete(task: Task) {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);

    if (error) {
      showToast("삭제 실패");
      return;
    }

    if (selectedDate && dayTasks) {
      setDayTasks(dayTasks.filter((t) => t.id !== task.id));
    }
    if (task.date === today) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    }

    loadMonth();
    showToast("할일 삭제!");
  }

  // 달력 네비게이션
  function prevMonthNav() {
    if (calMonth === 0) {
      setCalYear(calYear - 1);
      setCalMonth(11);
    } else setCalMonth(calMonth - 1);
  }

  function nextMonthNav() {
    if (calMonth === 11) {
      setCalYear(calYear + 1);
      setCalMonth(0);
    } else setCalMonth(calMonth + 1);
  }

  function handleDateClick(date: string) {
    if (date === selectedDate) return;
    setSelectedDate(date);
  }

  function goToday() {
    const t = todayKST();
    setCalYear(parseInt(t.slice(0, 4)));
    setCalMonth(parseInt(t.slice(5, 7)) - 1);
    setSelectedDate(null);
  }

  // 롱프레스 로그아웃
  const longPressRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function formatSelectedDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const weekday = WEEKDAYS[d.getDay()];
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}월 ${day}일 (${weekday})`;
  }

  if (loading) {
    return (
      <div className="text-center pt-[60px] text-gray-400 text-xl">
        불러오는 중...
      </div>
    );
  }

  const activeLabel = selectedDate
    ? formatSelectedDate(selectedDate)
    : "오늘";
  const todoTasks = activeTasks.filter((t) => !t.completed);
  const doneTasks = activeTasks.filter((t) => t.completed);

  // 캘린더 이벤트
  const eventDates = new Set(monthEvents.map((e) => e.date));
  const activeDate = selectedDate || today;
  const dayEvents = monthEvents.filter((e) => e.date === activeDate);

  return (
    <div className="pt-2">
      {showConfetti && <ConfettiEffect />}

      {/* Header */}
      <div className="flex items-center justify-between py-4 sticky top-0 z-10" style={{ background: "var(--bg)" }}>
        <h1
          className="text-xl font-bold md:text-2xl select-none"
          onTouchStart={() => {
            longPressRef.current = setTimeout(
              () => setShowLockModal(true),
              800
            );
          }}
          onTouchEnd={() => clearTimeout(longPressRef.current)}
          onTouchMove={() => clearTimeout(longPressRef.current)}
        >
          {child?.emoji} {child?.name}
        </h1>
        {coinsEnabled && coinBalance !== null && (
          <span className="text-sm font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full">
            🍬 {coinBalance}
          </span>
        )}
      </div>

      {/* Calendar */}
      <Calendar
        year={calYear}
        month={calMonth}
        monthData={monthData}
        today={today}
        selectedDate={selectedDate}
        eventDates={eventDates}
        onDateClick={handleDateClick}
        onPrevMonth={prevMonthNav}
        onNextMonth={nextMonthNav}
        onGoToday={goToday}
      />

      {/* Progress Ring */}
      <ProgressRing rate={activeRate} />
      <div
        className="text-center text-base font-semibold -mt-3 mb-2 animate-cheer-bounce md:text-lg"
        style={{ color: "var(--accent, #6c5ce7)" }}
        key={cheerRef.current.message}
      >
        {cheerRef.current.message}
      </div>

      {/* Calendar Events */}
      {dayEvents.length > 0 && (
        <div className="mt-6 mb-3">
          <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2 md:text-sm">
            📅 일정 ({dayEvents.length})
          </div>
          <ul className="flex flex-col gap-2">
            {dayEvents.map((ev) => (
              <li
                key={ev.uid}
                className="bg-blue-50 rounded-xl px-4 py-3 text-blue-900 md:rounded-[14px]"
              >
                <div className="font-semibold text-sm md:text-base">
                  {ev.summary}
                </div>
                {!ev.isAllDay && ev.startTime && (
                  <div className="text-xs text-blue-500 mt-0.5">
                    {ev.startTime}
                    {ev.endTime ? ` ~ ${ev.endTime}` : ""}
                  </div>
                )}
                {ev.isAllDay && (
                  <div className="text-xs text-blue-400 mt-0.5">하루종일</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Task Section Header */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider md:text-sm">
          {activeLabel} — 할 일 ({todoTasks.length})
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="text-sm font-semibold px-3 py-1 rounded-xl text-white bg-[var(--accent,#6c5ce7)] active:opacity-80"
        >
          + 추가
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-3">
          <TaskForm
            onSubmit={handleAddTask}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Tasks */}
      {todoTasks.length === 0 && doneTasks.length === 0 ? (
        <div className="text-center py-10 text-gray-400 md:text-lg">
          {selectedDate
            ? "이 날의 데이터가 없어요"
            : "오늘 할일이 없어요. 추가해보세요!"}
        </div>
      ) : todoTasks.length === 0 ? (
        <div className="text-center py-10 text-gray-400 md:text-lg">
          모두 완료! 🎉
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {todoTasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {/* Done Tasks */}
      {doneTasks.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3 md:text-sm">
            완료 ({doneTasks.length})
          </div>
          <ul className="flex flex-col gap-2">
            {doneTasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </>
      )}

      <BottomNav childId={childId} />
      <Toast message={toastMsg} />

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] animate-fade-in"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[280px] max-w-[85vw] text-center animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold mb-2">정말 지울까요?</div>
            <div className="text-sm text-gray-500 mb-5">
              &ldquo;{confirmDelete.title}&rdquo;
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-500 active:bg-gray-200"
              >
                아니요
              </button>
              <button
                onClick={() => {
                  doDelete(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="flex-1 py-2.5 bg-red-500 rounded-xl text-sm font-semibold text-white active:opacity-80"
              >
                지울래요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Untoggle Confirm Modal */}
      {confirmUntoggle && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] animate-fade-in"
          onClick={() => setConfirmUntoggle(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[280px] max-w-[85vw] text-center animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold mb-2">아직 안 했어요?</div>
            <div className="text-sm text-gray-500 mb-5">
              &ldquo;{confirmUntoggle.title}&rdquo;
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmUntoggle(null)}
                className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-500 active:bg-gray-200"
              >
                아니요
              </button>
              <button
                onClick={() => {
                  doToggle(confirmUntoggle);
                  setConfirmUntoggle(null);
                }}
                className="flex-1 py-2.5 bg-[var(--accent,#6c5ce7)] rounded-xl text-sm font-semibold text-white active:opacity-80"
              >
                아직 안했어요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLockModal && (
        <PinModal
          title="잠금 해제"
          subtitle="비밀번호를 입력하세요"
          onSuccess={() => {
            logout();
            router.push("/");
          }}
          onCancel={() => setShowLockModal(false)}
        />
      )}
    </div>
  );
}
