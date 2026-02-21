import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { PORT } from "./config.js";
import api from "./routes/api.js";
import { startScheduler } from "./sync/scheduler.js";

const app = new Hono();

// API 라우트
app.route("/api", api);

// 정적 파일 서빙
app.use("/*", serveStatic({ root: "./public" }));

// SPA 폴백 — public/index.html
app.get("*", serveStatic({ root: "./public", path: "index.html" }));

// 스케줄러 시작
startScheduler();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🍡 뭉치 서버 시작! http://localhost:${info.port}`);
});
