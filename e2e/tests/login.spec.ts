import { test, expect } from "../fixtures";
import { enterPin } from "../helpers/pin";
import { mockFeatureFlags, mockTasks, mockCoinBalance } from "../fixtures/mock-data";

test.describe("로그인 플로우", () => {
  test("홈에 4명 유저 표시", async ({ page, mocker }) => {
    await page.goto("/");

    await expect(page.getByText("🍡 뭉치")).toBeVisible();
    await expect(page.getByText("누구의 할일을 볼까요?")).toBeVisible();

    for (const name of ["시현", "미송", "아빠", "엄마"]) {
      await expect(page.locator(`button:has-text("${name}")`)).toBeVisible();
    }
  });

  test("유저 클릭 → PIN 모달 열림", async ({ page, mocker }) => {
    await page.goto("/");

    await page.locator('button:has-text("시현")').click();

    await expect(page.getByText("비밀번호를 입력하세요")).toBeVisible();
    await expect(page.getByText("취소")).toBeVisible();
    // PIN dots should be visible
    await expect(page.locator(".rounded-full.border-\\[2\\.5px\\]").first()).toBeVisible();
  });

  test("올바른 PIN → 대시보드 리다이렉트", async ({ page, mocker }) => {
    mocker.mockAll([
      { table: "feature_flags", method: "GET", response: mockFeatureFlags("sihyun") },
      { table: "tasks", method: "GET", response: mockTasks("sihyun") },
      { table: "coin_balances", method: "GET", response: mockCoinBalance("sihyun", 10) },
    ]);

    await page.goto("/");
    await page.locator('button:has-text("시현")').click();
    await enterPin(page);

    await page.waitForURL("**/sihyun");
    await expect(page.getByText("시현")).toBeVisible();
  });

  test("틀린 PIN → 에러 메시지 + 초기화", async ({ page, mocker }) => {
    await page.goto("/");
    await page.locator('button:has-text("시현")').click();

    // Enter wrong PIN "123456"
    for (const d of "123456") {
      await page.locator(`button:has-text("${d}")`).first().click();
    }

    await expect(page.getByText("비밀번호가 틀렸어요")).toBeVisible();
  });

  test("취소 → 모달 닫힘", async ({ page, mocker }) => {
    await page.goto("/");
    await page.locator('button:has-text("시현")').click();

    await expect(page.getByText("비밀번호를 입력하세요")).toBeVisible();
    await page.getByText("취소").click();

    await expect(page.getByText("비밀번호를 입력하세요")).not.toBeVisible();
  });

  test("기존 세션 → 자동 리다이렉트", async ({ page, mocker, loginAs }) => {
    mocker.mockAll([
      { table: "feature_flags", method: "GET", response: mockFeatureFlags("sihyun") },
      { table: "tasks", method: "GET", response: mockTasks("sihyun") },
      { table: "coin_balances", method: "GET", response: mockCoinBalance("sihyun", 5) },
    ]);

    await loginAs("sihyun");
    await page.goto("/");

    await page.waitForURL("**/sihyun");
    await expect(page.getByText("시현")).toBeVisible();
  });

  test("세션 없이 직접 URL → PIN 모달 표시", async ({ page, mocker }) => {
    mocker.mockAll([
      { table: "feature_flags", method: "GET", response: mockFeatureFlags("sihyun") },
      { table: "tasks", method: "GET", response: [] },
    ]);

    await page.goto("/sihyun");

    // Layout shows PIN modal when no session
    await expect(page.getByText("비밀번호를 입력하세요")).toBeVisible();

    // Cancel → redirect to home
    await page.getByText("취소").click();
    await page.waitForURL("/");
  });
});
