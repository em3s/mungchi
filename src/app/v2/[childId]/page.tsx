"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Page,
  Navbar,
  Block,
  BlockTitle,
  List,
  ListItem,
  ListInput,
  Button,
  Dialog,
  DialogButton,
  Toast,
  Tabbar,
  TabbarLink,
} from "konsta/react";
import { supabase } from "@/lib/supabase/client";
import { todayKST, formatMonth, WEEKDAYS } from "@/lib/date";
import { getCheer } from "@/lib/constants";
import type { Task, MonthDays, CalendarEvent } from "@/lib/types";
import { ProgressRing } from "@/components/ProgressRing";
import { Calendar } from "@/components/Calendar";
import { ConfettiEffect } from "@/components/ConfettiEffect";
import { TimelineBar } from "@/components/TimelineBar";
import { WeatherWidget } from "@/components/WeatherWidget";
import { Loading } from "@/components/Loading";
import { PinModal } from "@/components/PinModal";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [confirmUntoggle, setConfirmUntoggle] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const prevRateRef = useRef<number | null>(null);
  const cheerRef = useRef({ rate: -1, message: "" });
  const bonusGivenRef = useRef(false);

  // 피쳐플래그
  const { flagsLoaded } = useFeatureFlags();
  const weatherEnabled = flagsLoaded && isFeatureEnabled(childId, "weather");
  const { coinsEnabled, coinBalance, setCoinBalance } =
    useCoinBalance(childId);

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

  const { override: emojiOverride } = useEmojiOverride(childId);
  const displayEmoji = emojiOverride || child?.emoji;

  // --- Data fetching (identical to v1) ---

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

  const monthReqRef = useRef(0);
  const loadMonth = useCallback(async () => {
    const reqId = ++monthReqRef.current;
    const monthStr = formatMonth(calYear, calMonth);
    const startDate = `${monthStr}-01`;
    const endDate = `${monthStr}-31`;
    const { data } = await supabase
      .from("tasks")
      .select("date, completed")
      .eq("user_id", childId)
      .gte("date", startDate)
      .lte("date", endDate);
    if (reqId !== monthReqRef.current) return;
    if (data) {
      const days: MonthDays = {};
      for (const task of data) {
        if (!days[task.date])
          days[task.date] = { total: 0, completed: 0, rate: 0 };
        days[task.date].total++;
        if (task.completed) days[task.date].completed++;
      }
      for (const d of Object.values(days)) {
        d.rate = d.total > 0 ? d.completed / d.total : 0;
      }
      setMonthData(days);
    }
  }, [childId, calYear, calMonth]);

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

  useEffect(() => {
    loadMonth();
    setSelectedDate(null);
    setDayTasks(null);
  }, [loadMonth]);

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

  // --- Computed ---

  const activeTasks = selectedDate && dayTasks ? dayTasks : tasks;
  const activeTotal = activeTasks.length;
  const activeCompleted = activeTasks.filter((t) => t.completed).length;
  const activeRate = activeTotal > 0 ? activeCompleted / activeTotal : 0;

  // 올클리어 컨페티 + 초코 보너스
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
        supabase
          .from("coin_transactions")
          .select("id")
          .eq("user_id", childId)
          .eq("type", "allclear_bonus")
          .gte("created_at", today + "T00:00:00+09:00")
          .lt("created_at", today + "T24:00:00+09:00")
          .limit(1)
          .then(({ data: existing }) => {
            if (existing && existing.length > 0) return;
            addTransaction(childId, 3, "allclear_bonus", "올클리어 보너스").then(
              (result) => {
                if (result.ok) {
                  setCoinBalance(result.newBalance ?? null);
                  showToast("올클리어 보너스! 초코 +3! 🍪");
                }
              }
            );
          });
      }
    }
    if (activeRate < 1) bonusGivenRef.current = false;
    prevRateRef.current = activeRate;
  }, [activeRate, selectedDate, coinsEnabled, childId, today, showToast]);

  // 응원 메시지
  if (activeRate !== cheerRef.current.rate) {
    cheerRef.current = { rate: activeRate, message: getCheer(activeRate) };
  }

  // --- Handlers ---

  async function handleToggle(task: Task) {
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
    if (selectedDate && dayTasks) setDayTasks(updateList(dayTasks));
    else setTasks(updateList(tasks));

    if (coinsEnabled && !selectedDate) {
      if (newCompleted) {
        const result = await addTransaction(
          childId,
          1,
          "task_complete",
          task.title,
          task.id
        );
        if (result.ok) {
          setCoinBalance(result.newBalance ?? null);
          showToast("초코 +1! 🍪");
        }
      } else {
        const result = await addTransaction(
          childId,
          -1,
          "task_uncomplete",
          task.title,
          task.id
        );
        if (result.ok) setCoinBalance(result.newBalance ?? null);
      }
    }
    loadMonth();
  }

  async function handleAddTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    const targetDate = selectedDate || today;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ user_id: childId, title, date: targetDate, priority: 0 })
      .select()
      .single();
    if (error || !data) {
      showToast("추가 실패");
      return;
    }
    if (selectedDate && dayTasks) setDayTasks([...dayTasks, data]);
    if (!selectedDate || targetDate === today) setTasks((prev) => [...prev, data]);
    loadMonth();
    setShowAddForm(false);
    setNewTaskTitle("");
    showToast("할일 추가 완료!");
  }

  async function handleEdit(task: Task, newTitle: string) {
    const { error } = await supabase
      .from("tasks")
      .update({ title: newTitle })
      .eq("id", task.id);
    if (error) {
      showToast("수정 실패");
      return;
    }
    const updateList = (list: Task[]) =>
      list.map((t) => (t.id === task.id ? { ...t, title: newTitle } : t));
    if (selectedDate && dayTasks) setDayTasks(updateList(dayTasks));
    else setTasks(updateList(tasks));
  }

  async function doDelete(task: Task) {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      showToast("삭제 실패");
      return;
    }
    if (selectedDate && dayTasks)
      setDayTasks(dayTasks.filter((t) => t.id !== task.id));
    if (task.date === today)
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
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
  const titleLongPress = useLongPress(() => setShowLockModal(true));

  function formatSelectedDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const weekday = WEEKDAYS[d.getDay()];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`;
  }

  if (loading) return <Loading />;

  const activeLabel = selectedDate
    ? formatSelectedDate(selectedDate)
    : "오늘";
  const todoTasks = activeTasks.filter((t) => !t.completed);
  const doneTasks = activeTasks.filter((t) => t.completed);
  const eventDates = new Set(monthEvents.map((e) => e.date));
  const activeDate = selectedDate || today;
  const dayEventsArr = monthEvents.filter((e) => e.date === activeDate);

  // Tabbar
  const tabs = [
    { href: `/v2/${childId}`, label: "할일", icon: "📋", key: "dashboard" },
    { href: `/${childId}/badges`, label: "뱃지", icon: "🏅", key: "badges" },
    { href: `/${childId}/shop`, label: "초코", icon: "🍪", key: "coins" },
    { href: `/${childId}/vocab`, label: "영어", icon: "📖", key: "vocab" },
    { href: `/${childId}/settings`, label: "설정", icon: "⚙️", key: "settings" },
  ].filter((tab) => {
    if (tab.key === "coins") return isFeatureEnabled(childId, "coins");
    if (tab.key === "vocab") return isFeatureEnabled(childId, "vocab");
    return true;
  });

  return (
    <Page>
      {showConfetti && <ConfettiEffect />}

      {/* Navbar */}
      <Navbar
        title={
          <span {...titleLongPress}>
            {displayEmoji} {child?.name}
          </span>
        }
        right={
          coinsEnabled && coinBalance !== null ? (
            <span className="text-sm font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full">
              🍪 {coinBalance}
            </span>
          ) : undefined
        }
        className="!bg-[var(--bg)]"
      />

      {/* Weather */}
      {weatherEnabled && (
        <Block className="!mt-0 !mb-0">
          <WeatherWidget today={today} />
        </Block>
      )}

      {/* Calendar */}
      <Block className="!px-0 !mt-2 !mb-0">
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
      </Block>

      {/* Progress Ring + Cheer */}
      <Block className="text-center !mb-0">
        <ProgressRing rate={activeRate} />
        <div
          className="text-base font-semibold -mt-3 mb-1 animate-cheer-bounce"
          style={{ color: "var(--accent, #6c5ce7)" }}
          key={cheerRef.current.message}
        >
          {cheerRef.current.message}
        </div>
      </Block>

      {/* Timeline Events */}
      <Block className="!px-0 !mt-0 !mb-0">
        <TimelineBar events={dayEventsArr} date={activeDate} />
      </Block>

      {/* Task Section: Todo */}
      <BlockTitle
        className="flex items-center justify-between !mt-4"
      >
        <span>{activeLabel} — 할 일 ({todoTasks.length})</span>
        <Button
          small
          onClick={() => setShowAddForm(true)}
          className="!bg-[var(--accent,#6c5ce7)]"
        >
          + 추가
        </Button>
      </BlockTitle>

      {/* Add Task Dialog */}
      <Dialog
        opened={showAddForm}
        onBackdropClick={() => setShowAddForm(false)}
        title="할일 추가"
        content={
          <ListInput
            type="text"
            placeholder="할일을 입력하세요"
            value={newTaskTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewTaskTitle(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter") handleAddTask();
            }}
          />
        }
        buttons={
          <>
            <DialogButton onClick={() => setShowAddForm(false)}>
              취소
            </DialogButton>
            <DialogButton strong onClick={handleAddTask}>
              추가
            </DialogButton>
          </>
        }
      />

      {/* Todo Tasks */}
      {todoTasks.length === 0 && doneTasks.length === 0 ? (
        <Block className="text-center text-gray-400">
          {selectedDate
            ? "이 날의 데이터가 없어요"
            : "오늘 할일이 없어요. 추가해보세요!"}
        </Block>
      ) : todoTasks.length === 0 ? (
        <Block className="text-center text-gray-400">모두 완료! 🎉</Block>
      ) : (
        <List strongIos outlineIos>
          {todoTasks.map((t) => (
            <ListItem
              key={t.id}
              title={t.title}
              after={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(t);
                  }}
                  className="text-gray-400 text-sm px-1 active:text-red-500"
                >
                  ✕
                </button>
              }
              media={
                <button
                  onClick={() => handleToggle(t)}
                  className="w-7 h-7 rounded-full border-[2.5px] flex items-center justify-center shrink-0 bg-white border-[var(--accent,#6c5ce7)]"
                />
              }
              onClick={() => handleEdit(t, t.title)}
            />
          ))}
        </List>
      )}

      {/* Done Tasks */}
      {doneTasks.length > 0 && (
        <>
          <BlockTitle>{`완료 (${doneTasks.length})`}</BlockTitle>
          <List strongIos outlineIos>
            {doneTasks.map((t) => (
              <ListItem
                key={t.id}
                title={
                  <span className="line-through opacity-55">{t.title}</span>
                }
                media={
                  <button
                    onClick={() => handleToggle(t)}
                    className="w-7 h-7 rounded-full border-[2.5px] flex items-center justify-center shrink-0 text-sm bg-[var(--accent,#6c5ce7)] border-[var(--accent,#6c5ce7)] text-white"
                  >
                    ✓
                  </button>
                }
                after={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(t);
                    }}
                    className="text-gray-400 text-sm px-1 active:text-red-500"
                  >
                    ✕
                  </button>
                }
              />
            ))}
          </List>
        </>
      )}

      {/* Spacer for tabbar */}
      <Block className="!h-16" />

      {/* Tabbar */}
      <Tabbar className="!fixed !bottom-0 left-0 right-0 !pb-[env(safe-area-inset-bottom,8px)]">
        {tabs.map((tab) => (
          <TabbarLink
            key={tab.key}
            active={tab.key === "dashboard"}
            onClick={() => router.push(tab.href)}
            icon={<span className="text-xl">{tab.icon}</span>}
            label={tab.label}
          />
        ))}
      </Tabbar>

      {/* Delete Confirm Dialog */}
      <Dialog
        opened={!!confirmDelete}
        onBackdropClick={() => setConfirmDelete(null)}
        title="정말 지울까요?"
        content={
          confirmDelete ? (
            <span className="text-gray-500">
              &ldquo;{confirmDelete.title}&rdquo;
            </span>
          ) : undefined
        }
        buttons={
          <>
            <DialogButton onClick={() => setConfirmDelete(null)}>
              아니요
            </DialogButton>
            <DialogButton
              strong
              onClick={() => {
                if (confirmDelete) doDelete(confirmDelete);
                setConfirmDelete(null);
              }}
              className="!text-red-500"
            >
              지울래요
            </DialogButton>
          </>
        }
      />

      {/* Untoggle Confirm Dialog */}
      <Dialog
        opened={!!confirmUntoggle}
        onBackdropClick={() => setConfirmUntoggle(null)}
        title="아직 안 했어요?"
        content={
          confirmUntoggle ? (
            <span className="text-gray-500">
              &ldquo;{confirmUntoggle.title}&rdquo;
            </span>
          ) : undefined
        }
        buttons={
          <>
            <DialogButton onClick={() => setConfirmUntoggle(null)}>
              아니요
            </DialogButton>
            <DialogButton
              strong
              onClick={() => {
                if (confirmUntoggle) doToggle(confirmUntoggle);
                setConfirmUntoggle(null);
              }}
            >
              아직 안했어요
            </DialogButton>
          </>
        }
      />

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

      {/* Toast */}
      <Toast
        opened={!!toastMsg}
        button={
          <Button clear small inline>
            닫기
          </Button>
        }
      >
        <span className="shrink">{toastMsg}</span>
      </Toast>
    </Page>
  );
}
