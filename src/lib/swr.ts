import type { SWRConfiguration } from "swr";

export const swrDefaults: SWRConfiguration = {
  revalidateOnFocus: false, // iPad PWA — 불필요한 refetch 방지
  dedupingInterval: 30_000, // 30초 중복 요청 제거
};
