import { headers } from "next/headers";
import { TopTabs } from "@/components/TopTabs";
import { resolveOrigin } from "@/lib/import/origin";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI로 단어 넣기 · 뭉치" };

// Gemini 커넥터(MCP) 사용법. 비밀값은 없다(주소만).
export default async function AiPage() {
  const h = await headers();
  const mcpUrl = `${resolveOrigin((n) => h.get(n))}/api/mcp`;
  const card = "bg-white rounded-2xl p-5 shadow-sm mb-4";
  const step = "flex gap-3 py-2";
  const num = "shrink-0 w-6 h-6 rounded-full bg-[#6c5ce7] text-white text-xs font-bold flex items-center justify-center mt-0.5";
  return (
    <div className="max-w-[640px] mx-auto px-4 pt-4 pb-20">
      <TopTabs />
      <h1 className="text-xl font-extrabold mb-1">🤖 AI로 단어 넣기</h1>
      <p className="text-sm text-gray-500 mb-4">Gemini 에 단어장 사진을 주면, Gemini 가 정리해서 뭉치에 바로 넣어요.</p>

      <section className={card}>
        <h2 className="font-bold mb-2">📷 이렇게 써요</h2>
        <div className={step}><span className={num}>1</span><span>Gemini 앱에서 새 대화를 열어요.</span></div>
        <div className={step}><span className={num}>2</span><span>단어장(시험지) 사진을 올려요.</span></div>
        <div className={step}><span className={num}>3</span><span><b>@뭉치</b> 를 붙여서 말해요. 예: <code className="bg-gray-100 px-1 rounded">@뭉치 이 단어장 넣어 줘</code> · 제목을 정하려면 <code className="bg-gray-100 px-1 rounded">제목은 Day 3</code></span></div>
        <div className={step}><span className={num}>4</span><span>Gemini 가 정리한 목록을 보여 주고 &ldquo;N개 넣었어요&rdquo; 하면 끝! 뭉치 단어장 <b>맨 위</b>에 새 단어장이 생겨요.</span></div>
        <ul className="text-xs text-gray-500 mt-2 list-disc pl-5 space-y-1">
          <li>넣을 때마다 새 단어장이 생겨요. 같은 제목이어도 따로 만들어져요.</li>
          <li>한 번에 100개까지. 더 많으면 Gemini 가 나눠서 넣어요.</li>
          <li>AI 는 단어를 고치거나 지우지 못해요. 고칠 땐 뭉치에서 직접 해요.</li>
        </ul>
      </section>

      <section className={card}>
        <h2 className="font-bold mb-2">🔗 처음 한 번만: 연결하기 (보호자)</h2>
        <div className={step}><span className={num}>1</span><span>PC 에서 <b>gemini.google.com/customize/connectors</b> 를 열어요(Gemini → 설정 → 커넥터).</span></div>
        <div className={step}><span className={num}>2</span><span><b>+ Custom</b> 을 누르고 아래 주소를 넣어요. 이름은 <b>뭉치</b>.</span></div>
        <div className="my-2 font-mono text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 break-all select-all">{mcpUrl}</div>
        <div className={step}><span className={num}>3</span><span>&ldquo;뭉치 단어장 연결&rdquo; 화면에서 <b>연결 비밀번호</b>를 넣고 [연결하기].</span></div>
        <div className={step}><span className={num}>4</span><span>커넥터 목록에 <b>뭉치</b> 가 보이면 끝. iPad Gemini 앱에서도 바로 쓸 수 있어요.</span></div>
      </section>

      <section className={card}>
        <h2 className="font-bold mb-2">🆘 안 될 때</h2>
        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
          <li>Gemini 가 &ldquo;뭉치&rdquo; 를 모르면: 메시지에 <b>@뭉치</b> 를 붙였는지 확인해요.</li>
          <li>&ldquo;넣지 않았어요. 고칠 곳&rdquo; 이 나오면: Gemini 에게 &ldquo;고쳐서 다시 넣어 줘&rdquo; 라고 해요.</li>
          <li>연결이 끊겼다고 나오면: 위 &ldquo;연결하기&rdquo; 를 다시 해요.</li>
          <li>AI 없이 넣으려면: 🔧 만들기 탭에서 붙여넣기로 넣을 수 있어요.</li>
        </ul>
      </section>
    </div>
  );
}
