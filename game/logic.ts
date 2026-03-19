import { COLS, ROWS, BOMB_BOARD_MAX, availableDinoTypes, bombProbability, groupsNeeded } from './constants';
import type { Cell, GameState } from './types';

// --- Grid creation ---

function countBombs(grid: Cell[][]): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c].bomb) n++;
  return n;
}

function randomCell(types: number[], allowBomb: boolean, bombProb: number): Cell {
  const type = types[Math.floor(Math.random() * types.length)];
  const bomb = allowBomb && Math.random() < bombProb;
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

  for (let c = 0; c < COLS; c++) {
    // collect existing cells from bottom
    const existing: Cell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c].type >= 0) {
        existing.push(grid[r][c]);
      }
    }
    // place from bottom
    let writeRow = ROWS - 1;
    for (const cell of existing) {
      newGrid[writeRow][c] = { ...cell };
      writeRow--;
    }
    // fill remaining from top
    const currentBombs = countBombs(newGrid);
    for (let r = writeRow; r >= 0; r--) {
      const canBomb = currentBombs < BOMB_BOARD_MAX;
      newGrid[r][c] = randomCell(types, canBomb, prob);
    }
  }

  return newGrid;
}

// --- Erase cells ---

export function eraseCells(grid: Cell[][], positions: [number, number][]): Cell[][] {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  for (const [r, c] of positions) {
    newGrid[r][c] = { type: -1, bomb: false };
  }
  return newGrid;
}

export function eraseBombCells(grid: Cell[][], destroyed: Set<number>): Cell[][] {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  for (const key of destroyed) {
    const r = Math.floor(key / COLS);
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

  // check if any group meets minimum size
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].type < 0) continue;
      const group = getGroup(grid, r, c);
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
  const basicTypes = [0, 1, 2, 3, 4, 5];
  const newGrid = grid.map(row =>
    row.map(cell => {
      if (cell.type === fromType && !cell.bomb) {
        return {
          ...cell,
          type: basicTypes[Math.floor(Math.random() * basicTypes.length)],
        };
      }
      return { ...cell };
    })
  );
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
  const oldTypes = availableDinoTypes(state.level);
  const newAllTypes = availableDinoTypes(newLevel);
  const newTypes = newAllTypes.filter(t => !oldTypes.includes(t));

  return { leveled: true, newLevel, earnedEraser, earnedShuffle, earnedHenkou, newTypes };
}

// --- Score calculation ---

export function calcScore(erasedCount: number, cellType: number): number {
  const base = erasedCount * (cellType + 1);
  const minRequired = minGroupSize(cellType);
  const bonus = erasedCount >= Math.ceil(minRequired * 1.5) ? 50 : 0;
  return base + bonus;
}
