import { headers } from "next/headers";
import { buildGuideText } from "@/lib/import/guide";
import { resolveOrigin } from "@/lib/import/origin";

export const dynamic = "force-dynamic";
export const metadata = { title: "뭉치 단어장 넣기 지침" };

export default async function GuidePage() {
  const h = await headers();
  const text = buildGuideText(resolveOrigin((n) => h.get(n)));
  return (
    <main className="max-w-[720px] mx-auto px-4 py-6">
      <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono">{text}</pre>
    </main>
  );
}
