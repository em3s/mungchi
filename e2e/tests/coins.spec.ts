import { test, expect } from "../fixtures";
import {
  mockFeatureFlags,
  mockTasks,
  mockCoinBalance,
  todayKST,
} from "../fixtures/mock-data";

const USER = "sihyun";

test.describe("초코 🍪 잔액", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs(USER);
  });

  test("초코 잔액 헤더에 표시", async ({ page, mocker }) => {
    mocker.mockAll([
      { table: "feature_flags", method: "GET", response: mockFeatureFlags(USER) },
      { table: "tasks", method: "GET", response: mockTasks(USER) },
      { table: "coin_balances", method: "GET", response: mockCoinBalance(USER, 15) },
    ]);

    await page.goto(`/${USER}`);

    await expect(page.getByText("🍪 15")).toBeVisible();
  });

  test("할일 완료 → +1🍪 + 토스트", async ({ page, mocker }) => {
    const tasks = mockTasks(USER);

    mocker.mockAll([
      { table: "feature_flags", method: "GET", response: mockFeatureFlags(USER) },
      { table: "tasks", method: "GET", response: tasks },
      { table: "coin_balances", method: "GET", response: mockCoinBalance(USER, 10) },
      { table: "tasks", method: "PATCH", response: tasks[0] },
      { table: "coin_transactions", method: "POST", response: [] },
      // After transaction, SUM query returns 11
      { table: "coin_transactions", method: "GET", response: [{ amount: 11 }] },
      { table: "coin_balances", method: "POST", response: mockCoinBalance(USER, 11) },
    ]);

    await page.goto(`/${USER}`);

    // Complete first task
    const todoItem = page.getByText("수학 공부").locator("..");
    await todoItem.locator("button").first().click();

    // Toast should show
    await expect(page.getByText("초코 +1! 🍪")).toBeVisible();
  });

  test("할일 취소 → -1🍪", async ({ page, mocker }) => {
    const tasks = mockTasks(USER);

    mocker.mockAll([
      { table: "feature_flags", method: "GET", response: mockFeatureFlags(USER) },
      { table: "tasks", method: "GET", response: tasks },
      { table: "coin_balances", method: "GET", response: mockCoinBalance(USER, 10) },
      { table: "tasks", method: "PATCH", response: tasks[2] }, // "일기 쓰기"
      { table: "coin_transactions", method: "POST", response: [] },
      { table: "coin_transactions", method: "GET", response: [{ amount: 9 }] },
      { table: "coin_balances", method: "POST", response: mockCoinBalance(USER, 9) },
    ]);

    await page.goto(`/${USER}`);

    // Click the completed task's checkbox → confirm modal
    const doneItem = page.getByText("일기 쓰기").locator("..");
    await doneItem.locator("button").first().click();

    await expect(page.getByText("아직 안 했어요?")).toBeVisible();
    await page.getByText("아직 안했어요").click();

    // Balance should update to 9
    await expect(page.getByText("🍪 9")).toBeVisible();
  });

  test("coins 피쳐 비활성 → 잔액 미표시", async ({ page, mocker }) => {
    mocker.mockAll([
      {
        table: "feature_flags",
        method: "GET",
        response: mockFeatureFlags(USER, { coins: false }),
      },
      { table: "tasks", method: "GET", response: mockTasks(USER) },
    ]);

    await page.goto(`/${USER}`);

    // Header should show name but no coin badge
    await expect(page.getByText("시현")).toBeVisible();
    await expect(page.getByText("🍪")).not.toBeVisible();
  });
});
