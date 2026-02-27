"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useThemeOverride } from "@/hooks/useThemeOverride";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { useUser } from "@/hooks/useUser";
import { BottomNav } from "@/components/BottomNav";

// ── Web Audio API context (singleton) ──
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, type: OscillatorType, dur: number, gain = 0.3, delay = 0) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + dur);
}

function playNoise(dur: number, gain = 0.1, delay = 0) {
  const c = getCtx();
  const len = c.sampleRate * dur;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  src.connect(g); g.connect(c.destination);
  src.start(c.currentTime + delay);
}

// ── 효과음 ──
const synth = {
  correct() { playTone(880, "sine", 0.15, 0.3, 0); playTone(1174.66, "sine", 0.3, 0.3, 0.12); },
  wrong() { playTone(300, "square", 0.15, 0.15, 0); playTone(220, "square", 0.25, 0.15, 0.12); },
  coinPickup() { playTone(987.77, "sine", 0.08, 0.25, 0); playTone(1318.51, "sine", 0.08, 0.25, 0.07); playTone(1567.98, "sine", 0.2, 0.25, 0.14); },
  quizComplete() {
    playTone(523.25, "sine", 0.12, 0.25, 0); playTone(659.25, "sine", 0.12, 0.25, 0.1);
    playTone(783.99, "sine", 0.12, 0.25, 0.2); playTone(1046.5, "sine", 0.35, 0.3, 0.3);
    playTone(783.99, "sine", 0.12, 0.2, 0.3);
  },
  checkPop() { playTone(600, "sine", 0.06, 0.2, 0); playTone(900, "sine", 0.08, 0.15, 0.04); },
  coinDing() { playTone(1200, "sine", 0.25, 0.2, 0); },
  allClear() {
    playTone(523.25, "triangle", 0.15, 0.3, 0); playTone(659.25, "triangle", 0.15, 0.3, 0.12);
    playTone(783.99, "triangle", 0.15, 0.3, 0.24); playTone(1046.5, "triangle", 0.15, 0.3, 0.36);
    playTone(1318.51, "triangle", 0.4, 0.35, 0.48); playTone(783.99, "sine", 0.4, 0.15, 0.48);
    playTone(523.25, "sine", 0.4, 0.1, 0.48);
  },
  jump() {
    const c = getCtx(); const osc = c.createOscillator(); const g = c.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(300, c.currentTime); osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.12);
    g.gain.setValueAtTime(0.2, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    osc.connect(g); g.connect(c.destination); osc.start(c.currentTime); osc.stop(c.currentTime + 0.15);
  },
  gameOver() { playTone(440, "square", 0.2, 0.15, 0); playTone(330, "square", 0.2, 0.15, 0.2); playTone(220, "square", 0.4, 0.15, 0.4); },
  whack() { playNoise(0.08, 0.3, 0); playTone(200, "square", 0.1, 0.25, 0); playTone(100, "sine", 0.08, 0.2, 0.03); },
  goldenWhack() { playNoise(0.06, 0.25, 0); playTone(200, "square", 0.08, 0.2, 0); playTone(1200, "sine", 0.1, 0.2, 0.05); playTone(1600, "sine", 0.15, 0.25, 0.1); playTone(2000, "sine", 0.2, 0.2, 0.15); },
  badgeUnlock() { playTone(523.25, "sine", 0.1, 0.2, 0); playTone(659.25, "sine", 0.1, 0.2, 0.08); playTone(783.99, "sine", 0.1, 0.2, 0.16); playTone(1046.5, "sine", 0.1, 0.2, 0.24); playTone(1318.51, "sine", 0.3, 0.3, 0.32); playTone(1567.98, "sine", 0.2, 0.1, 0.4); },
  purchase() { playTone(800, "sine", 0.05, 0.2, 0); playTone(1000, "sine", 0.05, 0.2, 0.05); playTone(1200, "sine", 0.05, 0.2, 0.1); playNoise(0.08, 0.1, 0.15); playTone(1500, "sine", 0.2, 0.25, 0.18); },
};

