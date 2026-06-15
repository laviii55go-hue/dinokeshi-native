import type { Language } from './storage';

let currentLang: Language = 'ja';

export function setLanguage(lang: Language) { currentLang = lang; }
export function getLanguage(): Language { return currentLang; }

const ja: Record<string, string> = {
  // Home
  app_title: '🦕 恐竜けし',
  app_subtitle: 'つながると消せる、やみつき恐竜パズル',
  mode_normal: '🦕 通常モード',
  mode_ta: '⏱ タイムアタック',
  mode_ta_sub: '90秒スピード勝負！ スコア5倍＋コンボ',
  how_to_play: '❓ 遊び方',

  // Common game
  game_start: 'ゲームスタート！',
  loading: '読み込み中...',
  score_label: 'スコア',
  level_label: 'レベル',
  cancel: 'キャンセル',
  close: '閉じる',
  save: '保存',
  skip: 'スキップ',
  decide: '決定！',

  // Game over / Modals
  game_over: 'GAME OVER',
  time_up: 'TIME UP!',
  play_again: 'もう一度プレイ',
  back_to_title: 'タイトルに戻る',
  check_ranking: '🏆 ランキングを確認',

  // Retire / Exit
  retire: 'リタイア',
  retire_confirm: '本当にリタイアしますか？',
  exit: '終了',
  exit_normal: 'ゲームを保存して戻りますか？',
  exit_normal_save: '保存して戻る',
  exit_ta: 'タイムアタックを終了しますか？\n（スコアは保存されません）',
  exit_ta_confirm: '終了する',

  // Revive
  revive_premium: '💎 アイテムを使って再開',
  revive_ad: '🎬 広告を見てアイテムGET',
  revive_reward: 'を獲得してゲーム再開！',
  revive_exit: 'そのまま終了',
  revive_premium_promo: '💎 Premiumなら広告なしで毎回アイテムGET！',
  revive_success: '復活！ アイテムGET！',

  // Name prompt
  name_prompt_title: 'プレイヤー名を登録',
  name_prompt_subtitle: 'グローバルランキングに参加できます',
  name_placeholder: '名前を入力（最大12文字）',
  name_change_hint: '※後から設定画面で変更できます',
  name_shared_hint: '※通常モードと共通です',

  // Start level
  start_level_title: '次のゲームをどこから始めますか？',
  start_level_from: 'から',
  start_level_note: 'LV1はスコア0 / アイテム0。LV10以上は初期アイテム付き。',

  // Items
  shuffle: 'シャッフル！',
  exchange_title: 'アイテム交換',
  exchange_del_chg: 'DEL×10 → CHG×1',
  exchange_del_all: 'DEL×15 → ALL×1',
  exchange_chg_done: 'DEL×10 → CHG×1 交換完了！',
  exchange_all_done: 'DEL×15 → ALL×1 交換完了！',

  // Hints
  hint_volcano: '🌋 ボルケーノをタップ！',
  hint_erase: '{0}を{1}個消せる！',
  hint_use_item: 'アイテムを使おう！',

  // Mode indicators
  mode_del: '🔴 DEL: 消したいセルをタップ',
  mode_chg: '🟡 CHG: 変換する恐竜をタップ',
  mode_all: '🔴 ALL: 全消去する恐竜をタップ',

  // Character
  char_footer: '登場キャラクター',
  char_desc: '数字: {0}（{0}個つながると消せる）',
  char_unlock_initial: '初期から使用可能',
  char_unlock_lv: 'LV{0}で解放',
  char_unlock_msg: '{0} 解放！',
  char_all_unlocked: '🎉 全キャラ解放！',
  char_next_unlock: '次の出現まで あと {0}Lv',
  volcano_max: '火山上限+{0}',

  // Time Attack
  ta_label: '⏱ タイムアタック',
  ta_score_multiplier: '⏱ タイムアタック ×{0}',
  ta_combo: '🔥 COMBO ×{0}',
  ta_start_title: 'タイムアタック',
  ta_start_desc: '{0}秒 × スコア{1}倍 + コンボ',
  ta_start_btn: 'スタート',
  ta_pause_title: '一時停止中',
  ta_pause_desc: 'タップで再開',
  ta_resume: '再開',
  ta_level_note: '（開始 LV30）',
  ta_best: '🏆 ベストスコア',

  // Ranking
  ranking_title: '🏆 ランキング',
  ranking_ta_title: '🏆 タイムアタック ランキング',
  ranking_local: '📱 端末',
  ranking_global: '🌍 グローバル',
  ranking_daily: 'デイリー',
  ranking_weekly: '週間',
  ranking_monthly: '月間',
  ranking_pos: '順位',
  ranking_score: 'スコア',
  ranking_player: 'プレイヤー',
  ranking_lv: 'LV',
  ranking_date: '日付',
  ranking_empty: 'まだ記録がありません',
  ranking_name_required: '設定でプレイヤー名を登録すると参加できます',

  // Settings
  settings_title: '⚙ 設定',
  settings_sound: '🔊 効果音',
  settings_numsize: '🔢 数値サイズ',
  settings_bgm: '🎵 BGM',
  settings_haptics: '📳 振動',
  settings_drop_anim: '🫧 落下アニメ',
  settings_unlock_anim: '⚡ キャラ解放演出',
  settings_player_name: '🏷 プレイヤー名',
  settings_name_current: '現在: {0}',
  settings_name_none: '未設定',
  settings_name_placeholder: '名前を入力',
  settings_premium: '💎 Premium',
  settings_premium_active: 'Premium 有効 ✅',
  settings_premium_desc: '広告OFF ＋ ゲームオーバー復活特典',
  settings_premium_buy: 'Premiumを購入する',
  settings_premium_restore: '購入を復元する',
  settings_max_lv: '🏆 最高到達LV',
  settings_language: '🌐 言語',
  settings_debug: '🛠 デバッグ',
  on: 'ON',
  off: 'OFF',

  // Volume
  vol_mute: '消',
  vol_low: '小',
  vol_mid: '中',
  vol_high: '大',

  // Number size
  numsize_sm: '小',
  numsize_md: '中',
  numsize_lg: '大',
  numsize_xl: '特大',

  // Purchase (AdContext)
  purchase_success_title: '購入完了',
  purchase_success_msg: 'Premiumが有効になりました！\n広告OFF＋ゲームオーバー復活特典が使えます',
  purchase_fail_title: '購入できませんでした',
  purchase_error_title: 'エラー',
  purchase_error_msg: '購入処理中にエラーが発生しました: {0}',
  restore_success_title: '復元完了',
  restore_success_msg: 'Premiumが復元されました！',
  restore_fail_title: '復元結果',
  restore_fail_msg: '復元可能な購入が見つかりませんでした。',

  // Menu
  menu_rules: '📖 遊び方',
  menu_settings: '⚙ 設定',
  menu_retire: '🚪 リタイア',
  menu_home: '🏠 タイトルに戻る',

  // Tutorial
  tut_welcome: 'ようこそ！',
  tut_welcome_body: '恐竜けしは、同じ種類の恐竜を\nつなげて消すパズルゲームです。\n\nたくさん消してハイスコアを目指そう！',
  tut_howto: 'あそびかた',
  tut_howto_body: '恐竜にはそれぞれ数字があります。\nその数字の数だけ同じ恐竜を\nつなげると消せます！\n\n数字が大きい恐竜ほど消しにくいけど\n高得点！',
  tut_items: 'アイテムを使おう',
  tut_items_body: 'レベルアップでアイテムがもらえます。\n\nDEL … 1匹だけ消す\nMIX … 盤面シャッフル\nCHG … 種類を変える\nALL … 同じ種類を全部消す\n\n困ったときに使ってみよう！',
  tut_ta: 'タイムアタック！',
  tut_ta_body: '90秒のスピード勝負モード！\n\nスコア5倍＋コンボでさらに倍率UP。\n素早く消して最高スコアを狙おう！\n\n世界ランキングにも挑戦できるよ！',
  tut_start: 'さあ、はじめよう！',
  tut_start_body: '通常モードでじっくり遊ぶもよし、\nタイムアタックで熱くなるもよし。\n\nきみだけの恐竜パズルを楽しもう！',
  tut_next: 'つぎへ',
  tut_begin: 'はじめる！',
};

