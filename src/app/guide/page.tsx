import { headers } from "next/headers";
import { buildGuideText } from "@/lib/import/guide";

export const dynamic = "force-dynamic";
export const metadata = { title: "뭉치 단어장 넣기 지침" };

export default async function GuidePage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const text = buildGuideText(`${proto}://${host}`);
  return (
    <main className="max-w-[720px] mx-auto px-4 py-6">
      <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono">{text}</pre>
    </main>
  );
}