// ── BGM 스케줄러 ──
type Note = { freq: number; dur: number; gain?: number; type?: OscillatorType };

// ── 합성 BGM 노트 배열 ──

// 공룡 달리기 BGM — 경쾌한 8비트 액션 (120 BPM, 8분음표=0.25s)
const DINO_BGM: Note[] = [
  { freq: 329.63, dur: 0.25 }, { freq: 329.63, dur: 0.25 }, { freq: 392.00, dur: 0.25 }, { freq: 329.63, dur: 0.25 },
  { freq: 523.25, dur: 0.25 }, { freq: 493.88, dur: 0.25 }, { freq: 440.00, dur: 0.25 }, { freq: 392.00, dur: 0.25 },
  { freq: 329.63, dur: 0.25 }, { freq: 392.00, dur: 0.25 }, { freq: 440.00, dur: 0.25 }, { freq: 392.00, dur: 0.25 },
  { freq: 329.63, dur: 0.25 }, { freq: 293.66, dur: 0.25 }, { freq: 261.63, dur: 0.50 },
  { freq: 392.00, dur: 0.25 }, { freq: 440.00, dur: 0.25 }, { freq: 523.25, dur: 0.25 }, { freq: 440.00, dur: 0.25 },
  { freq: 392.00, dur: 0.25 }, { freq: 329.63, dur: 0.25 }, { freq: 261.63, dur: 0.25 }, { freq: 329.63, dur: 0.25 },
  { freq: 440.00, dur: 0.25 }, { freq: 523.25, dur: 0.25 }, { freq: 659.25, dur: 0.25 }, { freq: 523.25, dur: 0.25 },
  { freq: 440.00, dur: 0.25 }, { freq: 392.00, dur: 0.25 }, { freq: 329.63, dur: 0.50 },
];

// 두더지 잡기 BGM — 통통 튀는 8비트 (130 BPM, 8분음표=0.23s)
const MOLE_BGM: Note[] = [
  { freq: 261.63, dur: 0.23 }, { freq: 329.63, dur: 0.23 }, { freq: 392.00, dur: 0.23 }, { freq: 523.25, dur: 0.23 },
  { freq: 440.00, dur: 0.23 }, { freq: 392.00, dur: 0.23 }, { freq: 329.63, dur: 0.23 }, { freq: 392.00, dur: 0.23 },
  { freq: 440.00, dur: 0.23 }, { freq: 523.25, dur: 0.23 }, { freq: 659.25, dur: 0.23 }, { freq: 523.25, dur: 0.23 },
  { freq: 440.00, dur: 0.23 }, { freq: 392.00, dur: 0.23 }, { freq: 329.63, dur: 0.46 },
  { freq: 392.00, dur: 0.23 }, { freq: 440.00, dur: 0.23 }, { freq: 523.25, dur: 0.23 }, { freq: 440.00, dur: 0.23 },
  { freq: 392.00, dur: 0.23 }, { freq: 329.63, dur: 0.23 }, { freq: 261.63, dur: 0.23 }, { freq: 329.63, dur: 0.23 },
  { freq: 523.25, dur: 0.23 }, { freq: 440.00, dur: 0.23 }, { freq: 392.00, dur: 0.23 }, { freq: 329.63, dur: 0.23 },
  { freq: 261.63, dur: 0.46 }, { freq: 0, dur: 0.23 }, { freq: 261.63, dur: 0.23 },
];

