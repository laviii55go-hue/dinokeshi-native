export const COLS = 8;
export const ROWS = 10;

export const DINO_NAMES = [
  'ティラノサウルス',      // 0
  'ブラキオサウルス',      // 1
  'プテラノドン',          // 2
  'トリケラトプス',        // 3
  'ステゴサウルス',        // 4
  'スピノサウルス',        // 5
  'アロサウルス',          // 6
  'パキケファロサウルス',  // 7
  'モササウルス',          // 8
  'アンキロサウルス',      // 9
  'マイアサウラ',          // 10
  'ケツァルコアトル',      // 11
  'マンモス',              // 12
  'ヒト',                  // 13
  'ロボット',              // 14
  'AI',                    // 15
  'エイリアン',            // 16
  'ドラゴン',              // 17
  'ヤマタノオロチ',        // 18
  'ユニコーン',            // 19
  'フェニックス',          // 20
  '麒麟',                  // 21
  '神',                    // 22
  '世界樹',                // 23
  '海',                    // 24
  '大地',                  // 25
  '空',                    // 26
  '星',                    // 27
  '虚無',                  // 28
  '∞',                    // 29
];

export const DINO_EMOJI = [
  '🦖', '🦕', '🦅', '🦏', '🐢', '🐊',    // 0-5
  '🦅', '🦎', '🐊', '🛡️', '🥚',           // 6-10
  '🐦', '🦣',                                // 11-12
  '🧑', '🤖', '🧠', '👽', '🐉', '🐍',    // 13-18
  '🦄', '🔥', '🦌',                         // 19-21
  '✨',                                       // 22
  '🌳', '🌊', '🏔️', '🌤️', '⭐',          // 23-27
  '🕳️', '♾️',                               // 28-29
];

export const DINO_UNLOCK_LV = [
  0, 0, 0, 0, 0, 0,          // 0-5:   初期
  5, 10, 15, 20, 25,          // 6-10:  変更なし
  30,                          // 11:    ケツァルコアトル
  35, 40, 45,                  // 12-14: マンモス/ヒト/ロボット
  50,                          // 15:    AI
  70,                          // 16:    エイリアン
  80, 100,                     // 17-18: ドラゴン/ヤマタノオロチ
  110, 120, 130,               // 19-21: ユニコーン/フェニックス/麒麟
  150,                         // 22:    神
  180,                         // 23:    世界樹
  210,                         // 24:    海
  250,                         // 25:    大地
  300,                         // 26:    空
  360,                         // 27:    星
  430,                         // 28:    虚無
  500,                         // 29:    ∞
];

export const BOMB_BOARD_MAX = 3;

export function groupsNeeded(_level: number): number {
  return 10;
}

export function bombProbability(_level: number): number {
  return 0.03;
}

export interface WeightedType { type: number; weight: number; }

export function availableDinoTypes(level: number): WeightedType[] {
  // LV50+: basic boost reduced, LV70+: further reduced
  const t0cap = level >= 70 ? 1.8 : level >= 50 ? 2.2 : 3;
  const t1cap = level >= 70 ? 1.5 : level >= 50 ? 1.8 : 2.5;
  const baseW = level >= 70 ? 0.8 : level >= 50 ? 0.9 : 1;
  const result: WeightedType[] = [
    { type: 0, weight: Math.min(t0cap, 1 + level * 0.05) },   // ティラノ
    { type: 1, weight: Math.min(t1cap, 1 + level * 0.03) },   // ブラキオ
    { type: 2, weight: baseW }, { type: 3, weight: baseW },
    { type: 4, weight: baseW }, { type: 5, weight: baseW },
  ];
  if (level >= DINO_UNLOCK_LV[6])  result.push({ type: 6,  weight: 0.5 });   // アロサウルス
  if (level >= DINO_UNLOCK_LV[7])  result.push({ type: 7,  weight: 0.5 });   // パキケファロ
  if (level >= DINO_UNLOCK_LV[8])  result.push({ type: 8,  weight: 0.5 });   // モササウルス
  if (level >= DINO_UNLOCK_LV[9])  result.push({ type: 9,  weight: 0.15 });  // アンキロ
  if (level >= DINO_UNLOCK_LV[10]) result.push({ type: 10, weight: 0.15 });  // マイアサウラ
  if (level >= DINO_UNLOCK_LV[11]) result.push({ type: 11, weight: 0.15 });  // ケツァルコアトル
  if (level >= DINO_UNLOCK_LV[12]) result.push({ type: 12, weight: 0.15 });  // マンモス
  if (level >= DINO_UNLOCK_LV[13]) result.push({ type: 13, weight: 0.15 });  // ヒト
  if (level >= DINO_UNLOCK_LV[14]) result.push({ type: 14, weight: 0.15 });  // ロボット
  if (level >= DINO_UNLOCK_LV[15]) result.push({ type: 15, weight: 0.15 });  // AI
  if (level >= DINO_UNLOCK_LV[16]) result.push({ type: 16, weight: 0.1 });   // エイリアン
  if (level >= DINO_UNLOCK_LV[17]) result.push({ type: 17, weight: 0.1 });   // ドラゴン
  if (level >= DINO_UNLOCK_LV[18]) result.push({ type: 18, weight: 0.1 });   // ヤマタノオロチ
  if (level >= DINO_UNLOCK_LV[19]) result.push({ type: 19, weight: 0.1 });   // ユニコーン
  if (level >= DINO_UNLOCK_LV[20]) result.push({ type: 20, weight: 0.1 });   // フェニックス
  if (level >= DINO_UNLOCK_LV[21]) result.push({ type: 21, weight: 0.1 });   // 麒麟
  if (level >= DINO_UNLOCK_LV[22]) result.push({ type: 22, weight: 0.1 });   // 神
  if (level >= DINO_UNLOCK_LV[23]) result.push({ type: 23, weight: 0.1 });   // 世界樹
  if (level >= DINO_UNLOCK_LV[24]) result.push({ type: 24, weight: 0.1 });   // 海
  if (level >= DINO_UNLOCK_LV[25]) result.push({ type: 25, weight: 0.1 });   // 大地
  if (level >= DINO_UNLOCK_LV[26]) result.push({ type: 26, weight: 0.1 });   // 空
  if (level >= DINO_UNLOCK_LV[27]) result.push({ type: 27, weight: 0.1 });   // 星
  if (level >= DINO_UNLOCK_LV[28]) result.push({ type: 28, weight: 0.1 });   // 虚無
  if (level >= DINO_UNLOCK_LV[29]) result.push({ type: 29, weight: 0.1 });   // ∞
  return result;
}