const en: Record<string, string> = {
  // Home
  app_title: '🦕 Dino Keshi',
  app_subtitle: 'Connect & erase — addictive dino puzzle',
  mode_normal: '🦕 Normal Mode',
  mode_ta: '⏱ Time Attack',
  mode_ta_sub: '90 sec speed battle! Score ×5 + Combo',
  how_to_play: '❓ How to Play',

  // Common game
  game_start: 'Game Start!',
  loading: 'Loading...',
  score_label: 'Score',
  level_label: 'Level',
  cancel: 'Cancel',
  close: 'Close',
  save: 'Save',
  skip: 'Skip',
  decide: 'OK!',

  // Game over / Modals
  game_over: 'GAME OVER',
  time_up: 'TIME UP!',
  play_again: 'Play Again',
  back_to_title: 'Back to Title',
  check_ranking: '🏆 Rankings',

  // Retire / Exit
  retire: 'Retire',
  retire_confirm: 'Are you sure you want to retire?',
  exit: 'Exit',
  exit_normal: 'Save and return to title?',
  exit_normal_save: 'Save & Return',
  exit_ta: 'Exit Time Attack?\n(Score will not be saved)',
  exit_ta_confirm: 'Exit',

  // Revive
  revive_premium: '💎 Use items to continue',
  revive_ad: '🎬 Watch ad for items',
  revive_reward: ' to continue!',
  revive_exit: 'End game',
  revive_premium_promo: '💎 Premium: items every time, no ads!',
  revive_success: 'Revived! Items GET!',

  // Name prompt
  name_prompt_title: 'Register Player Name',
  name_prompt_subtitle: 'Join the global rankings',
  name_placeholder: 'Enter name (max 12 chars)',
  name_change_hint: '* You can change it later in Settings',
  name_shared_hint: '* Shared with Normal Mode',

  // Start level
  start_level_title: 'Where do you want to start?',
  start_level_from: '',
  start_level_note: 'LV1: Score 0 / No items. LV10+: Starting items included.',

  // Items
  shuffle: 'Shuffle!',
  exchange_title: 'Item Exchange',
  exchange_del_chg: 'DEL×10 → CHG×1',
  exchange_del_all: 'DEL×15 → ALL×1',
  exchange_chg_done: 'DEL×10 → CHG×1 Exchanged!',
  exchange_all_done: 'DEL×15 → ALL×1 Exchanged!',

  // Hints
  hint_volcano: '🌋 Tap the Volcano!',
  hint_erase: 'Erase {1} {0}!',
  hint_use_item: 'Try using an item!',

  // Mode indicators
  mode_del: '🔴 DEL: Tap a cell to erase',
  mode_chg: '🟡 CHG: Tap a dino to convert',
  mode_all: '🔴 ALL: Tap a dino to erase all',

  // Character
  char_footer: 'Characters',
  char_desc: 'Number: {0} (connect {0} to erase)',
  char_unlock_initial: 'Available from start',
  char_unlock_lv: 'Unlocked at LV{0}',
  char_unlock_msg: '{0} Unlocked!',
  char_all_unlocked: '🎉 All Characters Unlocked!',
  char_next_unlock: 'Next unlock in {0} Lv',
  volcano_max: 'Volcano cap +{0}',

  // Time Attack
  ta_label: '⏱ Time Attack',
  ta_score_multiplier: '⏱ Time Attack ×{0}',
  ta_combo: '🔥 COMBO ×{0}',
  ta_start_title: 'Time Attack',
  ta_start_desc: '{0}s × Score {1}x + Combo',
  ta_start_btn: 'START',
  ta_pause_title: 'Paused',
  ta_pause_desc: 'Tap to resume',
  ta_resume: 'Resume',
  ta_level_note: '(Start LV30)',
  ta_best: '🏆 Best Scores',

  // Ranking
  ranking_title: '🏆 Rankings',
  ranking_ta_title: '🏆 Time Attack Rankings',
  ranking_local: '📱 Local',
  ranking_global: '🌍 Global',
  ranking_daily: 'Daily',
  ranking_weekly: 'Weekly',
  ranking_monthly: 'Monthly',
  ranking_pos: 'Rank',
  ranking_score: 'Score',
  ranking_player: 'Player',
  ranking_lv: 'LV',
  ranking_date: 'Date',
  ranking_empty: 'No records yet',
  ranking_name_required: 'Register a player name in Settings to participate',

  // Settings
  settings_title: '⚙ Settings',
  settings_sound: '🔊 Sound',
  settings_numsize: '🔢 Number Size',
  settings_bgm: '🎵 BGM',
  settings_haptics: '📳 Haptics',
  settings_drop_anim: '🫧 Drop Animation',
  settings_unlock_anim: '⚡ Unlock Animation',
  settings_player_name: '🏷 Player Name',
  settings_name_current: 'Current: {0}',
  settings_name_none: 'Not set',
  settings_name_placeholder: 'Enter name',
  settings_premium: '💎 Premium',
  settings_premium_active: 'Premium Active ✅',
  settings_premium_desc: 'Ad-free + Game Over revival',
  settings_premium_buy: 'Buy Premium',
  settings_premium_restore: 'Restore Purchase',
  settings_max_lv: '🏆 Highest LV',
  settings_language: '🌐 Language',
  settings_debug: '🛠 Debug',
  on: 'ON',
  off: 'OFF',

  // Volume
  vol_mute: 'Off',
  vol_low: 'Low',
  vol_mid: 'Mid',
  vol_high: 'High',

  // Number size
  numsize_sm: 'S',
  numsize_md: 'M',
  numsize_lg: 'L',
  numsize_xl: 'XL',

  // Purchase (AdContext)
  purchase_success_title: 'Purchase Complete',
  purchase_success_msg: 'Premium activated!\nAd-free + Game Over revival available',
  purchase_fail_title: 'Purchase Failed',
  purchase_error_title: 'Error',
  purchase_error_msg: 'An error occurred during purchase: {0}',
  restore_success_title: 'Restore Complete',
  restore_success_msg: 'Premium has been restored!',
  restore_fail_title: 'Restore Result',
  restore_fail_msg: 'No restorable purchases found.',

  // Menu
  menu_rules: '📖 How to Play',
  menu_settings: '⚙ Settings',
  menu_retire: '🚪 Retire',
  menu_home: '🏠 Back to Title',

  // Tutorial
  tut_welcome: 'Welcome!',
  tut_welcome_body: 'Dino Keshi is a puzzle game where you\nconnect same-type dinosaurs to erase them.\n\nAim for the highest score!',
  tut_howto: 'How to Play',
  tut_howto_body: 'Each dinosaur has a number.\nConnect that many of the same dino\nto erase them!\n\nHigher numbers are harder to erase\nbut worth more points!',
  tut_items: 'Use Items',
  tut_items_body: 'Level up to earn items.\n\nDEL … Erase one cell\nMIX … Shuffle the board\nCHG … Change a type\nALL … Erase all of one type\n\nUse them when you\'re stuck!',
  tut_ta: 'Time Attack!',
  tut_ta_body: '90-second speed challenge!\n\nScore ×5 + combo multiplier.\nErase fast for the best score!\n\nCompete on the global leaderboard!',
  tut_start: 'Let\'s Go!',
  tut_start_body: 'Take it slow in Normal Mode,\nor go full speed in Time Attack.\n\nEnjoy your own dino puzzle adventure!',
  tut_next: 'Next',
  tut_begin: 'Start!',
};