// 재즈 스윙 — G 도리안, 110 BPM, 스윙 8분음표 (long=0.36s, short=0.18s)
const JAZZ_BGM: Note[] = [
  // Phrase A
  { freq: 392.00, dur: 0.36 }, { freq: 440.00, dur: 0.18 },
  { freq: 466.16, dur: 0.36 }, { freq: 392.00, dur: 0.18 },
  { freq: 349.23, dur: 0.36 }, { freq: 329.63, dur: 0.18 },
  { freq: 293.66, dur: 0.54 },
  { freq: 440.00, dur: 0.36 }, { freq: 392.00, dur: 0.18 },
  { freq: 349.23, dur: 0.36 }, { freq: 392.00, dur: 0.18 },
  { freq: 440.00, dur: 0.36 }, { freq: 466.16, dur: 0.18 },
  { freq: 392.00, dur: 0.54 },
  // Phrase B (higher)
  { freq: 523.25, dur: 0.36 }, { freq: 466.16, dur: 0.18 },
  { freq: 440.00, dur: 0.36 }, { freq: 392.00, dur: 0.18 },
  { freq: 349.23, dur: 0.36 }, { freq: 293.66, dur: 0.18 },
  { freq: 261.63, dur: 0.54 },
  { freq: 0, dur: 0.18 },
  { freq: 293.66, dur: 0.36 }, { freq: 349.23, dur: 0.18 },
  { freq: 392.00, dur: 0.36 }, { freq: 440.00, dur: 0.18 },
  { freq: 392.00, dur: 0.54 }, { freq: 0, dur: 0.18 },
];

// 보스 배틀 — E 단조, 155 BPM, 긴장감 (16분음표=0.097s)
const BOSS_BGM: Note[] = [
  // Heavy riff
  { freq: 329.63, dur: 0.097 }, { freq: 0, dur: 0.097 },
  { freq: 329.63, dur: 0.097 }, { freq: 0, dur: 0.097 },
  { freq: 329.63, dur: 0.194 },
  { freq: 392.00, dur: 0.097 }, { freq: 0, dur: 0.097 },
  { freq: 329.63, dur: 0.194 },
  { freq: 277.18, dur: 0.097 }, // C#4 (tritone dissonance)
  { freq: 261.63, dur: 0.097 },
  { freq: 246.94, dur: 0.38 },
  // High response
  { freq: 659.25, dur: 0.097 }, { freq: 0, dur: 0.097 },
  { freq: 659.25, dur: 0.097 }, { freq: 0, dur: 0.097 },
  { freq: 659.25, dur: 0.194 },
  { freq: 783.99, dur: 0.097 }, { freq: 659.25, dur: 0.097 },
  { freq: 587.33, dur: 0.194 }, { freq: 523.25, dur: 0.194 },
  { freq: 493.88, dur: 0.38 },
  // Rising chromatic threat
  { freq: 329.63, dur: 0.097 }, { freq: 349.23, dur: 0.097 },
  { freq: 392.00, dur: 0.097 }, { freq: 440.00, dur: 0.097 },
  { freq: 493.88, dur: 0.097 }, { freq: 523.25, dur: 0.097 },
  { freq: 587.33, dur: 0.097 }, { freq: 659.25, dur: 0.097 },
  { freq: 783.99, dur: 0.194 }, { freq: 0, dur: 0.097 }, { freq: 659.25, dur: 0.194 },
  { freq: 329.63, dur: 0.38 }, { freq: 0, dur: 0.001 },
];

// 평화로운 탐험 — C 장조, 72 BPM, 잔잔함 (4분음표=0.833s)
const PEACEFUL_BGM: Note[] = [
  { freq: 523.25, dur: 0.833 }, { freq: 587.33, dur: 0.417 }, { freq: 659.25, dur: 0.417 },
  { freq: 783.99, dur: 0.833 }, { freq: 659.25, dur: 0.417 }, { freq: 587.33, dur: 0.417 },
  { freq: 523.25, dur: 1.667 }, { freq: 0, dur: 0.001 },
  { freq: 659.25, dur: 0.833 }, { freq: 783.99, dur: 0.417 }, { freq: 880.00, dur: 0.417 },
  { freq: 987.77, dur: 0.833 }, { freq: 0, dur: 0.417 }, { freq: 880.00, dur: 0.417 },
  { freq: 783.99, dur: 0.417 }, { freq: 659.25, dur: 0.417 }, { freq: 523.25, dur: 0.833 },
  { freq: 440.00, dur: 1.667 }, { freq: 0, dur: 0.001 },
  // Bridge — ascending
  { freq: 523.25, dur: 0.417 }, { freq: 659.25, dur: 0.417 }, { freq: 783.99, dur: 0.417 }, { freq: 880.00, dur: 0.417 },
  { freq: 987.77, dur: 0.833 }, { freq: 0, dur: 0.417 }, { freq: 880.00, dur: 0.417 },
  { freq: 783.99, dur: 0.417 }, { freq: 659.25, dur: 0.417 }, { freq: 523.25, dur: 1.667 },
  { freq: 0, dur: 0.001 },
];

