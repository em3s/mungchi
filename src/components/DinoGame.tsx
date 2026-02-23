"use client";

import { useRef, useEffect, useCallback, useState } from "react";

// --- 게임 설정 ---
const W = 600;
const H = 200;
const GROUND_Y = 170;
const PLAYER_X = 60;
const PLAYER_SIZE = 30;
const JUMP_VEL = -11.5;
const GRAVITY = 0.55;
const INITIAL_SPEED = 3;
const SPEED_INC = 0.25;
const MAX_SPEED = 9;
const MIN_GAP = 90;
const MAX_GAP = 180;
const OBSTACLE_EMOJIS = ["🌵", "🪨", "📦"];

interface Obstacle {
  x: number;
  emoji: string;
  w: number;
  h: number;
}

interface DinoGameProps {
  playerEmoji: string;
  onGameStart: () => void;
  onGameOver: (score: number) => void;
}

export function DinoGame({ playerEmoji, onGameStart, onGameOver }: DinoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game state refs (avoid re-renders during game loop)
  const stateRef = useRef<"ready" | "playing" | "gameover">("ready");
  const playerY = useRef(GROUND_Y);
  const playerVY = useRef(0);
  const jumping = useRef(false);
  const obstacles = useRef<Obstacle[]>([]);
  const score = useRef(0);
  const speed = useRef(INITIAL_SPEED);
  const frame = useRef(0);
  const nextSpawn = useRef(100);
  const groundOffset = useRef(0);
  const rafId = useRef(0);
  const startedRef = useRef(false);

  const [displayState, setDisplayState] = useState<"ready" | "playing" | "gameover">("ready");

  // --- Canvas setup ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    // Draw initial frame
    drawReady(canvas);
  }, []);

  function drawReady(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    // Ground
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    // Player
    ctx.font = `${PLAYER_SIZE}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(playerEmoji, PLAYER_X, GROUND_Y);
  }

  // --- Game loop ---
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || stateRef.current !== "playing") return;

    frame.current++;

    // Speed increase
    speed.current = Math.min(MAX_SPEED, INITIAL_SPEED + Math.floor(score.current / 100) * SPEED_INC);

    // Player physics
    if (jumping.current) {
      playerVY.current += GRAVITY;
      playerY.current += playerVY.current;
      if (playerY.current >= GROUND_Y) {
        playerY.current = GROUND_Y;
        playerVY.current = 0;
        jumping.current = false;
      }
    }

    // Obstacles
    nextSpawn.current--;
    if (nextSpawn.current <= 0) {
      const emoji = OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)];
      obstacles.current.push({ x: W + 10, emoji, w: 24, h: 30 });
      nextSpawn.current = MIN_GAP + Math.floor(Math.random() * (MAX_GAP - MIN_GAP));
    }

    for (const o of obstacles.current) {
      o.x -= speed.current;
    }
    obstacles.current = obstacles.current.filter((o) => o.x > -40);

    // Collision (AABB with 6px padding for fairness)
    const px = PLAYER_X - PLAYER_SIZE / 2 + 6;
    const py = playerY.current - PLAYER_SIZE + 4;
    const pw = PLAYER_SIZE - 12;
    const ph = PLAYER_SIZE - 8;
    for (const o of obstacles.current) {
      const ox = o.x - o.w / 2 + 4;
      const oy = GROUND_Y - o.h;
      const ow = o.w - 8;
      const oh = o.h - 4;
      if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
        // Game over
        stateRef.current = "gameover";
        setDisplayState("gameover");
        onGameOver(score.current);
        cancelAnimationFrame(rafId.current);
        drawGameOver(ctx);
        return;
      }
    }

    // Score
    if (frame.current % 5 === 0) score.current++;

    // Ground offset
    groundOffset.current = (groundOffset.current + speed.current) % 20;

    // --- Draw ---
    ctx.clearRect(0, 0, W, H);

    // Ground
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    // Ground texture
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e5e7eb";
    for (let x = -groundOffset.current; x < W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 5);
      ctx.lineTo(x + 8, GROUND_Y + 5);
      ctx.stroke();
    }

    // Player
    const bobY = !jumping.current ? Math.sin(frame.current * 0.2) * 2 : 0;
    ctx.font = `${PLAYER_SIZE}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(playerEmoji, PLAYER_X, playerY.current + bobY);

    // Obstacles
    for (const o of obstacles.current) {
      ctx.font = `${o.h}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(o.emoji, o.x, GROUND_Y);
    }

    // Score
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#6b7280";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(String(score.current).padStart(5, "0"), W - 12, 10);

    rafId.current = requestAnimationFrame(gameLoop);
  }, [playerEmoji, onGameOver]);

  function drawGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, W, H);
  }

  // --- Input ---
  function handleInput(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    if (stateRef.current === "ready") {
      if (!startedRef.current) {
        startedRef.current = true;
        onGameStart();
      }
      stateRef.current = "playing";
      setDisplayState("playing");
      // First jump
      jumping.current = true;
      playerVY.current = JUMP_VEL;
      rafId.current = requestAnimationFrame(gameLoop);
      return;
    }
    if (stateRef.current === "playing" && !jumping.current) {
      jumping.current = true;
      playerVY.current = JUMP_VEL;
    }
  }

  // --- Reset ---
  function reset() {
    stateRef.current = "ready";
    startedRef.current = false;
    setDisplayState("ready");
    playerY.current = GROUND_Y;
    playerVY.current = 0;
    jumping.current = false;
    obstacles.current = [];
    score.current = 0;
    speed.current = INITIAL_SPEED;
    frame.current = 0;
    nextSpawn.current = 100;
    groundOffset.current = 0;
    cancelAnimationFrame(rafId.current);
    const canvas = canvasRef.current;
    if (canvas) drawReady(canvas);
  }

  // Cleanup
  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-[600px] mx-auto">
      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          style={{ width: W, height: H, maxWidth: "100%", touchAction: "none" }}
          className="block mx-auto rounded-2xl bg-white border border-gray-100 shadow-sm"
          onTouchStart={handleInput}
          onMouseDown={handleInput}
        />

        {/* Ready overlay */}
        {displayState === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-4xl mb-2">🏃</div>
            <div className="text-sm font-bold text-gray-500 bg-white/80 px-3 py-1 rounded-full">
              탭하면 시작!
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {displayState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 rounded-2xl">
            <div className="text-lg font-black text-gray-700 mb-1">게임 오버</div>
            <div className="text-3xl font-black text-[var(--accent,#6c5ce7)] mb-3">
              {score.current}점
            </div>
          </div>
        )}
      </div>

      {/* Game over buttons — outside canvas for reliable touch */}
      {displayState === "gameover" && (
        <div className="flex gap-3 mt-4 justify-center">
          <button
            onClick={() => {
              reset();
              // Trigger start on next tap via ready state
            }}
            className="px-5 py-2.5 rounded-xl bg-[var(--accent,#6c5ce7)] text-white font-bold text-sm active:opacity-80"
          >
            다시 하기 (1🍬)
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-600 font-bold text-sm active:opacity-80"
          >
            그만하기
          </button>
        </div>
      )}
    </div>
  );
}
