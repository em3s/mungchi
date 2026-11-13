// 뭉치 MCP 서버(JSON-RPC, Streamable HTTP 의 단일 JSON 응답 방식). 상태 없음.
// 도구: 단어장 목록 보기(읽기), 단어 넣기(추가만: 수정·삭제 없음).
import { validateImport } from "@/lib/import/validate";
import type { ParsedBulk } from "@/lib/import/parse";

export interface McpDeps {
  listLists(): Promise<{ name: string; count: number }[]>;
  addWords(
    title: string,
    words: { word: string; meaning: string }[],
  ): Promise<{ ok: true; listCreated: boolean; added: string[]; skipped: string[] } | { ok: false }>;
}

export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = `뭉치는 아이들의 영어 단어장 앱입니다. 사용자가 단어장(시험지) 사진을 주고 "뭉치에 넣어 줘"라고 하면:
1) 사진을 읽어 단어장 제목과 "영어 | 한글 뜻" 목록으로 정리합니다(규칙은 add_words 설명).
2) 정리한 목록을 사용자에게 먼저 보여 줍니다.
3) add_words 로 넣고, 결과(새로 넣은 단어 수, 건너뛴 단어)를 알려 줍니다.
단어를 고치거나 지우는 기능은 없습니다. 고칠 것이 있으면 뭉치 앱의 관리 화면에서 하라고 안내합니다.`;

const ADD_DESC = `뭉치 단어장에 단어를 넣습니다(추가만). 같은 제목의 단어장이 있으면 거기에 이어 붙이고, 없으면 새로 만듭니다. 이미 있는 단어는 건너뜁니다.
정리 규칙(초등/리더스북 영어 단어 시험지):
- title: 단어장 제목 1~50자. 시험지의 책 제목·Day·Unit, 사용자가 정해 주면 그것.
- word: 영어로 시작, 영어·숫자·공백과 ' . , - / ~ ↔ ( ) ! ? & ; : 만, 100자 이하. 원형/과거형·단수/복수·유의어는 " / " (예: gather / gathered), 반의어는 " ↔ " (예: wrap ↔ unwrap).
- meaning: 한글 뜻 1~200자, 한 줄. 같은 방식으로 " / ", " ↔ " 를 맞춥니다(예: 모으다 / 모았다).
- 의미나 어간이 완전히 겹치는 항목(send 와 send / sent)은 더 포괄적인 것만 남깁니다.
- OCR 깨짐·번짐·명백한 맞춤법 오류는 고치고, 시험지 문항 수와 단어 수가 같은지 확인합니다.
- 한 번에 100개까지. 더 많으면 나눠서 부릅니다.
검사에 걸리면 아무것도 넣지 않고 줄별 오류를 돌려줍니다. 고쳐서 다시 부르세요.`;

export const TOOLS = [
  {
    name: "list_vocab_lists",
    title: "단어장 목록 보기",
    description: "뭉치의 단어장 제목과 단어 수를 봅니다(읽기만). 이어 붙일 단어장 제목을 확인할 때 씁니다.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "add_words",
    title: "단어 넣기",
    description: ADD_DESC,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "단어장 제목(1~50자)" },
        words: {
          type: "array",
          maxItems: 100,
          items: {
            type: "object",
            properties: {
              word: { type: "string", description: "영어(예: clutch / clutched)" },
              meaning: { type: "string", description: "한글 뜻(예: 움켜잡다 / 움켜잡았다)" },
            },
            required: ["word", "meaning"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "words"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
];

type Json = Record<string, unknown>;
type RpcId = string | number | null;

const ok = (id: RpcId, result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: RpcId, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });
const text = (t: string, isError = false) => ({ content: [{ type: "text", text: t }], isError });

/** 도구 인자를 검사기 입력으로 바꾼다. 줄 번호는 단어 순서(1부터). */
export function toParsed(args: unknown): ParsedBulk | string {
  const a = (args ?? {}) as Json;
  if (typeof a.title !== "string") return "title 이 필요해요";
  if (!Array.isArray(a.words)) return "words 배열이 필요해요";
  if (a.words.length > 200) return "words 가 너무 많아요(한 번에 100개)";
  const rows: ParsedBulk["rows"] = [];
  const errors: ParsedBulk["errors"] = [];
  a.words.forEach((w, i) => {
    const o = (w ?? {}) as Json;
    const word = typeof o.word === "string" ? o.word.trim().toLowerCase() : "";
    const meaning = typeof o.meaning === "string" ? o.meaning.trim() : "";
    if (word && meaning) rows.push({ line: i + 1, word, meaning });
    else errors.push({ line: i + 1, text: word, reason: "단어나 뜻이 비었어요" });
  });
  return { title: a.title.trim(), titleLine: 0, rows, errors };
}

async function callTool(name: unknown, args: unknown, deps: McpDeps) {
  if (name === "list_vocab_lists") {
    const lists = await deps.listLists();
    if (lists.length === 0) return text("단어장이 없어요.");
    return text(lists.map((l) => `- ${l.name} (${l.count}개)`).join("\n"));
  }
  if (name === "add_words") {
    const parsed = toParsed(args);
    if (typeof parsed === "string") return text(parsed, true);
    const check = validateImport(parsed);
    if (!check.ok) {
      const lines = check.errors.map((e) => (e.line > 0 ? `${e.line}번째 단어 ${e.text}: ${e.reason}` : e.reason));
      return text(`넣지 않았어요. 고칠 곳:\n${lines.join("\n")}`, true);
    }
    const r = await deps.addWords(check.title, check.words);
    if (!r.ok) return text("저장하지 못했어요. 잠시 뒤 다시 해 주세요.", true);
    const parts = [
      `단어장 "${check.title}"${r.listCreated ? "을 새로 만들고" : "에"} ${r.added.length}개를 넣었어요.`,
    ];
    if (r.skipped.length) parts.push(`이미 있어서 건너뜀 ${r.skipped.length}개: ${r.skipped.join(", ")}`);
    if (check.duplicates.length) parts.push(`목록 안에서 겹쳐 하나만 넣음: ${check.duplicates.join(", ")}`);
    return text(parts.join("\n"));
  }
  return null;
}

/** JSON-RPC 메시지 하나를 처리한다. 알림(id 없음)이면 null(=202). */
export async function handleRpc(msg: unknown, deps: McpDeps): Promise<Json | null> {
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) return err(null, -32600, "Invalid Request");
  const m = msg as Json;
  const id = (m.id ?? null) as RpcId;
  const isNotification = !("id" in m);
  if (m.jsonrpc !== "2.0" || typeof m.method !== "string") return err(id, -32600, "Invalid Request");
  if (isNotification) return null;
  const params = (m.params ?? {}) as Json;

  switch (m.method) {
    case "initialize": {
      const asked = params.protocolVersion;
      const version = typeof asked === "string" && PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0];
      return ok(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "mungchi", title: "뭉치 단어장", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const r = await callTool(params.name, params.arguments, deps);
      return r ? ok(id, r) : err(id, -32602, `Unknown tool: ${String(params.name)}`);
    }
    default:
      return err(id, -32601, "Method not found");
  }
}
