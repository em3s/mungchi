import { test, expect } from "../fixtures";
import {
  mockFeatureFlags,
  mockTasks,
  mockTask,
  mockCoinBalance,
  todayKST,
} from "../fixtures/mock-data";

const USER = "sihyun";

/** Standard mocks for dashboard tests */
function dashboardMocks(
  mocker: Parameters<Parameters<typeof test>[2]>[0]["mocker"],
  taskOverrides?: Parameters<typeof mockTasks>[2],
) {
  const tasks = taskOverrides
    ? mockTasks(USER, undefined, taskOverrides)
    : mockTasks(USER);

  mocker.mockAll([
    { table: "feature_flags", method: "GET", response: mockFeatureFlags(USER) },
    { table: "tasks", method: "GET", response: tasks },
    { table: "coin_balances", method: "GET", response: mockCoinBalance(USER, 10) },
    { table: "coin_transactions", method: "POST", response: [] },
    { table: "coin_transactions", method: "GET", response: [{ amount: 10 }] },
    {
      table: "coin_balances",
      method: "POST",
      response: mockCoinBalance(USER, 10),
    },
  ]);

  return tasks;
}

test.describe("대시보드 할일", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs(USER);
  });

  test("오늘 할일 표시 (미완/완료 섹션 분리)", async ({ page, mocker }) => {
    dashboardMocks(mocker);
    await page.goto(`/${USER}`);

    // Todo section
    await expect(page.getByText("할 일 (2)")).toBeVisible();
    await expect(page.getByText("수학 공부")).toBeVisible();
    await expect(page.getByText("영어 읽기")).toBeVisible();

    // Done section
    await expect(page.getByText("완료 (1)")).toBeVisible();
    await expect(page.getByText("일기 쓰기")).toBeVisible();
  });

  test("빈 상태 → 빈 메시지", async ({ page, mocker }) => {
    mocker.mockAll([
      { table: "feature_flags", method: "GET", response: mockFeatureFlags(USER) },
      { table: "tasks", method: "GET", response: [] },
      { table: "coin_balances", method: "GET", response: mockCoinBalance(USER, 0) },
    ]);

    await page.goto(`/${USER}`);

    await expect(
      page.getByText("오늘 할일이 없어요. 추가해보세요!"),
    ).toBeVisible();
  });

  test("할일 완료 토글 → PATCH + UI 이동", async ({ page, mocker }) => {
    const tasks = dashboardMocks(mocker);

    // Mock the PATCH for toggle
    mocker.mock("tasks", "PATCH", tasks[0]);
    mocker.captureWrite("tasks", "PATCH");

    await page.goto(`/${USER}`);

    // Click first uncompleted task's checkbox and wait for PATCH
    const todoItem = page.getByText("수학 공부").locator("..");
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/rest/v1/tasks") && r.request().method() === "PATCH"),
      todoItem.locator("button").first().click(),
    ]);

    // Verify PATCH was sent
    const captured = mocker.getCaptured("tasks", "PATCH");
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].body).toMatchObject({ completed: true });
  });

  test("완료 취소 → 확인 모달 → PATCH", async ({ page, mocker }) => {
    const tasks = dashboardMocks(mocker);

    mocker.mock("tasks", "PATCH", tasks[2]); // "일기 쓰기" (completed)
    mocker.captureWrite("tasks", "PATCH");

    await page.goto(`/${USER}`);

    // Click the completed task's checkbox → confirm modal
    const doneItem = page.getByText("일기 쓰기").locator("..");
    await doneItem.locator("button").first().click();

    // Confirm modal should appear
    await expect(page.getByText("아직 안 했어요?")).toBeVisible();

    // Click confirm and wait for PATCH
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/rest/v1/tasks") && r.request().method() === "PATCH"),
      page.getByText("아직 안했어요").click(),
    ]);

    // Verify PATCH was sent
    const captured = mocker.getCaptured("tasks", "PATCH");
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].body).toMatchObject({ completed: false });
  });

  test("할일 추가 → POST + 목록에 추가", async ({ page, mocker }) => {
    dashboardMocks(mocker);

    const newTask = mockTask({
      user_id: USER,
      title: "새 할일",
      date: todayKST(),
    });
    mocker.mock("tasks", "POST", newTask);
    mocker.captureWrite("tasks", "POST");

    await page.goto(`/${USER}`);

    // Click "+ 추가" button
    await page.getByText("+ 추가").click();

    // Fill in task title
    await page.locator('input[placeholder="할일을 입력하세요"]').fill("새 할일");

    // Click submit and wait for POST
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/rest/v1/tasks") && r.request().method() === "POST"),
      page.locator("form").locator('button:has-text("추가")').click(),
    ]);

    // Verify POST was sent
    const captured = mocker.getCaptured("tasks", "POST");
    expect(captured.length).toBeGreaterThan(0);

    // New task should appear in list
    await expect(page.getByText("새 할일")).toBeVisible();
  });

  test("할일 삭제 → 확인 모달 → DELETE", async ({ page, mocker }) => {
    dashboardMocks(mocker);

    mocker.mock("tasks", "DELETE", []);
    mocker.captureWrite("tasks", "DELETE");

    await page.goto(`/${USER}`);

    // Click delete (✕) on first task
    const taskItem = page.getByText("수학 공부").locator("..");
    await taskItem.locator('button:has-text("✕")').click();

    // Confirm modal
    await expect(page.getByText("정말 지울까요?")).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/rest/v1/tasks") && r.request().method() === "DELETE"),
      page.getByText("지울래요").click(),
    ]);

    // Verify DELETE was sent
    const captured = mocker.getCaptured("tasks", "DELETE");
    expect(captured.length).toBeGreaterThan(0);
  });

  test("전체 완료 → '모두 완료! 🎉' 메시지", async ({ page, mocker }) => {
    // All tasks completed
    mocker.mockAll([
      { table: "feature_flags", method: "GET", response: mockFeatureFlags(USER) },
      {
        table: "tasks",
        method: "GET",
        response: mockTasks(USER, undefined, [
          { title: "완료된 할일", completed: true, completed_at: new Date().toISOString() },
        ]),
      },
      { table: "coin_balances", method: "GET", response: mockCoinBalance(USER, 10) },
    ]);

    await page.goto(`/${USER}`);

    await expect(page.getByText("모두 완료! 🎉")).toBeVisible();
  });
});
