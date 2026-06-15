import { availableDinoTypes, bombBoardMax, bombProbability } from './constants';
import { minGroupSize } from './logic';
import type { Cell } from './types';

export const TA_COLS = 6;
export const TA_ROWS = 8;

let cellGenCounter = 100000;

interface WeightedType { type: number; weight: number; }

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

export function taCreateGrid(level: number, maxInitBombs = 1): Cell[][] {
  const types = availableDinoTypes(level);
  const prob = bombProbability(level);
  const grid: Cell[][] = [];
  let bombs = 0;
  for (let r = 0; r < TA_ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < TA_COLS; c++) {
      const canBomb = bombs < maxInitBombs;
      const cell = randomCell(types, canBomb, prob);
      if (cell.bomb) bombs++;
      row.push(cell);
    }
    grid.push(row);
  }
  return grid;
}

export function taGetGroup(grid: Cell[][], sr: number, sc: number): [number, number][] {
  const cell = grid[sr][sc];
  if (cell.bomb) return [];
  const target = cell.type;
  const seen = new Set<number>();
  const queue: [number, number][] = [[sr, sc]];
  const group: [number, number][] = [];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = r * TA_COLS + c;
    if (seen.has(key)) continue;
    if (r < 0 || r >= TA_ROWS || c < 0 || c >= TA_COLS) continue;
    const g = grid[r][c];
    if (g.bomb || g.type !== target) continue;
    seen.add(key);
    group.push([r, c]);
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return group;
}

export interface TABombResult {
  destroyed: Set<number>;
  chainBombs: [number, number][];
}

export function taExplodeBomb(grid: Cell[][], br: number, bc: number): TABombResult {
  const destroyed = new Set<number>();
  const chainBombs: [number, number][] = [[br, bc]];
  const visited = new Set<number>();
  const queue: [number, number][] = [[br, bc]];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = r * TA_COLS + c;
    if (visited.has(key)) continue;
    visited.add(key);
    for (let cc = 0; cc < TA_COLS; cc++) destroyed.add(r * TA_COLS + cc);
    for (let rr = 0; rr < TA_ROWS; rr++) destroyed.add(rr * TA_COLS + c);
    for (let cc = 0; cc < TA_COLS; cc++) {
      if (grid[r][cc].bomb && !visited.has(r * TA_COLS + cc)) {
        queue.push([r, cc]);
        chainBombs.push([r, cc]);
      }
    }
    for (let rr = 0; rr < TA_ROWS; rr++) {
      if (grid[rr][c].bomb && !visited.has(rr * TA_COLS + c)) {
        queue.push([rr, c]);
        chainBombs.push([rr, c]);
      }
    }
  }
  return { destroyed, chainBombs };
}

export function taApplyGravityAndRefill(grid: Cell[][], level: number): Cell[][] {
  const types = availableDinoTypes(level);
  const prob = bombProbability(level);
  const newGrid: Cell[][] = Array.from({ length: TA_ROWS }, () =>
    Array.from({ length: TA_COLS }, () => ({ type: -1, bomb: false }))
  );
  let existingBombs = 0;
  for (let r = 0; r < TA_ROWS; r++)
    for (let c = 0; c < TA_COLS; c++)
      if (grid[r][c].type >= 0 && grid[r][c].bomb) existingBombs++;
  let bombCount = existingBombs;
  for (let c = 0; c < TA_COLS; c++) {
    const existing: Cell[] = [];
    for (let r = TA_ROWS - 1; r >= 0; r--) {
      if (grid[r][c].type >= 0) existing.push(grid[r][c]);
    }
    let writeRow = TA_ROWS - 1;
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

export function taEraseCells(grid: Cell[][], positions: [number, number][]): Cell[][] {
  const newGrid = grid.map(row => [...row]);
  for (const [r, c] of positions) {
    newGrid[r][c] = { type: -1, bomb: false };
  }
  return newGrid;
}

export function taEraseBombCells(grid: Cell[][], destroyed: Set<number>): Cell[][] {
  const newGrid = grid.map(row => [...row]);
  for (const key of destroyed) {
    const r = (key / TA_COLS) | 0;
    const c = key % TA_COLS;
    newGrid[r][c] = { type: -1, bomb: false };
  }
  return newGrid;
}

export function taHasValidMoves(grid: Cell[][]): boolean {
  for (let r = 0; r < TA_ROWS; r++)
    for (let c = 0; c < TA_COLS; c++)
      if (grid[r][c].bomb) return true;
  const visited = new Set<number>();
  for (let r = 0; r < TA_ROWS; r++) {
    for (let c = 0; c < TA_COLS; c++) {
      const key = r * TA_COLS + c;
      if (visited.has(key) || grid[r][c].type < 0) continue;
      const group = taGetGroup(grid, r, c);
      for (const [gr, gc] of group) visited.add(gr * TA_COLS + gc);
      if (group.length >= minGroupSize(grid[r][c].type)) return true;
    }
  }
  return false;
}

export function taShuffleGrid(grid: Cell[][]): Cell[][] {
  const cells: Cell[] = [];
  for (let r = 0; r < TA_ROWS; r++)
    for (let c = 0; c < TA_COLS; c++)
      cells.push({ ...grid[r][c] });
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const newGrid: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < TA_ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < TA_COLS; c++) {
      row.push(cells[idx++]);
    }
    newGrid.push(row);
  }
  return newGrid;
}

export function taEraseAllOfType(grid: Cell[][], targetType: number): { newGrid: Cell[][]; erasedCount: number } {
  const newGrid = grid.map(row => [...row]);
  let erasedCount = 0;
  for (let r = 0; r < TA_ROWS; r++) {
    for (let c = 0; c < TA_COLS; c++) {
      if (newGrid[r][c].type === targetType && !newGrid[r][c].bomb) {
        newGrid[r][c] = { type: -1, bomb: false };
        erasedCount++;
      }
    }
  }
  return { newGrid, erasedCount };
}

export function taConvertType(grid: Cell[][], fromType: number): Cell[][] {
  const basicTypes = [0, 1, 2, 3, 4, 5].filter(t => t !== fromType);
  const targetType = basicTypes[Math.floor(Math.random() * basicTypes.length)];
  const newGrid = grid.map(row => [...row]);
  for (let r = 0; r < TA_ROWS; r++)
    for (let c = 0; c < TA_COLS; c++)
      if (newGrid[r][c].type === fromType && !newGrid[r][c].bomb)
        newGrid[r][c] = { type: targetType, bomb: false, gen: newGrid[r][c].gen };
  return newGrid;
}
