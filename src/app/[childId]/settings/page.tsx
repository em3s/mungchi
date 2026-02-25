"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { USERS, THEME_PRESETS, STAR_EMOJIS } from "@/lib/constants";
import { useThemeOverride } from "@/hooks/useThemeOverride";
import { useEmojiOverride } from "@/hooks/useEmojiOverride";
import { BottomNav } from "@/components/BottomNav";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const router = useRouter();
  const user = USERS.find((u) => u.id === childId);
  const { override, loaded, setTheme } = useThemeOverride(childId);
  const { override: emojiOverride, loaded: emojiLoaded, setEmoji } = useEmojiOverride(childId);

  if (!user) {
    router.replace("/");
    return null;
  }

  const activeTheme = override || user.theme;
  const activeEmoji = emojiOverride || user.emoji;

  return (
    <>
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-bold text-center">⚙️ 설정</h1>
      </div>

      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-bold mb-4">🎨 테마 색상</h2>

        {loaded && (
          <div className="grid grid-cols-4 gap-4">
            {THEME_PRESETS.map((preset) => {
              const isActive = activeTheme === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() =>
                    setTheme(preset.id === user.theme ? null : preset.id)
                  }
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-12 h-12 rounded-full border-3 transition-all md:w-14 md:h-14"
                    style={{
                      backgroundColor: preset.accent,
                      borderColor: isActive ? "#2d3436" : "transparent",
                      transform: isActive ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                  <span
                    className={`text-xs font-semibold ${isActive ? "text-[var(--accent)]" : "text-gray-500"}`}
                  >
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {override && (
          <button
            onClick={() => setTheme(null)}
            className="mt-4 w-full text-sm text-gray-400 underline"
          >
            기본 테마로 되돌리기
          </button>
        )}
      </section>

      <section className="bg-white rounded-2xl p-5 shadow-sm mt-4">
        <h2 className="text-base font-bold mb-4">나의 별 이모지</h2>

        {emojiLoaded && (
          <div className="grid grid-cols-6 gap-3">
            {STAR_EMOJIS.map((emoji) => {
              const isActive = activeEmoji === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() =>
                    setEmoji(emoji === user.emoji ? null : emoji)
                  }
                  className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl transition-all md:w-14 md:h-14"
                  style={{
                    backgroundColor: isActive ? "var(--accent-light, #f0edff)" : "#f5f5f5",
                    borderWidth: 2,
                    borderColor: isActive ? "var(--accent, #6c5ce7)" : "transparent",
                    transform: isActive ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}

        {emojiOverride && (
          <button
            onClick={() => setEmoji(null)}
            className="mt-4 w-full text-sm text-gray-400 underline"
          >
            기본 이모지로 되돌리기
          </button>
        )}
      </section>

      <section className="bg-white rounded-2xl p-5 shadow-sm mt-4">
        <h2 className="text-base font-bold mb-4">📦 앱 업데이트</h2>
        <ForceUpdate />
      </section>

      <BottomNav childId={childId} />
    </>
  );
}

function ForceUpdate() {
  const [status, setStatus] = useState<"idle" | "checking" | "done">("idle");

  const handleUpdate = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }

    setStatus("checking");

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        // waiting SW가 있으면 활성화
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
          // controllerchange가 reload 처리
          return;
        }
      }
      // 캐시 전체 삭제
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch {
      // 실패해도 reload
    }

    setStatus("done");
    window.location.reload();
  }, []);

  return (
    <button
      onClick={handleUpdate}
      disabled={status === "checking"}
      className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
      style={{
        backgroundColor: status === "checking" ? "#e2e8f0" : "var(--accent, #6c5ce7)",
        color: status === "checking" ? "#94a3b8" : "white",
      }}
    >
      {status === "checking" ? "확인 중..." : "최신 버전으로 업데이트"}
    </button>
  );
}