// 빠른 레이싱 — C 장조, 175 BPM, 질주감 (8분음표=0.171s)
const RACING_BGM: Note[] = [
  // Rising rocket launch
  { freq: 523.25, dur: 0.171 }, { freq: 587.33, dur: 0.171 }, { freq: 659.25, dur: 0.171 }, { freq: 698.46, dur: 0.171 },
  { freq: 783.99, dur: 0.171 }, { freq: 880.00, dur: 0.171 }, { freq: 987.77, dur: 0.171 }, { freq: 1046.50, dur: 0.171 },
  // High melody
  { freq: 1046.50, dur: 0.171 }, { freq: 987.77, dur: 0.171 }, { freq: 880.00, dur: 0.171 }, { freq: 987.77, dur: 0.171 },
  { freq: 880.00, dur: 0.171 }, { freq: 783.99, dur: 0.171 }, { freq: 698.46, dur: 0.171 }, { freq: 783.99, dur: 0.171 },
  { freq: 659.25, dur: 0.171 }, { freq: 698.46, dur: 0.171 }, { freq: 783.99, dur: 0.171 }, { freq: 659.25, dur: 0.171 },
  { freq: 587.33, dur: 0.171 }, { freq: 523.25, dur: 0.171 }, { freq: 440.00, dur: 0.171 }, { freq: 523.25, dur: 0.171 },
  // Turnaround
  { freq: 587.33, dur: 0.171 }, { freq: 659.25, dur: 0.171 }, { freq: 783.99, dur: 0.342 },
  { freq: 0, dur: 0.171 }, { freq: 783.99, dur: 0.171 }, { freq: 0, dur: 0.171 }, { freq: 523.25, dur: 0.171 },
];

// 별빛 — 몽환적 앰비언트, 50 BPM, triangle (4분음표=1.2s)
const STARLIGHT_BGM: Note[] = [
  { freq: 1046.50, dur: 1.2, gain: 0.8 }, { freq: 0, dur: 0.6 },
  { freq: 1174.66, dur: 0.6, gain: 0.6 }, { freq: 1318.51, dur: 1.8, gain: 0.7 },
  { freq: 0, dur: 0.6 },
  { freq: 1174.66, dur: 1.2, gain: 0.6 }, { freq: 1046.50, dur: 0.6, gain: 0.4 },
  { freq: 987.77, dur: 1.8, gain: 0.6 }, { freq: 0, dur: 0.6 },
  { freq: 880.00, dur: 0.6, gain: 0.4 }, { freq: 987.77, dur: 0.6, gain: 0.5 },
  { freq: 1046.50, dur: 1.8, gain: 0.7 }, { freq: 0, dur: 0.6 },
  { freq: 1174.66, dur: 0.6, gain: 0.5 }, { freq: 1318.51, dur: 2.4, gain: 0.8 },
  { freq: 0, dur: 0.6 },
];

// ── BGM 플레이어 (합성) ──
class BGMPlayer {
  private isPlaying = false;
  private nextNoteTime = 0;
  private noteIdx = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor(private notes: Note[], private oscType: OscillatorType = "square", private vol = 0.12) {}

  private scheduleNote(note: Note, time: number) {
    if (note.freq === 0) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = this.oscType;
    osc.frequency.value = note.freq;
    const v = (note.gain ?? 1) * this.vol;
    g.gain.setValueAtTime(v, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + note.dur * 0.85);
    osc.connect(g); g.connect(c.destination);
    osc.start(time); osc.stop(time + note.dur);
  }

