// 화면용 단어장 API. 로그인 세션(쿠키)이 있어야 한다. POST { op, ... }
import { isAuthed } from "@/lib/session";
import { DbUnavailable, addList, deleteList, getEntries, listLists, removeEntry, updateEntry } from "@/lib/db/vocab";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

export async function POST(req: Request) {
  if (!isAuthed(req)) return json({ error: "unauthorized" }, 401);
  let b: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 200_000) return json({ error: "too_large" }, 413);
    b = JSON.parse(raw);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  try {
    switch (b.op) {
      case "lists":
        return json({ lists: await listLists() });
      case "entries": {
        const listId = str(b.listId, 100);
        return listId ? json({ entries: await getEntries(listId) }) : json({ error: "bad_request" }, 400);
      }
      case "deleteList": {
        const listId = str(b.listId, 100);
        return listId ? json({ ok: await deleteList(listId) }) : json({ error: "bad_request" }, 400);
      }
      case "removeEntry": {
        const id = str(b.entryId, 100);
        return id ? json({ ok: await removeEntry(id) }) : json({ error: "bad_request" }, 400);
      }
      case "updateEntry": {
        const id = str(b.entryId, 100);
        const word = str(b.word, 200);
        const meaning = str(b.meaning, 500);
        return id && word && meaning ? json({ ok: await updateEntry(id, word, meaning) }) : json({ error: "bad_request" }, 400);
      }
      case "addList": {
        const title = str(b.title, 100);
        const words = Array.isArray(b.words) ? b.words : null;
        if (!title || !words || words.length === 0 || words.length > 1000) return json({ error: "bad_request" }, 400);
        const clean: { word: string; meaning: string }[] = [];
        for (const w of words as Record<string, unknown>[]) {
          const word = str(w?.word, 200);
          const meaning = str(w?.meaning, 500);
          if (!word || !meaning) return json({ error: "bad_request" }, 400);
          clean.push({ word, meaning });
        }
        return json(await addList(title, clean));
      }
      default:
        return json({ error: "unknown_op" }, 400);
    }
  } catch (e) {
    if (e instanceof DbUnavailable) return json({ error: "db_unavailable" }, 503);
    throw e;
  }
}
