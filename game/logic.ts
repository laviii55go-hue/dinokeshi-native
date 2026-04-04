import { COLS, ROWS, BOMB_BOARD_MAX, availableDinoTypes, bombProbability, groupsNeeded, type WeightedType } from './constants';
import type { Cell, GameState } from './types';

let cellGenCounter = 0;

// --- Grid creation ---

function countBombs(grid: Cell[][]): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c].bomb) n++;
  return n;
}

function pickWeightedType(wTypes: WeightedType[]): number {
  let total = 0;
  for (const w of wTypes) total += w.weight;
  let rnd = Math.random() * total;
  for (const w of wTypes) {
    rnd -= w.weight;
    if (rnd <= 0) return w.type;
  }
  return wTypes[wTypes.length - 1].type;
}

function randomCell(wTypes: WeightedType[], allowBomb: boolean, bombProb: number): Cell {
  const type = pickWeightedType(wTypes);
  const bomb = allowBomb ? Math.random() < bombProb : false;
  return { type, bomb, gen: ++cellGenCounter };
}

export function createGrid(level: number, maxInitBombs = 1): Cell[][] {
  const types = availableDinoTypes(level);
  const prob = bombProbability(level);
  const grid: Cell[][] = [];
  let bombs = 0;
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      const canBomb = bombs < maxInitBombs;
      const cell = randomCell(types, canBomb, prob);
      if (cell.bomb) bombs++;
      row.push(cell);
    }
    grid.push(row);
  }
  return grid;
}

// ★ デバッグ用: 任意のレベルでゲーム開始（検証完了後に DEBUG_START_LEVEL = 0 に戻す）
const DEBUG_START_LEVEL = 0; // 0 = 通常, 110 = LV110から開始 など

export function createInitialState(): GameState {
  const startLevel = DEBUG_START_LEVEL > 0 ? DEBUG_START_LEVEL : 1;
  const types = availableDinoTypes(startLevel);
  return {
    grid: createGrid(startLevel, 1),
    level: startLevel,
    score: 0,
    erasedGroups: 0,
    eraserCount: DEBUG_START_LEVEL > 0 ? 10 : 0,
    shuffleCount: DEBUG_START_LEVEL > 0 ? 5 : 0,
    henkouCount: DEBUG_START_LEVEL > 0 ? 3 : 0,
    allCount: DEBUG_START_LEVEL > 0 ? 2 : 0,
    running: true,
    announcedTypes: types.map(t => t.type),
  };
}

// --- BFS for connected group ---

export function getGroup(grid: Cell[][], sr: number, sc: number): [number, number][] {
  const cell = grid[sr][sc];
  if (cell.bomb) return [];
  const target = cell.type;
  const seen = new Set<number>();
  const queue: [number, number][] = [[sr, sc]];
  const group: [number, number][] = [];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = r * COLS + c;
    if (seen.has(key)) continue;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const g = grid[r][c];
    if (g.bomb || g.type !== target) continue;
    seen.add(key);
    group.push([r, c]);
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return group;
}

// --- Minimum group size ---

export function minGroupSize(cellType: number): number {
  return cellType + 1;
}

// --- Bomb explosion ---

export interface BombResult {
  destroyed: Set<number>;   // keys = r*COLS+c
  chainBombs: [number, number][];
}

export function explodeBomb(grid: Cell[][], br: number, bc: number): BombResult {
  const destroyed = new Set<number>();
  const chainBombs: [number, number][] = [[br, bc]];
  const visited = new Set<number>();
  const queue: [number, number][] = [[br, bc]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = r * COLS + c;
    if (visited.has(key)) continue;
    visited.add(key);

    // destroy entire row and column
    for (let cc = 0; cc < COLS; cc++) destroyed.add(r * COLS + cc);
    for (let rr = 0; rr < ROWS; rr++) destroyed.add(rr * COLS + c);

    // check for chain bombs in row and column
    for (let cc = 0; cc < COLS; cc++) {
      if (grid[r][cc].bomb && !visited.has(r * COLS + cc)) {
        queue.push([r, cc]);
        chainBombs.push([r, cc]);
      }
    }
    for (let rr = 0; rr < ROWS; rr++) {
      if (grid[rr][c].bomb && !visited.has(rr * COLS + c)) {
        queue.push([rr, c]);
        chainBombs.push([rr, c]);
      }
    }
  }

  return { destroyed, chainBombs };
}

// --- Gravity & refill ---

export function applyGravityAndRefill(grid: Cell[][], level: number): Cell[][] {
  const types = availableDinoTypes(level);
  const prob = bombProbability(level);
  const newGrid: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ type: -1, bomb: false }))
  );

  // Pass 1: Count existing bombs first so they are never replaced by new ones
  let existingBombs = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c].type >= 0 && grid[r][c].bomb) existingBombs++;

  // Pass 2: Place existing cells (bombs always kept), then fill new cells
  let bombCount = existingBombs;

  for (let c = 0; c < COLS; c++) {
    const existing: Cell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c].type >= 0) existing.push(grid[r][c]);
    }
    let writeRow = ROWS - 1;
    for (const cell of existing) {
      newGrid[writeRow][c] = { type: cell.type, bomb: cell.bomb, gen: cell.gen };
      writeRow--;
    }
    for (let r = writeRow; r >= 0; r--) {
      const cell = randomCell(types, bombCount < BOMB_BOARD_MAX, prob);
      if (cell.bomb) bombCount++;
      newGrid[r][c] = cell;
    }
  }

  return newGrid;
}

// --- Erase cells ---

export function eraseCells(grid: Cell[][], positions: [number, number][]): Cell[][] {
  // Shallow copy rows, only deep-copy affected cells
  const newGrid = grid.map(row => [...row]);
  for (const [r, c] of positions) {
    newGrid[r][c] = { type: -1, bomb: false };
  }
  return newGrid;
}

