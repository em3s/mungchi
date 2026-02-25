"use client";

import { use } from "react";
import { USERS } from "@/lib/constants";

/**
 * [childId] 페이지에서 params → childId + user 추출.
 */
export function useUser(params: Promise<{ childId: string }>) {
  const { childId } = use(params);
  const user = USERS.find((u) => u.id === childId) ?? null;
  return { childId, user };
}