  private tick() {
    const c = getCtx();
    const lookAhead = 0.1;
    while (this.nextNoteTime < c.currentTime + lookAhead) {
      this.scheduleNote(this.notes[this.noteIdx % this.notes.length], this.nextNoteTime);
      this.nextNoteTime += this.notes[this.noteIdx % this.notes.length].dur;
      this.noteIdx++;
    }
    if (this.isPlaying) {
      this.timerId = setTimeout(() => this.tick(), 25);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.noteIdx = 0;
    this.nextNoteTime = getCtx().currentTime + 0.05;
    this.tick();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId !== null) { clearTimeout(this.timerId); this.timerId = null; }
  }

  get playing() { return this.isPlaying; }
}

// ── BGM 플레이어 (파일 기반) ──
class FileBGMPlayer {
  private audio: HTMLAudioElement | null = null;
  private _playing = false;

  constructor(private src: string, private vol = 0.35) {}

  start() {
    if (this._playing) return;
    if (typeof window === "undefined") return;
    if (!this.audio) {
      this.audio = new Audio(this.src);
      this.audio.loop = true;
      this.audio.volume = this.vol;
    }
    this.audio.play().catch(() => { this._playing = false; });
    this._playing = true;
  }

  stop() {
    if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; }
    this._playing = false;
  }

  get playing() { return this._playing; }
}

// ── BGM 싱글톤 팩토리 ──
type AnyBGMPlayer = BGMPlayer | FileBGMPlayer;
let dinoBGM: BGMPlayer | null = null;
let moleBGM: BGMPlayer | null = null;
let jazzBGM: BGMPlayer | null = null;
let bossBGM: BGMPlayer | null = null;
let peacefulBGM: BGMPlayer | null = null;
let racingBGM: BGMPlayer | null = null;
let starlightBGM: BGMPlayer | null = null;
let fileActionBGM: FileBGMPlayer | null = null;
let fileFunBGM: FileBGMPlayer | null = null;

function getDinoBGM() { if (!dinoBGM) dinoBGM = new BGMPlayer(DINO_BGM, "square", 0.12); return dinoBGM; }
function getMoleBGM() { if (!moleBGM) moleBGM = new BGMPlayer(MOLE_BGM, "triangle", 0.1); return moleBGM; }
function getJazzBGM() { if (!jazzBGM) jazzBGM = new BGMPlayer(JAZZ_BGM, "sawtooth", 0.09); return jazzBGM; }
function getBossBGM() { if (!bossBGM) bossBGM = new BGMPlayer(BOSS_BGM, "square", 0.13); return bossBGM; }
function getPeacefulBGM() { if (!peacefulBGM) peacefulBGM = new BGMPlayer(PEACEFUL_BGM, "triangle", 0.08); return peacefulBGM; }
function getRacingBGM() { if (!racingBGM) racingBGM = new BGMPlayer(RACING_BGM, "square", 0.1); return racingBGM; }
function getStarlightBGM() { if (!starlightBGM) starlightBGM = new BGMPlayer(STARLIGHT_BGM, "triangle", 0.07); return starlightBGM; }
function getFileActionBGM() { if (!fileActionBGM) fileActionBGM = new FileBGMPlayer("/sounds/bgm-action.mp3"); return fileActionBGM; }
function getFileFunBGM() { if (!fileFunBGM) fileFunBGM = new FileBGMPlayer("/sounds/bgm-fun.mp3"); return fileFunBGM; }

function stopAllBGM() {
  [dinoBGM, moleBGM, jazzBGM, bossBGM, peacefulBGM, racingBGM, starlightBGM, fileActionBGM, fileFunBGM]
    .forEach((p) => p?.stop());
}

// ── 효과음 섹션 데이터 ──
type SoundEntry = { key: string; label: string; desc: string; play: () => void; style: string };

