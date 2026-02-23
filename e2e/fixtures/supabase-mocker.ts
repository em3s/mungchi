import type { Page, Route } from "@playwright/test";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface MockEntry {
  table: string;
  method: HttpMethod;
  response: unknown;
  status?: number;
  matchFn?: (url: URL, headers: Record<string, string>) => boolean;
}

interface CapturedRequest {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Intercepts Supabase REST API calls at the network level.
 * Supabase JS client sends requests to /rest/v1/<table>
 */
export class SupabaseMocker {
  private page: Page;
  private mocks: MockEntry[] = [];
  private captures = new Map<string, CapturedRequest[]>();
  private active = false;

  constructor(page: Page) {
    this.page = page;
  }

  /** Register a mock response for a table + HTTP method */
  mock(
    table: string,
    method: HttpMethod,
    response: unknown,
    options?: {
      status?: number;
      matchFn?: (url: URL, headers: Record<string, string>) => boolean;
    },
  ) {
    this.mocks.push({
      table,
      method,
      response,
      status: options?.status,
      matchFn: options?.matchFn,
    });
    return this;
  }

  /** Register multiple mocks at once */
  mockAll(
    entries: Array<{
      table: string;
      method: HttpMethod;
      response: unknown;
      status?: number;
      matchFn?: (url: URL, headers: Record<string, string>) => boolean;
    }>,
  ) {
    for (const e of entries) {
      this.mock(e.table, e.method, e.response, {
        status: e.status,
        matchFn: e.matchFn,
      });
    }
    return this;
  }

  /** Capture write requests for later assertion */
  captureWrite(table: string, method: HttpMethod = "POST") {
    const key = `${method}:${table}`;
    this.captures.set(key, []);
    return this;
  }

  /** Get captured requests */
  getCaptured(table: string, method: HttpMethod = "POST"): CapturedRequest[] {
    return this.captures.get(`${method}:${table}`) ?? [];
  }

  /** Install route handlers */
  async setup() {
    if (this.active) return;
    this.active = true;

    // Intercept Supabase REST API
    await this.page.route("**/rest/v1/**", (route) =>
      this.handleRoute(route),
    );

    // Intercept calendar API
    await this.page.route("**/api/calendar*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
  }

  /** Remove route handlers */
  async teardown() {
    if (!this.active) return;
    this.active = false;
    await this.page.unroute("**/rest/v1/**");
    await this.page.unroute("**/api/calendar*");
  }

  private async handleRoute(route: Route) {
    const request = route.request();
    const method = request.method() as HttpMethod;
    const url = new URL(request.url());
    const headers = await request.allHeaders();

    // Extract table name from path: /rest/v1/<table>
    const pathParts = url.pathname.split("/rest/v1/");
    const table = pathParts[1]?.split("?")[0] ?? "";

    // Capture writes if registered
    const captureKey = `${method}:${table}`;
    if (this.captures.has(captureKey)) {
      let body: unknown = null;
      try {
        body = JSON.parse(request.postData() ?? "null");
      } catch {
        body = request.postData();
      }
      this.captures.get(captureKey)!.push({ url: url.toString(), method, body, headers });
    }

    // Find matching mock (last registered wins for specificity)
    const matching = [...this.mocks]
      .reverse()
      .find(
        (m) =>
          m.table === table &&
          m.method === method &&
          (!m.matchFn || m.matchFn(url, headers)),
      );

    if (matching) {
      const body =
        typeof matching.response === "string"
          ? matching.response
          : JSON.stringify(matching.response);
      await route.fulfill({
        status: matching.status ?? 200,
        contentType: "application/json",
        body,
      });
    } else {
      // Default: return empty array for GET, echo body for writes
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        });
      } else {
        const postData = request.postData();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: postData ?? "[]",
        });
      }
    }
  }
}
