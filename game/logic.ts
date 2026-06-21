import { getBoardCols, getBoardRows, START_LEVEL_PRESETS, availableDinoTypes, bombBoardMax, bombProbability, groupsNeeded, type StartLevelPreset, type WeightedType } from './constants';
import type { Cell, GameState } from './types';

let cellGenCounter = 0;

// --- Grid creation ---

function countBombs(grid: Cell[][]): number {
  let n = 0;
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
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
  const rows = getBoardRows(level);
  const cols = getBoardCols(level);
  const types = availableDinoTypes(level);
  const prob = bombProbability(level);
  const grid: Cell[][] = [];
  let bombs = 0;
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      const canBomb = bombs < maxInitBombs;
      const cell = randomCell(types, canBomb, prob);
      if (cell.bomb) bombs++;
      row.push(cell);
    }
    grid.push(row);
  }
  return grid;
}

export function resizeGridKeepingCenter(grid: Cell[][], level: number): Cell[][] {
  const newBombLimit = Math.max(0, bombBoardMax(level) - countBombs(grid));
  const newGrid = createGrid(level, newBombLimit);
  const oldRows = grid.length;
  const oldCols = grid[0]?.length ?? 0;
  const newRows = newGrid.length;
  const newCols = newGrid[0]?.length ?? 0;

  const copyRows = Math.min(oldRows, newRows);
  const copyCols = Math.min(oldCols, newCols);
  const oldRowStart = Math.max(0, Math.floor((oldRows - newRows) / 2));
  const oldColStart = Math.max(0, Math.floor((oldCols - newCols) / 2));
  const newRowStart = Math.max(0, Math.floor((newRows - oldRows) / 2));
  const newColStart = Math.max(0, Math.floor((newCols - oldCols) / 2));

  for (let r = 0; r < copyRows; r++) {
    for (let c = 0; c < copyCols; c++) {
      newGrid[newRowStart + r][newColStart + c] = { ...grid[oldRowStart + r][oldColStart + c] };
    }
  }

  return newGrid;
}

// ★ デバッグ用: 任意のレベルでゲーム開始（検証完了後に DEBUG_START_LEVEL = 0 に戻す）
const DEBUG_START_LEVEL = 0; // 0 = 通常, 110 = LV110から開始 など

export function createInitialState(startLevel: number = 1): GameState {
  const actualStartLevel = DEBUG_START_LEVEL > 0 ? DEBUG_START_LEVEL : startLevel;
  const preset = START_LEVEL_PRESETS[actualStartLevel as StartLevelPreset];
  const score = preset?.score ?? 0;
  const eraserCount = preset?.eraserCount ?? (DEBUG_START_LEVEL > 0 ? 10 : 0);
  const shuffleCount = preset?.shuffleCount ?? (DEBUG_START_LEVEL > 0 ? 5 : 0);
  const henkouCount = preset?.henkouCount ?? (DEBUG_START_LEVEL > 0 ? 3 : 0);
  const allCount = preset?.allCount ?? (DEBUG_START_LEVEL > 0 ? 2 : 0);
  const startLevelForGrid = Math.max(1, actualStartLevel);
  const types = availableDinoTypes(startLevelForGrid);
  return {
    grid: createGrid(startLevelForGrid, 1),
    level: startLevelForGrid,
    score,
    erasedGroups: 0,
    eraserCount,
    shuffleCount,
    henkouCount,
    allCount,
    running: true,
    announcedTypes: types.map(t => t.type),
    reviveUsed: false,
  };
}

// --- BFS for connected group ---

export function getGroup(grid: Cell[][], sr: number, sc: number): [number, number][] {
  const cell = grid[sr][sc];
  if (cell.bomb) return [];
  const rows = grid.length;
  const cols = grid[0].length;
  const target = cell.type;
  const seen = new Set<number>();
  const queue: [number, number][] = [[sr, sc]];
  const group: [number, number][] = [];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = r * cols + c;
    if (seen.has(key)) continue;
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
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
  destroyed: Set<number>;   // keys = r*cols+c
  chainBombs: [number, number][];
}