const DINO_NAMES_JA = [
  'ティラノサウルス', 'ブラキオサウルス', 'プテラノドン',
  'トリケラトプス', 'ステゴサウルス', 'スピノサウルス',
  'アロサウルス', 'パキケファロサウルス', 'モササウルス',
  'アンキロサウルス', 'マイアサウラ', 'ケツァルコアトル',
  'マンモス', 'ヒト', 'ロボット', 'AI', 'エイリアン',
  'ドラゴン', 'ヤマタノオロチ', 'ユニコーン',
  'フェニックス', '麒麟', '神', '世界樹',
  '海', '大地', '空', '星', '虚無', '∞',
];

const DINO_NAMES_EN = [
  'Tyrannosaurus', 'Brachiosaurus', 'Pteranodon',
  'Triceratops', 'Stegosaurus', 'Spinosaurus',
  'Allosaurus', 'Pachycephalosaurus', 'Mosasaurus',
  'Ankylosaurus', 'Maiasaura', 'Quetzalcoatlus',
  'Mammoth', 'Human', 'Robot', 'AI', 'Alien',
  'Dragon', 'Yamata no Orochi', 'Unicorn',
  'Phoenix', 'Qilin', 'God', 'World Tree',
  'Ocean', 'Earth', 'Sky', 'Star', 'Void', '∞',
];

const translations: Record<Language, Record<string, string>> = { ja, en };

export function t(key: string): string {
  return translations[currentLang]?.[key] ?? translations.ja[key] ?? key;
}

export function tf(key: string, ...args: (string | number)[]): string {
  let s = t(key);
  args.forEach((v, i) => { s = s.replace(`{${i}}`, String(v)); });
  return s;
}

export function dinoName(index: number): string {
  const names = currentLang === 'en' ? DINO_NAMES_EN : DINO_NAMES_JA;
  return names[index] ?? `Dino ${index}`;
}
