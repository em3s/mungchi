// prebuild: sw.js의 CACHE_NAME에 빌드 타임스탬프 주입
const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "..", "public", "sw.js");
const sw = fs.readFileSync(swPath, "utf-8");
const stamp = Date.now().toString(36);
const updated = sw.replace(
  /const CACHE_NAME = "mungchi-[^"]*"/,
  `const CACHE_NAME = "mungchi-${stamp}"`
);
fs.writeFileSync(swPath, updated);
console.log(`sw.js stamped: mungchi-${stamp}`);
