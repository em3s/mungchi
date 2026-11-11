import { describe, expect, it } from "vitest";
import { activeSnapshot, makeKey } from "./snapshot";

const words = [{ word: "apple", meaning: "사과" }];

describe("snapshot", () => {
  it("makeKey differs by title and by words", () => {
    expect(makeKey("A", words)).not.toBe(makeKey("B", words));
    expect(makeKey("A", words)).not.toBe(makeKey("A", [{ word: "pear" }]));
    expect(makeKey("A", words)).toBe(makeKey("A", [{ word: "apple" }]));
  });
  it("is active only while the link content is unchanged", () => {
    const snap = { key: makeKey("A", words), title: "A", words };
    expect(activeSnapshot(snap, makeKey("A", words))).toBe(snap);
    expect(activeSnapshot(snap, makeKey("B", words))).toBeNull();
    expect(activeSnapshot(snap, null)).toBeNull();
    expect(activeSnapshot(null, makeKey("A", words))).toBeNull();
  });
  it("snapshot keeps the tapped words even if the live list changes", () => {
    const snap = { key: makeKey("A", words), title: "A", words: [...words] };
    const live = [{ word: "pear", meaning: "배" }];
    expect(snap.words).not.toEqual(live);
    expect(activeSnapshot(snap, makeKey("A", live))).toBeNull();
  });
});
