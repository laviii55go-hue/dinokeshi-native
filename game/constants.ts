export const COLS = 8;
export const ROWS = 10;

export const DINO_NAMES = [
  'ティラノサウルス',
  'ブラキオサウルス',
  'プテラノドン',
  'トリケラトプス',
  'ステゴサウルス',
  'スピノサウルス',
  'アロサウルス',
  'パキケファロサウルス',
  'モササウルス',
  'アンキロサウルス',
  'マンモス',
  'ヒト',
  'ロボット',
  'AI',
  'エイリアン',
  'ドラゴン',
  '神',
];

export const DINO_EMOJI = [
  '🦖', '🦕', '🦅', '🦏', '🐢', '🐊',
  '🦅', '🦎', '🐊', '🛡️', '🦣', '🧑',
  '🤖', '🧠', '👽', '🐉', '✨',
];

export const DINO_UNLOCK_LV = [
  0, 0, 0, 0, 0, 0,
  5, 10, 15, 20, 25, 30,
  35, 40, 60, 80, 100,
];

export const BOMB_BOARD_MAX = 2;

export function groupsNeeded(level: number): number {
  if (level < 50) return 10;
  if (level < 80) return 20;
  if (level < 100) return 30;
  return 50;
}

export function bombProbability(level: number): number {
  return level <= 3 ? 0.025 : 0.0125;
}

export function availableDinoTypes(level: number): number[] {
  const types: number[] = [];
  for (let i = 0; i < DINO_UNLOCK_LV.length; i++) {
    if (level >= DINO_UNLOCK_LV[i]) types.push(i);
  }
  return types;
}
