import { COLS, ROWS, BOMB_BOARD_MAX, availableDinoTypes, bombProbability, groupsNeeded, type WeightedType } from './constants';
import type { Cell, GameState } from './types';

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
  return { type, bomb };
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

export function createInitialState(): GameState {
  return {
    grid: createGrid(1, 1),
    level: 1,
    score: 0,
    erasedGroups: 0,
    eraserCount: 0,
    shuffleCount: 0,
    henkouCount: 0,
    running: true,
    announcedTypes: [0, 1, 2, 3, 4, 5],
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
      newGrid[writeRow][c] = { type: cell.type, bomb: cell.bomb };
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
        newGrid[r][c] = { type: targetType, bomb: false };
  return newGrid;
}

// --- Level up check ---

export interface LevelUpResult {
  leveled: boolean;
  newLevel: number;
  earnedEraser: boolean;
  earnedShuffle: boolean;
  earnedHenkou: boolean;
  newTypes: number[]; // newly unlocked dino types
}

export function checkLevelUp(state: GameState): LevelUpResult {
  const needed = groupsNeeded(state.level);
  if (state.erasedGroups < needed) {
    return { leveled: false, newLevel: state.level, earnedEraser: false, earnedShuffle: false, earnedHenkou: false, newTypes: [] };
  }

  const newLevel = state.level + 1;
  const earnedEraser = newLevel >= 3;
  const earnedShuffle = newLevel >= 5 && newLevel % 2 === 0;
  const earnedHenkou = newLevel >= 10 && newLevel % 10 === 0;

  // Check newly unlocked types
  const oldTypeNums = availableDinoTypes(state.level).map(w => w.type);
  const newAllTypeNums = availableDinoTypes(newLevel).map(w => w.type);
  const newTypes = newAllTypeNums.filter(t => !oldTypeNums.includes(t));

  return { leveled: true, newLevel, earnedEraser, earnedShuffle, earnedHenkou, newTypes };
}

// --- Score calculation ---

// Fixed bonus: [threshold (minGroupSize * 1.5 rounded up), bonus points]
const FIXED_BONUS: [number, number][] = [
  [2, 10],     // type0  ティラノサウルス
  [3, 20],     // type1  ブラキオサウルス
  [5, 50],     // type2  プテラノドン
  [6, 80],     // type3  トリケラトプス
  [8, 120],    // type4  ステゴサウルス
  [9, 160],    // type5  スピノサウルス
  [11, 200],   // type6  アロサウルス
  [12, 250],   // type7  パキケファロサウルス
  [14, 300],   // type8  モササウルス
  [15, 400],   // type9  アンキロサウルス
  [17, 450],   // type10 マイアサウラ
  [18, 500],   // type11 ケツァルコアトル
  [20, 600],   // type12 マンモス
  [21, 700],   // type13 ヒト
  [23, 800],   // type14 ロボット
  [24, 1000],  // type15 AI
  [26, 1200],  // type16 エイリアン
  [27, 1500],  // type17 ドラゴン
  [29, 2000],  // type18 ヤマタノオロチ
  [30, 2500],  // type19 ユニコーン
  [32, 3000],  // type20 フェニックス
  [33, 3500],  // type21 麒麟
  [35, 5000],  // type22 神
];

export type BonusLevel = 'none' | 'bonus';

export function calcScore(erasedCount: number, cellType: number, level: number = 1): { pts: number; bonus: BonusLevel } {
  const base = erasedCount * (cellType + 1);
  const [threshold, bonusPts] = FIXED_BONUS[cellType] ?? [Infinity, 0];
  const hasBonus = erasedCount >= threshold;
  let pts = base + (hasBonus ? bonusPts : 0);
  // Level coefficient: score scales with level (LV50 = 2.0x, LV100 = 3.0x)
  const levelMultiplier = 1 + level * 0.02;
  pts = Math.floor(pts * levelMultiplier);
  return { pts, bonus: hasBonus ? 'bonus' : 'none' };
}
