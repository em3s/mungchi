"use client";

import { useState, useCallback, useEffect } from "react";
import { USERS } from "@/lib/constants";
import {
  ALL_FEATURES,
  getFeatureState,
  setFeatureFlag,
  loadFeatureFlags,
  type FeatureKey,
} from "@/lib/features";

interface Props {
  showToast: (msg: string) => void;
}

export function AdminFeatureFlags({ showToast }: Props) {
  const [flagsLoaded, setFlagsLoaded] = useState(false);
  const [, setFlagTick] = useState(0);

  const reloadFlags = useCallback(async () => {
    await loadFeatureFlags();
    setFlagTick((t) => t + 1);
  }, []);

  useEffect(() => {
    reloadFlags().then(() => setFlagsLoaded(true));
  }, [reloadFlags]);

  const toggleDbFlag = useCallback(
    async (childId: string, feature: FeatureKey) => {
      const state = getFeatureState(childId, feature);
      const ok = await setFeatureFlag(childId, feature, !state.db);
      if (ok) {
        setFlagTick((t) => t + 1);
        showToast("피쳐플래그 변경됨");
      } else {
        showToast("변경 실패");
      }
    },
    [showToast]
  );

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      <h2 className="text-lg font-bold mb-4">🚩 피쳐플래그</h2>
      {!flagsLoaded ? (
        <div className="text-sm text-gray-400">불러오는 중...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {USERS.map((child) => (
            <div key={child.id} className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600 w-16 shrink-0">
                {child.emoji} {child.name}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {ALL_FEATURES.map((feat) => {
                  const state = getFeatureState(child.id, feat.key);
                  return (
                    <button
                      key={feat.key}
                      onClick={() => toggleDbFlag(child.id, feat.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        state.db
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {feat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
