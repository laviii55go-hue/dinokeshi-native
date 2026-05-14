// LV別 背景画像マップ
// LVが上がるごとに背景が切り替わる。全8段階＋デフォルト＝9背景
// 素材: 恐竜数秘術プロジェクトからの流用（2026/04/20）
// v5.5.0（2026/05/14）：序盤密集配分に変更（LV14離脱対策）
// 切替Lv: 5 / 15 / 30 / 50 / 100 / 150 / 250 / 400

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
  if (level >= 400) return BG_GLACIER;      // 氷河（∞到達圏）
  if (level >= 250) return BG_DEEPSEA;      // 深海
  if (level >= 150) return BG_MINE;         // 鉱山
  if (level >= 100) return BG_WASTELAND;    // 荒野
  if (level >= 50)  return BG_RUINS;        // 遺跡
  if (level >= 30)  return BG_THUNDERCLOUD; // 雷雲
  if (level >= 15)  return BG_VOLCANO;      // 火山
  if (level >= 5)   return BG_JUNGLE;       // ジャングル
  return DEFAULT_BG;
}
