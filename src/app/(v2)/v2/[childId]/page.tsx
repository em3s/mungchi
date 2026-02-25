"use client";

export default function V2DashboardPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        v2 대시보드
      </h1>
      <p style={{ color: "#888" }}>
        독립 루트 레이아웃에서 동작 중 — CSS 완전 격리됨
      </p>
      <p style={{ color: "#888", marginTop: 8 }}>
        여기에 Konsta UI 등 어떤 프레임워크든 자유롭게 사용 가능
      </p>
    </div>
  );
}
