"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PinModal } from "@/components/PinModal";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { decodeFragment } from "@/lib/import/parse";
import { analyzeImport } from "@/lib/import/validate";
import { activeSnapshot, makeKey, type ImportSnapshot } from "@/lib/import/snapshot";
import { addWordsOnly, previewAddWords, type PreviewAddResult } from "@/lib/vocab";

const SESSION_KEY = "mungchi_session";

// --- 외부 값 구독(fragment, 세션). effect 안에서 setState 하지 않고 읽는다. ---
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const getHash = () => window.location.hash;

const sessionListeners = new Set<() => void>();
function subscribeSession(cb: () => void) {
  sessionListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    sessionListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function getSession() {
  try {
    return localStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

type Preview = { key: string; result: PreviewAddResult };

export default function ImportPage() {
  const router = useRouter();
  const { message, showToast } = useToast();

  // 서버 렌더·하이드레이션 동안은 null 로 두어 깜빡임을 막는다.
  const hash = useSyncExternalStore(subscribeHash, getHash, () => null);
  const authed = useSyncExternalStore(subscribeSession, getSession, () => false);

  const [pasted, setPasted] = useState<string | null>(null); // null = 건드리지 않음(링크 원문 표시)
  const [applied, setApplied] = useState<string | null>(null); // 붙여넣기 확정 텍스트
  const [preview, setPreview] = useState<Preview | null>(null);
  // [넣기]를 누른 시점의 목록. PIN 확인 중 입력이 바뀌어도 이것만 저장한다.
  const [pendingRaw, setPending] = useState<ImportSnapshot | null>(null);
  const [writing, setWriting] = useState(false);
  const [writeFailed, setWriteFailed] = useState(false);

  // 입력 원문: 붙여넣기가 있으면 그것, 없으면 fragment.
  const decoded = useMemo(() => (hash === null ? null : decodeFragment(hash)), [hash]);
  const text = applied ?? (decoded?.ok ? decoded.text : null);
  const check = useMemo(() => (text === null ? null : analyzeImport(text)), [text]);
  const key = check && check.ok ? makeKey(check.title, check.words) : null;
  // PIN 을 기다리는 동안 링크가 바뀌면 스냅숏이 무효가 되어 PIN 창이 닫히고 미리보기가 새로 그려진다.
  const pending = activeSnapshot(pendingRaw, key);

  // 미리보기: DB 를 읽기만 한다(페이지를 열 때 쓰기 없음).
  useEffect(() => {
    if (!check || !check.ok || key === null) return;
    let cancelled = false;
    previewAddWords(check.title, check.words).then((result) => {
      if (!cancelled) setPreview({ key, result });
    });
    return () => {
      cancelled = true;
    };
    // check 는 key 로 대표된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const doWrite = useCallback(async (target: ImportSnapshot) => {
    setWriting(true);
    setWriteFailed(false);
    const r = await addWordsOnly(target.title, target.words);
    setWriting(false);
    if (!r.ok) {
      setWriteFailed(true);
      showToast("넣지 못했어요");
      return;
    }
    showToast(`"${target.title}" ${r.added.length}개 단어 추가!`);
    router.push("/");
  }, [router, showToast]);

  const handlePinSuccess = useCallback(() => {
    try {
      localStorage.setItem(SESSION_KEY, "true");
    } catch {
      /* ignore */
    }
    sessionListeners.forEach((l) => l());
    const target = pending;
    setPending(null);
    if (target) void doWrite(target);
  }, [doWrite, pending]);

  const onInsert = () => {
    if (writing || !check || !check.ok) return;
    const target = { key: key as string, title: check.title, words: check.words };
    if (!authed) setPending(target);
    else void doWrite(target);
  };

  if (hash === null) {
    return <div className="text-center pt-[60px] text-gray-400 text-xl">불러오는 중...</div>;
  }

  const pv = preview && preview.key === key ? preview.result : null;
  const showInput = text === null || (check !== null && !check.ok);

  return (
    <div className="max-w-[640px] mx-auto px-4 pt-4 pb-20">
      <h1 className="text-xl font-extrabold mb-1">📥 단어장에 넣기</h1>
      <p className="text-sm text-gray-500 mb-4">
        내용을 확인하고 비밀번호를 입력한 뒤 [넣기]를 눌러야 들어가요.
      </p>

      {decoded && !decoded.ok && decoded.reason === "broken" && applied === null && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 text-sm text-red-500">
          링크가 깨졌어요. 아래 칸에 단어 목록 텍스트를 붙여넣어 주세요.
        </div>
      )}
      {decoded && !decoded.ok && decoded.reason === "toolong" && applied === null && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 text-sm text-red-500">
          링크가 너무 길어요. 나눠서 보내 달라고 해 주세요.
        </div>
      )}

      {showInput && (
        <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="text-xs text-gray-500 mb-2 font-mono whitespace-pre-line">
            {`[단어장 제목]\napple | 사과\nbook | 책`}
          </div>
          <textarea
            value={pasted ?? text ?? ""}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={"[단어장 제목]\napple | 사과\nbook | 책"}
            rows={8}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none mb-2"
          />
          <button
            onClick={() => setApplied(pasted ?? text ?? "")}
            disabled={(pasted ?? text ?? "").trim() === ""}
            className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-bold disabled:opacity-40"
          >
            미리보기
          </button>
        </section>
      )}

      {check && !check.ok && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 text-sm">
          <div className="text-red-500 font-semibold mb-1">✗ {check.errors.length}개 오류 — 고친 뒤 다시 미리보기 하세요</div>
          {check.errors.map((e, i) => (
            <div key={i} className="text-red-400">
              ⚠ {e.line > 0 ? `${e.line}줄 ` : ""}
              {e.text && <span className="font-mono">{e.text}</span>} — {e.reason}
            </div>
          ))}
        </div>
      )}

      {check && check.ok && (
        <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="font-bold text-[#6c5ce7] text-lg">{check.title}</div>
          <div className="text-xs text-gray-500 mb-3">
            {pv === null
              ? "확인하는 중..."
              : !pv.ok
                ? "단어장을 확인하지 못했어요"
                : pv.listExists
                  ? "이미 있는 단어장에 더해요"
                  : "새 단어장을 만들어요"}
          </div>

          {pv && pv.ok && (
            <>
              <div className="text-sm font-semibold mb-1">추가할 단어 {pv.toAdd.length}개</div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto mb-3 border border-gray-100 rounded-xl">
                {check.words
                  .filter((w) => pv.toAdd.includes(w.word))
                  .map((w) => (
                    <div key={w.word} className="flex justify-between px-4 py-2 text-sm">
                      <span className="font-medium text-gray-800">{w.word}</span>
                      <span className="text-gray-400">{w.meaning}</span>
                    </div>
                  ))}
              </div>
              {pv.skipped.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  이미 있어 건너뛸 단어 {pv.skipped.length}개: {pv.skipped.join(", ")}
                </div>
              )}
            </>
          )}
          {check.duplicates.length > 0 && (
            <div className="text-xs text-gray-500 mb-2">
              목록 안에서 겹친 단어는 첫 번째만 넣어요: {check.duplicates.join(", ")}
            </div>
          )}
          {writeFailed && <div className="text-xs text-red-500 mb-2">넣지 못했어요. 잠시 뒤 다시 눌러 주세요.</div>}

          <button
            onClick={onInsert}
            disabled={!pv || !pv.ok || pv.toAdd.length === 0 || writing}
            className="w-full bg-[#6c5ce7] text-white py-3 rounded-xl font-bold text-base disabled:opacity-40"
          >
            {writing ? "넣는 중..." : pv && pv.ok && pv.toAdd.length === 0 ? "넣을 단어가 없어요" : "넣기"}
          </button>
        </section>
      )}

      {pending && (
        <PinModal
          title="뭉치 단어장"
          subtitle="비밀번호를 입력하면 넣어요"
          emoji="🔒"
          onSuccess={handlePinSuccess}
          onCancel={() => setPending(null)}
        />
      )}
      <Toast message={message} />
    </div>
  );
}