const SECTIONS: { title: string; icon: string; sounds: SoundEntry[] }[] = [
  {
    title: "퀴즈",
    icon: "📖",
    sounds: [
      { key: "correct", label: "✅ 정답", desc: "밝은 딩동", play: synth.correct, style: "bg-emerald-50 text-emerald-700 active:bg-emerald-100" },
      { key: "wrong", label: "❌ 오답", desc: "낮은 버즈", play: synth.wrong, style: "bg-red-50 text-red-700 active:bg-red-100" },
      { key: "coinPickup", label: "🍪 스펠링 정답", desc: "+1 초코 짤랑", play: synth.coinPickup, style: "bg-amber-50 text-amber-700 active:bg-amber-100" },
      { key: "quizComplete", label: "🎉 퀴즈 완료", desc: "축하 팡파르", play: synth.quizComplete, style: "bg-purple-50 text-purple-700 active:bg-purple-100" },
    ],
  },
  {
    title: "할일",
    icon: "✅",
    sounds: [
      { key: "checkPop", label: "☑️ 체크", desc: "팝", play: synth.checkPop, style: "bg-cyan-50 text-cyan-700 active:bg-cyan-100" },
      { key: "coinDing", label: "🍪 초코 획득", desc: "띵", play: synth.coinDing, style: "bg-amber-50 text-amber-700 active:bg-amber-100" },
      { key: "allClear", label: "🌟 올클리어", desc: "빠밤!", play: synth.allClear, style: "bg-purple-50 text-purple-700 active:bg-purple-100" },
    ],
  },
  {
    title: "게임 효과음",
    icon: "🎮",
    sounds: [
      { key: "jump", label: "🦘 점프", desc: "슝", play: synth.jump, style: "bg-green-50 text-green-700 active:bg-green-100" },
      { key: "gameOver", label: "💀 게임오버", desc: "뚜뚜", play: synth.gameOver, style: "bg-red-50 text-red-700 active:bg-red-100" },
      { key: "whack", label: "🔨 두더지 때리기", desc: "퍽!", play: synth.whack, style: "bg-orange-50 text-orange-700 active:bg-orange-100" },
      { key: "goldenWhack", label: "⭐ 골든 두더지", desc: "반짝퍽!", play: synth.goldenWhack, style: "bg-yellow-50 text-yellow-700 active:bg-yellow-100" },
    ],
  },
  {
    title: "기타",
    icon: "🏆",
    sounds: [
      { key: "badgeUnlock", label: "🏅 뱃지 획득", desc: "짜잔", play: synth.badgeUnlock, style: "bg-violet-50 text-violet-700 active:bg-violet-100" },
      { key: "purchase", label: "🛒 초코샵 구매", desc: "챠링", play: synth.purchase, style: "bg-amber-50 text-amber-700 active:bg-amber-100" },
    ],
  },
];

type BGMEntry = {
  key: string;
  label: string;
  desc: string;
  player: () => AnyBGMPlayer;
  accent: string;
  tag?: string;
};

const BGM_SYNTH: BGMEntry[] = [
  { key: "dino",      label: "🦖 공룡 달리기",   desc: "경쾌한 8비트 액션",       player: getDinoBGM,     accent: "bg-violet-500" },
  { key: "mole",      label: "🐹 두더지 잡기",    desc: "통통 튀는 8비트",         player: getMoleBGM,     accent: "bg-amber-500" },
  { key: "jazz",      label: "🎷 재즈 스윙",      desc: "스윙 리듬 G 도리안",      player: getJazzBGM,     accent: "bg-blue-500" },
  { key: "boss",      label: "👾 보스 배틀",      desc: "강렬한 E 단조",           player: getBossBGM,     accent: "bg-red-700" },
  { key: "peaceful",  label: "🌿 평화로운 탐험",  desc: "잔잔한 C 장조",           player: getPeacefulBGM, accent: "bg-green-500" },
  { key: "racing",    label: "🏎️ 빠른 레이싱",   desc: "질주감 175 BPM",          player: getRacingBGM,   accent: "bg-orange-500" },
  { key: "starlight", label: "✨ 별빛",            desc: "몽환적 앰비언트 50 BPM",  player: getStarlightBGM, accent: "bg-indigo-400" },
];

const BGM_FILE: BGMEntry[] = [
  { key: "file_action", label: "🎮 게임 액션 BGM", desc: "bgm-action.mp3", player: getFileActionBGM, accent: "bg-gray-600", tag: "MP3" },
  { key: "file_fun",    label: "🎉 신나는 BGM",    desc: "bgm-fun.mp3",    player: getFileFunBGM,    accent: "bg-gray-600", tag: "MP3" },
];

