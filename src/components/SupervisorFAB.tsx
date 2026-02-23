"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CHILDREN } from "@/lib/constants";
import {
  ALL_FEATURES,
  getFeatureState,
  setFeatureOverride,
  loadFeatureFlags,
  type FeatureKey,
} from "@/lib/features";

const SESSION_KEY = "mungchi_session";
const ADMIN_KEY = "mungchi_admin";
const SUPERVISOR_KEY = "mungchi_supervisor";

const FEATURE_EMOJI: Record<string, string> = {
  map: "🌟",
  star: "⭐",
  coins: "🍬",
  vocab: "📖",
};

interface SupervisorFABProps {
  currentChildId?: string;
}

export function SupervisorFAB({ currentChildId }: SupervisorFABProps) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [showFlags, setShowFlags] = useState(false);
  const [featureStates, setFeatureStates] = useState<
    Record<string, Record<string, { effective: boolean; override: boolean | undefined }>>
  >({});
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SUPERVISOR_KEY) === "true") {
      setActive(true);
    }
  }, []);

  function loadStates() {
    const states: typeof featureStates = {};
    for (const child of CHILDREN) {
      states[child.id] = {};
      for (const f of ALL_FEATURES) {
        states[child.id][f.key] = getFeatureState(child.id, f.key);
      }
    }
    setFeatureStates(states);
  }

  function handleToggle(childId: string, feature: FeatureKey) {
    const current = featureStates[childId]?.[feature];
    const newValue = !current?.effective;
    setFeatureOverride(childId, feature, newValue);
    loadStates();
  }

  function handleClearOverride(childId: string, feature: FeatureKey) {
    setFeatureOverride(childId, feature, null);
    loadStates();
  }

  function handleOpenMenu() {
    setOpen(true);
    loadFeatureFlags().then(() => loadStates());
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!active) return null;

  const isAdmin = !currentChildId;

  function handleNavigateChild(childId: string) {
    localStorage.setItem(SESSION_KEY, childId);
    localStorage.removeItem(ADMIN_KEY);
    setOpen(false);
    router.push(`/${childId}`);
  }

  function handleNavigateAdmin() {
    localStorage.setItem(ADMIN_KEY, "true");
    localStorage.removeItem(SESSION_KEY);
    setOpen(false);
    router.push("/admin");
  }

  return (
    <div
      ref={fabRef}
      className={`fixed right-4 z-50 flex flex-col items-end gap-2 ${
        isAdmin ? "bottom-6" : "bottom-24 md:bottom-28"
      }`}
    >
      {open && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden min-w-[160px]">
          {CHILDREN.map((child) => {
            const isCurrent = child.id === currentChildId;
            return (
              <button
                key={child.id}
                onClick={() => handleNavigateChild(child.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold border-b border-gray-100 transition-colors ${
                  isCurrent
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                }`}
              >
                <span className="text-lg">{child.emoji}</span>
                <span>{child.name}</span>
                {isCurrent && (
                  <span className="ml-auto text-[0.65rem] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full">
                    현재
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={handleNavigateAdmin}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold border-b border-gray-100 transition-colors ${
              isAdmin
                ? "bg-purple-50 text-purple-700"
                : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span>관리</span>
            {isAdmin && (
              <span className="ml-auto text-[0.65rem] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full">
                현재
              </span>
            )}
          </button>
          {/* Feature Flags Toggle */}
          <button
            onClick={() => setShowFlags(!showFlags)}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="text-lg">🚩</span>
            <span>Feature Flags</span>
            <span className="ml-auto text-gray-400 text-xs">
              {showFlags ? "▲" : "▼"}
            </span>
          </button>
          {showFlags && (
            <div className="px-3 pb-3">
              {CHILDREN.map((child) => (
                <div key={child.id} className="mt-2">
                  <div className="text-[0.65rem] font-bold text-gray-400 uppercase mb-1">
                    {child.emoji} {child.name}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {ALL_FEATURES.map((f) => {
                      const state = featureStates[child.id]?.[f.key];
                      const isOn = state?.effective ?? false;
                      const hasOverride = state?.override !== undefined;
                      return (
                        <div key={f.key} className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggle(child.id, f.key)}
                            className={`flex-1 flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg font-medium transition-colors ${
                              isOn
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <span>{FEATURE_EMOJI[f.key]}</span>
                            <span>{f.label}</span>
                            {hasOverride && (
                              <span className="ml-auto text-[0.6rem] bg-orange-100 text-orange-600 px-1 py-0.5 rounded">
                                override
                              </span>
                            )}
                          </button>
                          {hasOverride && (
                            <button
                              onClick={() =>
                                handleClearOverride(child.id, f.key)
                              }
                              className="text-[0.6rem] text-gray-400 hover:text-red-400 px-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => (open ? setOpen(false) : handleOpenMenu())}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl transition-all ${
          open
            ? "bg-gray-600 text-white rotate-45"
            : "bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-900"
        }`}
      >
        {open ? "✕" : "🔧"}
      </button>
    </div>
  );
}