export function explodeBomb(grid: Cell[][], br: number, bc: number): BombResult {
  const rows = grid.length;
  const cols = grid[0].length;
  const destroyed = new Set<number>();
  const chainBombs: [number, number][] = [[br, bc]];
  const visited = new Set<number>();
  const queue: [number, number][] = [[br, bc]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = r * cols + c;
    if (visited.has(key)) continue;
    visited.add(key);

    // destroy entire row and column
    for (let cc = 0; cc < cols; cc++) destroyed.add(r * cols + cc);
    for (let rr = 0; rr < rows; rr++) destroyed.add(rr * cols + c);

    // check for chain bombs in row and column
    for (let cc = 0; cc < cols; cc++) {
      if (grid[r][cc].bomb && !visited.has(r * cols + cc)) {
        queue.push([r, cc]);
        chainBombs.push([r, cc]);
      }
    }
    for (let rr = 0; rr < rows; rr++) {
      if (grid[rr][c].bomb && !visited.has(rr * cols + c)) {
        queue.push([rr, c]);
        chainBombs.push([rr, c]);
      }
    }
  }

  return { destroyed, chainBombs };
}

// --- Gravity & refill ---

export function applyGravityAndRefill(grid: Cell[][], level: number): Cell[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const types = availableDinoTypes(level);
  const prob = bombProbability(level);
  const newGrid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: -1, bomb: false }))
  );

  // Pass 1: Count existing bombs first so they are never replaced by new ones
  let existingBombs = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c].type >= 0 && grid[r][c].bomb) existingBombs++;

  // Pass 2: Place existing cells (bombs always kept), then fill new cells
  let bombCount = existingBombs;

  for (let c = 0; c < cols; c++) {
    const existing: Cell[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r][c].type >= 0) existing.push(grid[r][c]);
    }
    let writeRow = rows - 1;
    for (const cell of existing) {
      newGrid[writeRow][c] = { type: cell.type, bomb: cell.bomb, gen: cell.gen };
      writeRow--;
    }
    for (let r = writeRow; r >= 0; r--) {
      const cell = randomCell(types, bombCount < bombBoardMax(level), prob);
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
  const cols = grid[0].length;
  const newGrid = grid.map(row => [...row]);
  for (const key of destroyed) {
    const r = (key / cols) | 0;
    const c = key % cols;
    newGrid[r][c] = { type: -1, bomb: false };
  }
  return newGrid;
}

// --- Check valid moves ---

export function hasValidMoves(grid: Cell[][]): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  // bombs are always clickable
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c].bomb) return true;

  // check if any group meets minimum size (skip already-visited cells)
  const visited = new Set<number>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = r * cols + c;
      if (visited.has(key) || grid[r][c].type < 0) continue;
      const group = getGroup(grid, r, c);
      for (const [gr, gc] of group) visited.add(gr * cols + gc);
      if (group.length >= minGroupSize(grid[r][c].type)) return true;
    }
  }
  return false;
}

// --- Shuffle (Fisher-Yates) ---

export function shuffleGrid(grid: Cell[][]): Cell[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ ...grid[r][c] });

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const newGrid: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(cells[idx++]);
    }
    newGrid.push(row);
  }
  return newGrid;
}

// --- Erase all of one type ---

export function eraseAllOfType(grid: Cell[][], targetType: number): { newGrid: Cell[][], erasedCount: number } {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid = grid.map(row => [...row]);
  let erasedCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
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
  const rows = grid.length;
  const cols = grid[0].length;
  const basicTypes = [0, 1, 2, 3, 4, 5].filter(t => t !== fromType);
  const targetType = basicTypes[Math.floor(Math.random() * basicTypes.length)];
  const newGrid = grid.map(row => [...row]);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
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
  const earnedEraser = newLevel >= 2;
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
  1100, // type22 時空
  1100, // type23 世界樹
  1100, // type24 海
  1100, // type25 大地
  1100, // type26 空
  1100, // type27 星
  1100, // type28 虚無
  1100, // type29 ∞
];

export type BonusLevel = 'none' | 'bonus';

export function calcScore(erasedCount: number, cellType: number, level: number = 1): { pts: number; bonus: BonusLevel } {
  const base = erasedCount * (cellType + 1);
  const rare = erasedCount * (RARE_VALUE[cellType] ?? 0);
  let pts = base + rare;
  const hasBonus = rare > 0;
  const levelMultiplier =
    level < 3  ? 2.0 :
    level < 5  ? 2.5 :
    level < 10 ? 3.0 :
    level < 20 ? 4.0 :
    level < 30 ? 5.0 :
    level < 40 ? 6.5 :
    level < 50 ? 8.0 :
    10.0 + (level - 50) * 0.2;
  pts = Math.floor(pts * levelMultiplier);
  return { pts, bonus: hasBonus ? 'bonus' : 'none' };
}
