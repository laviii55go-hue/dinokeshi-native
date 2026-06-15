import { availableDinoTypes } from './constants';
import { taCreateGrid, TA_COLS, TA_ROWS } from './timeattack-logic';
import type { GameState } from './types';

export { TA_COLS, TA_ROWS };

export const TA_DURATION = 90;
export const TA_START_LEVEL = 30;
export const TA_SCORE_MULTIPLIER = 5;

export const TA_COMBO_WINDOW_MS = 3000;
export const TA_COMBO_MULTIPLIERS = [1, 1.5, 2, 3] as const;

export const TA_INITIAL_ITEMS = {
  eraserCount: 3,
  shuffleCount: 2,
  henkouCount: 1,
  allCount: 0,
} as const;

export const TA_ITEM_PENALTY = {
  eraser: 50,
  shuffle: 100,
  henkou: 200,
  all: 500,
} as const;

export function createTimeAttackState(): GameState {
  const level = TA_START_LEVEL;
  const types = availableDinoTypes(level);
  return {
    grid: taCreateGrid(level, 1),
    level,
    score: 0,
    erasedGroups: 0,
    eraserCount: TA_INITIAL_ITEMS.eraserCount,
    shuffleCount: TA_INITIAL_ITEMS.shuffleCount,
    henkouCount: TA_INITIAL_ITEMS.henkouCount,
    allCount: TA_INITIAL_ITEMS.allCount,
    running: true,
    announcedTypes: types.map(t => t.type),
    reviveUsed: false,
  };
}
