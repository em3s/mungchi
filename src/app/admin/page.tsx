"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { CHILDREN, PIN } from "@/lib/constants";
import { todayKST } from "@/lib/date";

import { PinModal } from "@/components/PinModal";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

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
    if (session === "true") setAuthed(true);
    setLoaded(true);
  }, []);

  // 커스텀 템플릿 로드
  const loadTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("task_templates")
      .select("*")
      .order("created_at");
    if (data) setCustomTemplates(data as CustomTemplate[]);
  }, []);

  useEffect(() => {
    if (authed) loadTemplates();
  }, [authed, loadTemplates]);

  // PIN 성공
  const handlePinSuccess = useCallback(() => {
    localStorage.setItem(ADMIN_SESSION_KEY, "true");
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
            child_id: childId,
            title,
            date,
            priority: 0,
          }))
        )
      );
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;

      const childNames = selectedChildren
        .map((id) => CHILDREN.find((c) => c.id === id)?.name)
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
      await supabase.from("task_templates").delete().eq("id", id);
      setConfirmDeleteId(null);
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
      forChildren: ["sihyun", "misong"],
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
  }, [editTemplate, editName, editTasks, showToast, loadTemplates]);

  // --- 날짜 복제 ---
  const loadClonePreview = useCallback(async () => {
    setCloneLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("title")
      .eq("child_id", cloneChildId)
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
        .eq("child_id", cloneChildId)
        .eq("date", cloneSourceDate);
      if (!source || source.length === 0) {
        showToast("복제할 할일이 없습니다");
        return;
      }
      const copies = cloneTargetDates.flatMap((date) =>
        source.map((t) => ({
          child_id: cloneChildId,
          title: t.title,
          date,
          priority: t.priority,
        }))
      );
      const { error } = await supabase.from("tasks").insert(copies);
      if (error) throw error;

      const childName = CHILDREN.find((c) => c.id === cloneChildId)?.name;
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

      {/* === 벌크 추가 섹션 === */}
      <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold mb-4">📝 벌크 추가</h2>

        {/* 대상 아이 선택 */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">
            대상 아이
          </label>
          <div className="flex gap-3">
            {CHILDREN.map((child) => (
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
            {CHILDREN.map((child) => (
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

      <Toast message={message} />
    </div>
  );
}
