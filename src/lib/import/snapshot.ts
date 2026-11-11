// [넣기]를 누른 순간의 검사 통과 목록을 고정해 두는 값.
// PIN 을 기다리는 동안 링크(fragment)가 바뀌면 key 가 달라져 스냅숏은 무효가 된다.
export interface ImportSnapshot {
  key: string;
  title: string;
  words: { word: string; meaning: string }[];
}

export function makeKey(title: string, words: { word: string }[]): string {
  return `${title}\u0000${words.map((w) => w.word).join("\u0001")}`;
}

/** 현재 key 와 같을 때만 스냅숏을 돌려준다. 다르면 null(PIN 을 닫고 미리보기를 새로 그린다). */
export function activeSnapshot(snap: ImportSnapshot | null, currentKey: string | null): ImportSnapshot | null {
  return snap !== null && currentKey !== null && snap.key === currentKey ? snap : null;
}
