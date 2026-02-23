"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CHILDREN } from "@/lib/constants";

const SESSION_KEY = "mungchi_session";
const ADMIN_KEY = "mungchi_admin";
const SUPERVISOR_KEY = "mungchi_supervisor";

interface SupervisorFABProps {
  currentChildId?: string;
}

export function SupervisorFAB({ currentChildId }: SupervisorFABProps) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SUPERVISOR_KEY) === "true") {
      setActive(true);
    }
  }, []);

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
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition-colors ${
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
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
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
