export const COLS = 8;
export const ROWS = 10;

export function getBoardCols(level: number): number {
  if (level < 10) return 5;
  if (level < 50) return 6;
  if (level < 100) return 7;
  return 8;
}

export function getBoardRows(level: number): number {
  if (level < 10) return 7;
  if (level < 50) return 8;
  if (level < 100) return 9;
  return 10;
}

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
  '時空',
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
  '⏳',
  '🌳', '🌊', '⛰️', '☁️', '⭐',
  '🌌', '♾️',
];

export const DINO_UNLOCK_LV = [
  0, 0, 0, 0, 0, 3,
  5, 11, 15, 20, 25,
  30,
  35, 40, 45,
  51,
  70,
  80, 101,
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

// 次のキャラ解放情報を返す
// 戻り値: { nextLevel, remaining, nextType } | null（最大解放済み）
export interface NextUnlockInfo {
  nextLevel: number;
  remaining: number;
  nextType: number;
}

export function getNextUnlockInfo(currentLevel: number): NextUnlockInfo | null {
  for (let type = 0; type < DINO_UNLOCK_LV.length; type++) {
    const unlockLv = DINO_UNLOCK_LV[type];
    if (unlockLv > currentLevel) {
      return {
        nextLevel: unlockLv,
        remaining: unlockLv - currentLevel,
        nextType: type,
      };
    }
  }
  return null; // すべて解放済み
}

export const BOMB_BOARD_MAX = 3;

export function bombBoardMax(level: number): number {
  if (level >= 100) return 4;
  return BOMB_BOARD_MAX;
}

export const START_LEVEL_PRESETS = {
  10: { score: 1100, eraserCount: 4, shuffleCount: 1, henkouCount: 0, allCount: 0 },
  30: { score: 5800, eraserCount: 9, shuffleCount: 4, henkouCount: 1, allCount: 0 },
  50: { score: 17000, eraserCount: 15, shuffleCount: 7, henkouCount: 1, allCount: 1 },
  70: { score: 41000, eraserCount: 22, shuffleCount: 11, henkouCount: 2, allCount: 1 },
  90: { score: 88000, eraserCount: 28, shuffleCount: 14, henkouCount: 2, allCount: 2 },
  100: { score: 136000, eraserCount: 31, shuffleCount: 16, henkouCount: 3, allCount: 2 },
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
  ];

  if (level >= DINO_UNLOCK_LV[5]) result.push({ type: 5, weight: baseW });
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
