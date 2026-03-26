import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "Missing image data" }, { status: 400 });
  }

  const prompt = `이 이미지는 영어 단어 시험지야. 영어 단어와 한국어 뜻을 추출해줘.

다음 형식으로만 답해줘 (다른 말 없이):
[단어장 제목]
영어단어 | 한국어뜻
영어단어 | 한국어뜻

- 제목은 시험지 제목이나 날짜. 없으면 "단어장"으로.
- 영어 단어는 소문자로.
- 한 줄에 단어 하나씩.
- | 구분자 사용.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg = err?.error?.message ?? err?.error ?? res.statusText;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return NextResponse.json({ text });
}
