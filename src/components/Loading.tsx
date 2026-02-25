export function Loading() {
  return (
    <div className="animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between py-4">
        <div className="h-7 w-28 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-7 w-16 bg-gray-100 rounded-full animate-pulse" />
      </div>

      {/* 프로그레스 + 캘린더 영역 */}
      <div className="flex gap-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2 py-2">
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] mb-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`w${i}`} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* 할일 리스트 */}
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white rounded-[14px] px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
          >
            <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 h-5 bg-gray-200 rounded animate-pulse" style={{ width: `${50 + i * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