export default function SoundDemoPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId, user } = useUser(params);
  const { override: themeOverride } = useThemeOverride(childId);
  const { allowed } = useFeatureGuard(childId, "sound");
  const [playingSfx, setPlayingSfx] = useState<string | null>(null);
  const [playingBgm, setPlayingBgm] = useState<string | null>(null);
  const sfxTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 페이지 이탈 시 모든 BGM 정지
  useEffect(() => {
    return () => stopAllBGM();
  }, []);

  const handleSfx = useCallback((entry: SoundEntry) => {
    if (sfxTimerRef.current) clearTimeout(sfxTimerRef.current);
    setPlayingSfx(entry.key);
    entry.play();
    sfxTimerRef.current = setTimeout(() => setPlayingSfx(null), 600);
  }, []);

  const handleBgm = useCallback((entry: BGMEntry) => {
    const player = entry.player();
    if (playingBgm === entry.key) {
      player.stop();
      setPlayingBgm(null);
    } else {
      stopAllBGM();
      player.start();
      setPlayingBgm(entry.key);
    }
  }, [playingBgm]);

  if (!allowed || !user) return null;

  const renderBGMButton = (b: BGMEntry) => {
    const isOn = playingBgm === b.key;
    return (
      <button
        key={b.key}
        onClick={() => handleBgm(b)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
          isOn
            ? `${b.accent} text-white shadow-md`
            : "bg-white text-gray-700 border border-gray-200 active:scale-[0.98]"
        }`}
      >
        <span className="flex items-center gap-2">
          {isOn && (
            <span className="flex gap-0.5 items-end h-4">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1 bg-white/80 rounded-full animate-bounce" style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </span>
          )}
          {!isOn && <span className="text-base">▶</span>}
          {b.label}
          {b.tag && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isOn ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
              {b.tag}
            </span>
          )}
        </span>
        <span className={`text-xs ${isOn ? "text-white/80" : "text-gray-400"}`}>
          {isOn ? "■ 정지" : b.desc}
        </span>
      </button>
    );
  };

  return (
    <div className={`theme-preset-${themeOverride || user.theme} min-h-screen bg-[var(--bg)] pb-24`}>
      {/* Header */}
      <div className="text-center pt-6 pb-4">
        <h1 className="text-xl font-black text-gray-800">🔊 사운드 데모</h1>
        <p className="text-xs text-gray-400 mt-1">Web Audio API 합성음 + MP3 파일 지원</p>
      </div>

      <div className="px-4 space-y-6">
        {/* 합성 BGM */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1">
            <span>🎵</span>
            <span>배경음악 — 합성</span>
            <span className="ml-1 text-[10px] font-normal text-gray-400">Web Audio API 루프</span>
          </h2>
          <div className="space-y-1.5">
            {BGM_SYNTH.map(renderBGMButton)}
          </div>
        </div>

        {/* 파일 BGM */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1">
            <span>🎵</span>
            <span>배경음악 — MP3 파일</span>
          </h2>
          <div className="space-y-1.5">
            {BGM_FILE.map(renderBGMButton)}
          </div>
          <div className="mt-2 px-1 py-2 bg-gray-50 rounded-xl text-[10px] text-gray-400 leading-relaxed">
            <div className="font-semibold text-gray-500 mb-0.5">📂 파일 넣는 방법</div>
            <div>• <code className="bg-gray-100 px-1 rounded">public/sounds/bgm-action.mp3</code></div>
            <div>• <code className="bg-gray-100 px-1 rounded">public/sounds/bgm-fun.mp3</code></div>
            <div className="mt-1">Pixabay · OpenGameArt · Freesound 에서 CC0 파일 다운로드</div>
          </div>
        </div>

        {/* 효과음 섹션들 */}
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1">
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </h2>
            <div className="space-y-1.5">
              {section.sounds.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleSfx(s)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${s.style} ${
                    playingSfx === s.key ? "scale-[0.97] ring-2 ring-[var(--accent)]/30" : ""
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-xs opacity-60">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav childId={childId} />
    </div>
  );
}
