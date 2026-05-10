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
  'マイアサウラ',
  'ケツァルコアトル',
  'マンモス',
  'ヒト',
  'ロボット',
  'AI',
  'エイリアン',
  'ドラゴン',
  'ヤマタノオロチ',
  'ユニコーン',
  'フェニックス',
  '麒麟',
  '神',
  '世界樹',
  '海',
  '大地',
  '空',
  '星',
  '虚無',
  '∞',
];

export const DINO_EMOJI = [
  '🦖', '🦕', '🦅', '🦏', '🦔', '🐊',
  '🦖', '🦖', '🐊', '🐢', '🐾',
  '🪽', '🦣',
  '🧑', '🤖', '🧠', '👽', '🐉', '🐍',
  '🦄', '🔥', '🦁',
  '✨',
  '🌳', '🌊', '⛰️', '☁️', '⭐',
  '🌌', '♾️',
];

export const DINO_UNLOCK_LV = [
  0, 0, 0, 0, 0, 0,
  5, 10, 15, 20, 25,
  30,
  35, 40, 45,
  50,
  70,
  80, 100,
  110, 120, 130,
  150,
  180,
  210,
  250,
  300,
  360,
  430,
  500,
];

export const BOMB_BOARD_MAX = 3;

export function bombBoardMax(level: number): number {
  if (level >= 100) return 4;
  return BOMB_BOARD_MAX;
}

export const START_LEVEL_PRESETS = {
  50: { score: 6400, eraserCount: 24, shuffleCount: 12, henkouCount: 3, allCount: 1 },
  70: { score: 8000, eraserCount: 34, shuffleCount: 16, henkouCount: 4, allCount: 2 },
  90: { score: 12000, eraserCount: 44, shuffleCount: 22, henkouCount: 5, allCount: 2 },
} as const;

export type StartLevelPreset = keyof typeof START_LEVEL_PRESETS;

export function groupsNeeded(_level: number): number {
  return 10;
}

export function bombProbability(_level: number): number {
  return 0.03;
}

export interface WeightedType { type: number; weight: number; }

export function availableDinoTypes(level: number): WeightedType[] {
  const t0cap = level >= 150 ? 1.5 : level >= 100 ? 1.3 : level >= 70 ? 1.1 : level >= 50 ? 2.2 : 3;
  const t1cap = level >= 150 ? 1.7 : level >= 100 ? 1.5 : level >= 70 ? 1.3 : level >= 50 ? 1.8 : 2.5;
  const starW = level >= 150 ? 1.2 : level >= 100 ? 1.1 : level >= 70 ? 1.0 : level >= 50 ? 0.9 : 1;
  const easyW = level >= 150 ? 1.05 : level >= 100 ? 0.95 : level >= 70 ? 0.85 : level >= 50 ? 0.9 : 1;
  const baseW = level >= 70 ? 0.55 : level >= 50 ? 0.9 : 1;
  const midW = level >= 70 ? 0.4 : 0.5;
  const rareW = level >= 150 ? 0.13 : level >= 100 ? 0.15 : level >= 70 ? 0.18 : 0.15;
  const ultraW = level >= 150 ? 0.10 : level >= 100 ? 0.12 : level >= 70 ? 0.15 : 0.1;

  const result: WeightedType[] = [
    { type: 0, weight: Math.min(t0cap, 1 + level * 0.05) },
    { type: 1, weight: Math.min(t1cap, 1 + level * 0.03) },
    { type: 2, weight: starW },
    { type: 3, weight: easyW },
    { type: 4, weight: baseW },
    { type: 5, weight: baseW },
  ];

  if (level >= DINO_UNLOCK_LV[6]) result.push({ type: 6, weight: midW });
  if (level >= DINO_UNLOCK_LV[7]) result.push({ type: 7, weight: midW });
  if (level >= DINO_UNLOCK_LV[8]) result.push({ type: 8, weight: midW });
  if (level >= DINO_UNLOCK_LV[9]) result.push({ type: 9, weight: rareW });
  if (level >= DINO_UNLOCK_LV[10]) result.push({ type: 10, weight: rareW });
  if (level >= DINO_UNLOCK_LV[11]) result.push({ type: 11, weight: rareW });
  if (level >= DINO_UNLOCK_LV[12]) result.push({ type: 12, weight: rareW });
  if (level >= DINO_UNLOCK_LV[13]) result.push({ type: 13, weight: rareW });
  if (level >= DINO_UNLOCK_LV[14]) result.push({ type: 14, weight: rareW });
  if (level >= DINO_UNLOCK_LV[15]) result.push({ type: 15, weight: rareW });
  if (level >= DINO_UNLOCK_LV[16]) result.push({ type: 16, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[17]) result.push({ type: 17, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[18]) result.push({ type: 18, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[19]) result.push({ type: 19, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[20]) result.push({ type: 20, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[21]) result.push({ type: 21, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[22]) result.push({ type: 22, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[23]) result.push({ type: 23, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[24]) result.push({ type: 24, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[25]) result.push({ type: 25, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[26]) result.push({ type: 26, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[27]) result.push({ type: 27, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[28]) result.push({ type: 28, weight: ultraW });
  if (level >= DINO_UNLOCK_LV[29]) result.push({ type: 29, weight: ultraW });

  return result;
}
