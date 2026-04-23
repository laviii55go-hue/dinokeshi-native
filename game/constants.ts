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
  // LV50+: basic boost reduced
  // LV70+: 1-4個で消せる恐竜（type 0-3）を厚くし、5-12個必要な恐竜を減らして詰み感を解消（v4）
  const t0cap = level >= 70 ? 1.1 : level >= 50 ? 2.2 : 3;   // type 0 (1個): ティラノ
  const t1cap = level >= 70 ? 1.3 : level >= 50 ? 1.8 : 2.5; // type 1 (2個): ブラキオ
  const starW = level >= 70 ? 1.0 : level >= 50 ? 0.9 : 1;   // type 2 (3個): プテラ ★重点
  const easyW = level >= 70 ? 0.85 : level >= 50 ? 0.9 : 1;  // type 3 (4個): トリケラ ★重点
  const baseW = level >= 70 ? 0.55 : level >= 50 ? 0.9 : 1;  // type 4-5 (5-6個): ステゴ・スピノ
  const midW  = level >= 70 ? 0.4 : 0.5;    // types 6-8 (7-9個)
  const rareW = level >= 70 ? 0.18 : 0.15;  // types 9-15 (10-16個)
  const ultraW = level >= 70 ? 0.15 : 0.1;  // types 16+ (17+個)
  const result: WeightedType[] = [
    { type: 0, weight: Math.min(t0cap, 1 + level * 0.05) },   // ティラノ
    { type: 1, weight: Math.min(t1cap, 1 + level * 0.03) },   // ブラキオ
    { type: 2, weight: starW }, { type: 3, weight: easyW },
    { type: 4, weight: baseW }, { type: 5, weight: baseW },
  ];
  if (level >= DINO_UNLOCK_LV[6])  result.push({ type: 6,  weight: midW });   // アロサウルス
  if (level >= DINO_UNLOCK_LV[7])  result.push({ type: 7,  weight: midW });   // パキケファロ
  if (level >= DINO_UNLOCK_LV[8])  result.push({ type: 8,  weight: midW });   // モササウルス
  if (level >= DINO_UNLOCK_LV[9])  result.push({ type: 9,  weight: rareW });  // アンキロ
  if (level >= DINO_UNLOCK_LV[10]) result.push({ type: 10, weight: rareW });  // マイアサウラ
  if (level >= DINO_UNLOCK_LV[11]) result.push({ type: 11, weight: rareW });  // ケツァルコアトル
  if (level >= DINO_UNLOCK_LV[12]) result.push({ type: 12, weight: rareW });  // マンモス
  if (level >= DINO_UNLOCK_LV[13]) result.push({ type: 13, weight: rareW });  // ヒト
  if (level >= DINO_UNLOCK_LV[14]) result.push({ type: 14, weight: rareW });  // ロボット
  if (level >= DINO_UNLOCK_LV[15]) result.push({ type: 15, weight: rareW });  // AI
  if (level >= DINO_UNLOCK_LV[16]) result.push({ type: 16, weight: ultraW }); // エイリアン
  if (level >= DINO_UNLOCK_LV[17]) result.push({ type: 17, weight: ultraW }); // ドラゴン
  if (level >= DINO_UNLOCK_LV[18]) result.push({ type: 18, weight: ultraW }); // ヤマタノオロチ
  if (level >= DINO_UNLOCK_LV[19]) result.push({ type: 19, weight: ultraW }); // ユニコーン
  if (level >= DINO_UNLOCK_LV[20]) result.push({ type: 20, weight: ultraW }); // フェニックス
  if (level >= DINO_UNLOCK_LV[21]) result.push({ type: 21, weight: ultraW }); // 麒麟
  if (level >= DINO_UNLOCK_LV[22]) result.push({ type: 22, weight: ultraW }); // 神
  if (level >= DINO_UNLOCK_LV[23]) result.push({ type: 23, weight: ultraW }); // 世界樹
  if (level >= DINO_UNLOCK_LV[24]) result.push({ type: 24, weight: ultraW }); // 海
  if (level >= DINO_UNLOCK_LV[25]) result.push({ type: 25, weight: ultraW }); // 大地
  if (level >= DINO_UNLOCK_LV[26]) result.push({ type: 26, weight: ultraW }); // 空
  if (level >= DINO_UNLOCK_LV[27]) result.push({ type: 27, weight: ultraW }); // 星
  if (level >= DINO_UNLOCK_LV[28]) result.push({ type: 28, weight: ultraW }); // 虚無
  if (level >= DINO_UNLOCK_LV[29]) result.push({ type: 29, weight: ultraW }); // ∞
  return result;
}