export function eraseBombCells(grid: Cell[][], destroyed: Set<number>): Cell[][] {
  // Shallow copy rows, only deep-copy affected cells (same as eraseCells)
  const newGrid = grid.map(row => [...row]);
  for (const key of destroyed) {
    const r = (key / COLS) | 0;
    const c = key % COLS;
    newGrid[r][c] = { type: -1, bomb: false };
  }
  return newGrid;
}

// --- Check valid moves ---

export function hasValidMoves(grid: Cell[][]): boolean {
  // bombs are always clickable
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c].bomb) return true;

  // check if any group meets minimum size (skip already-visited cells)
  const visited = new Set<number>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = r * COLS + c;
      if (visited.has(key) || grid[r][c].type < 0) continue;
      const group = getGroup(grid, r, c);
      for (const [gr, gc] of group) visited.add(gr * COLS + gc);
      if (group.length >= minGroupSize(grid[r][c].type)) return true;
    }
  }
  return false;
}

// --- Shuffle (Fisher-Yates) ---

export function shuffleGrid(grid: Cell[][]): Cell[][] {
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      cells.push({ ...grid[r][c] });

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const newGrid: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(cells[idx++]);
    }
    newGrid.push(row);
  }
  return newGrid;
}

// --- Erase all of one type ---

export function eraseAllOfType(grid: Cell[][], targetType: number): { newGrid: Cell[][], erasedCount: number } {
  const newGrid = grid.map(row => [...row]);
  let erasedCount = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (newGrid[r][c].type === targetType && !newGrid[r][c].bomb) {
        newGrid[r][c] = { type: -1, bomb: false };
        erasedCount++;
      }
    }
  }
  return { newGrid, erasedCount };
}

// --- Henkou (convert type) ---

export function convertType(grid: Cell[][], fromType: number): Cell[][] {
  const basicTypes = [0, 1, 2, 3, 4, 5].filter(t => t !== fromType);
  // Pick ONE random target type for all converted cells
  const targetType = basicTypes[Math.floor(Math.random() * basicTypes.length)];
  // Shallow copy rows, only deep-copy affected cells
  const newGrid = grid.map(row => [...row]);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (newGrid[r][c].type === fromType && !newGrid[r][c].bomb)
        newGrid[r][c] = { type: targetType, bomb: false, gen: newGrid[r][c].gen };
  return newGrid;
}

// --- Level up check ---

export interface LevelUpResult {
  leveled: boolean;
  newLevel: number;
  earnedEraser: boolean;
  earnedShuffle: boolean;
  earnedHenkou: boolean;
  earnedAll: boolean;
  newTypes: number[]; // newly unlocked dino types
}

export function checkLevelUp(state: GameState): LevelUpResult {
  const needed = groupsNeeded(state.level);
  if (state.erasedGroups < needed) {
    return { leveled: false, newLevel: state.level, earnedEraser: false, earnedShuffle: false, earnedHenkou: false, earnedAll: false, newTypes: [] };
  }

  const newLevel = state.level + 1;
  const earnedEraser = newLevel >= 3;
  const earnedShuffle = newLevel >= 5 && newLevel % 2 === 0;
  const earnedHenkou = newLevel >= 10 && newLevel % 10 === 0;
  const earnedAll = newLevel >= 20 && newLevel % 20 === 0;

  // Check newly unlocked types
  const oldTypeNums = availableDinoTypes(state.level).map(w => w.type);
  const newAllTypeNums = availableDinoTypes(newLevel).map(w => w.type);
  const newTypes = newAllTypeNums.filter(t => !oldTypeNums.includes(t));

  return { leveled: true, newLevel, earnedEraser, earnedShuffle, earnedHenkou, earnedAll, newTypes };
}

// --- Score calculation ---

// Rare value per type: higher types get exponentially more reward
const RARE_VALUE: number[] = [
  0,    // type0  ティラノサウルス
  0,    // type1  ブラキオサウルス
  0,    // type2  プテラノドン
  0,    // type3  トリケラトプス
  0,    // type4  ステゴサウルス
  3,    // type5  スピノサウルス
  6,    // type6  アロサウルス
  10,   // type7  パキケファロサウルス
  16,   // type8  モササウルス
  25,   // type9  アンキロサウルス
  35,   // type10 マイアサウラ
  50,   // type11 ケツァルコアトル
  70,   // type12 マンモス
  100,  // type13 ヒト
  140,  // type14 ロボット
  190,  // type15 AI
  250,  // type16 エイリアン
  330,  // type17 ドラゴン
  430,  // type18 ヤマタノオロチ
  550,  // type19 ユニコーン
  700,  // type20 フェニックス
  880,  // type21 麒麟
  1100, // type22 神
];

export type BonusLevel = 'none' | 'bonus';

export function calcScore(erasedCount: number, cellType: number, level: number = 1): { pts: number; bonus: BonusLevel } {
  const base = erasedCount * (cellType + 1);
  const rare = erasedCount * (RARE_VALUE[cellType] ?? 0);
  let pts = base + rare;
  const hasBonus = rare > 0;
  // Level coefficient: 段階的倍率（序盤から緩やかに上昇、LV50以降は2.0+漸増）
  const levelMultiplier =
    level < 3  ? 1 :
    level < 5  ? 1.1 :
    level < 10 ? 1.2 :
    level < 20 ? 1.35 :
    level < 30 ? 1.5 :
    level < 40 ? 1.7 :
    level < 50 ? 1.85 :
    2.0 + (level - 50) * 0.015;
  pts = Math.floor(pts * levelMultiplier);
  return { pts, bonus: hasBonus ? 'bonus' : 'none' };
}
