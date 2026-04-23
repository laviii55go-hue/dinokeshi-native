// LV別 背景画像マップ
// LVが上がるごとに背景が切り替わる。全8段階＋デフォルト＝9背景
// 素材: 恐竜数秘術プロジェクトからの流用（2026/04/20）

const DEFAULT_BG = require('../assets/images/bg.png');

const BG_JUNGLE = require('../assets/images/bg_levels/bg_jungle.webp');
const BG_VOLCANO = require('../assets/images/bg_levels/bg_volcano.webp');
const BG_THUNDERCLOUD = require('../assets/images/bg_levels/bg_thundercloud.webp');
const BG_RUINS = require('../assets/images/bg_levels/bg_ruins.webp');
const BG_WASTELAND = require('../assets/images/bg_levels/bg_wasteland.webp');
const BG_MINE = require('../assets/images/bg_levels/bg_mine.webp');
const BG_DEEPSEA = require('../assets/images/bg_levels/bg_deepsea.webp');
const BG_GLACIER = require('../assets/images/bg_levels/bg_glacier.webp');

export function getBgByLevel(level: number) {
  if (level >= 500) return BG_GLACIER;      // ∞到達圏
  if (level >= 400) return BG_DEEPSEA;
  if (level >= 300) return BG_MINE;
  if (level >= 250) return BG_WASTELAND;
  if (level >= 200) return BG_RUINS;
  if (level >= 150) return BG_THUNDERCLOUD; // 伝説キャラ解放と同期
  if (level >= 100) return BG_VOLCANO;
  if (level >= 50)  return BG_JUNGLE;
  return DEFAULT_BG;
}
