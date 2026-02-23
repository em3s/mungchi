import { test as base } from "@playwright/test";
import { SupabaseMocker } from "./supabase-mocker";

type Fixtures = {
  mocker: SupabaseMocker;
  loginAs: (userId: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  mocker: async ({ page }, use) => {
    const mocker = new SupabaseMocker(page);
    await mocker.setup();
    await use(mocker);
    await mocker.teardown();
  },

  loginAs: async ({ page }, use) => {
    const fn = async (userId: string) => {
      await page.addInitScript((uid) => {
        localStorage.setItem("mungchi_session", uid);
      }, userId);
    };
    await use(fn);
  },
});

export { expect } from "@playwright/test";
