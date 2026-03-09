"use client";

import { useState, useEffect, useCallback } from "react";
import { getPresets, addPreset, deletePreset, type TaskPreset } from "@/lib/presets";

interface Props {
  showToast: (msg: string) => void;
}

export function AdminPresetSection({ showToast }: Props) {
  const [presets, setPresets] = useState<TaskPreset[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPresets = useCallback(async () => {
    const data = await getPresets();
    setPresets(data);
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setLoading(true);
    const ok = await addPreset(title);
    setLoading(false);
    if (ok) {
      showToast(`"${title}" 프리셋 추가!`);
      setNewTitle("");
      loadPresets();
    } else {
      showToast("추가 실패");
    }
  }

  async function handleDelete(id: string) {
    const ok = await deletePreset(id);
    setConfirmDeleteId(null);
    if (ok) {
      showToast("프리셋 삭제됨");
      loadPresets();
    } else {
      showToast("삭제 실패");
    }
  }

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      <h2 className="text-lg font-bold mb-4">⚡ 할일 프리셋</h2>

      {/* 현재 프리셋 목록 */}
      <div className="mb-4">
        {presets.length === 0 ? (
          <div className="text-sm text-gray-400 py-2">프리셋이 없습니다</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <div
                key={p.id}
                className="inline-flex items-center gap-1 bg-purple-50 text-[#6c5ce7] px-3 py-1.5 rounded-full text-sm font-medium"
              >
                <span>{p.title}</span>
                {confirmDeleteId === p.id ? (
                  <>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-md font-semibold ml-1"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-gray-400 ml-0.5"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(p.id)}
                    className="text-purple-300 hover:text-purple-600 ml-1 text-base leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 추가 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="프리셋 할일 이름"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6c5ce7]"
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || loading}
          className="bg-[#6c5ce7] text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80"
        >
          추가
        </button>
      </div>
    </section>
  );
}
