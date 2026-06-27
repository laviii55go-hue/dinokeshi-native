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
  exchange_del_mix: 'DEL×5 → MIX×1',
  exchange_del_chg: 'DEL×10 → CHG×1',
  exchange_del_all: 'DEL×15 → ALL×1',
  exchange_mix_done: 'DEL×5 → MIX×1 交換完了！',
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
  char_next_unlock: '次のLVは {0}',
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

  // Bonus popup
  bonus_popup: '✨ ボーナス!',

  // Rules
  rules_header: '📖 遊び方',
  rules_nav_prev: '◀ 前へ',
  rules_nav_next: '次へ ▶',
  rules_s1_title: '① 基本ルール',
  rules_s1_body: '同じ種類の恐竜が「表示の数」と同じ数だけつながっているときにタップで消せます。',
  rules_th_dino: '恐竜',
  rules_th_display: '表示',
  rules_th_required: '必要な連結数',
  rules_single_ok: '{0}個（単体でOK）',
  rules_n_or_more: '{0}個以上',
  rules_s1_tip: '💡 タップすると消えるグループが黄色でハイライトされます！',
  rules_s2_title: '② スコアのしくみ',
  rules_s2_body1: 'スコアは **消えた枚数 × 表示の数値** で加算されます。',
  rules_s2_body2: 'グループが大きいほど、また表示数値が大きい恐竜ほど**高得点**！',
  rules_s2_rare: '✨ **レアボーナス**\nスピノサウルス以上の恐竜を消すとレアボーナス加算！\n難しい恐竜ほど高ボーナス\n\n📈 **レベル係数**：最初からスコアUP！\nLV1:×2 → LV10:×4 → LV50:×10 → LV100+:×20〜',
  rules_s2_tip: '💡 ティラノサウルス（表示1）は1個から消せるので詰まったときの救済にも！',
  rules_s3_title: '③ 噴火 🌋',
  rules_s3_body1: '🌋をタップすると、その噴火がある**縦一列＋横一列**を一気に消します。',
  rules_s3_body2: '🌋 隣の噴火に連鎖して一気に爆発することも！',
  rules_s3_tip: '噴火はLV1〜3で多め。盤上に最大3個。',
  rules_s4_title: '④ レベルアップ＆特別ボタン',
  rules_s4_body: '**10グループ**消すごとにレベルアップ！新キャラクターが出現します。',
  rules_th_unlock_lv: '解放LV',
  rules_th_button: 'ボタン',
  rules_th_effect: '効果',
  rules_item_del: '好きな1マスを消去。LV2から毎LVアップごとに+1',
  rules_item_mix: 'グリッド全体をシャッフル',
  rules_item_chg: '1種類を基本6種のどれかに全変換',
  rules_item_all: '1種類の恐竜を盤面から全消去',
  rules_s4_tip: '💡 DEL・MIX・CHG・ALLが残っているとゲームオーバーを回避！\nボタンが光ったら使いどき！\n🔁 DEL×5 → MIX×1、DEL×10 → CHG×1、DEL×15 → ALL×1 に交換可能！',
  rules_s5_title: '⑤ 新キャラクターの出現',
  rules_s5_body: 'レベルが上がると、より強力な新キャラクターが出現します。',
  rules_th_needed: '必要数',
  rules_n_pcs: '{0}個',
  rules_mystery: '??? 何が出るかはお楽しみ！',
  rules_s5_tip: '⚠️ 新種は連結数が多くて消しにくい分、高得点チャンス！\n🎁 大グループで消すと固定ボーナス加算！\n✨ ヘッダーに「次のLVは N」を常時表示！\n⚡ 新キャラ解放時はカットイン演出！（設定で ON/OFF 切替可）\n📐 LV10・50・100でフィールド拡大！',
  rules_changelog_title: '📋 更新履歴',
  changelog_v603: '・途中開始時のスコアを実際のプレイに合わせて調整\n・タイムアタックのスコア表示を見やすく改善\n・タイムアタックのランキング初回表示不具合を修正',
  changelog_v601: '・タイムアタック「もう一度プレイ」時のインタースティシャル広告表示不具合を修正',
  changelog_v600: '・スコア表示の視認性を改善\n・スコア倍率を大幅強化\n・DEL×5 → MIX×1 交換機能を追加\n・DELアイテムをLV2から獲得可能に\n・スピノサウルスをLV3で解放に変更\n・プログレスバーをブロック表示に変更\n・フィールド拡大時のアニメーション追加\n・HINTボタンを削除\n・設定画面をコンパクト化',
  changelog_v560: '・タイムアタックモード追加（6×8盤面・90秒・スコア5倍＋コンボ）\n・インタースティシャル広告追加\n・チュートリアル画面追加\n・多言語（英語）対応',
  changelog_v551: '・上部ヘッダーの画面崩れを修正（小型 iPhone 対応・端末幅連動マージン）\n・進捗ドットを 1本の進捗バーに変更（コンパクト化）\n・交換ボタンのテキストを短縮',
  changelog_v550: '・「次の出現まで」ゲージをヘッダーに常時表示\n・新キャラ解放時のカットイン演出を追加\n・開始LV選択を7択に拡張\n・ヘッダーレイアウト2段化\n・背景切替を序盤密集化',
  changelog_v541: '・火山上限の調整：LV100以上で4個に統一\n・リワード広告の安定化',
  changelog_v540: '・ゲームオーバー時に開始LV選択可能\n・最高到達LVを設定画面で確認可能に\n・高レベル時の火山上限アップ\n・LV50以上の出現バランス再調整',
  changelog_v539: '・リワード広告の安定性向上・iOS 26対応',
  changelog_v533: '・App Store言語設定を日本語に修正',
  changelog_v531: '・Lv70以降の出現バランス調整\n・広告読み込み失敗時のフリーズ改善\n・iOS版リワード広告の設定修正',
  changelog_v530: '・新キャラ7体追加（世界樹・海・大地・空・星・虚無・∞）\n・LV500まで解放キャラ拡張',
  changelog_v522: '・ゲームオーバー時の復活機能追加\n・Premium（広告OFF＋復活特典）追加\n・リタイア時は復活モーダル非表示に改善',
  changelog_v520: '・スコアポップアップ改善\n・序盤スコア倍率強化\n・火山爆発後の空白待機追加\n・新恐竜カード回転演出\n・未解放キャラにLV表示\n・MIX・ゲームオーバー音改善',
  changelog_v510: '・一括消去ボタン（ALL）追加\n・新恐竜アンロック演出変更\n・報酬バランス見直し\n・落下アニメーション追加\n・タッチ判定改善',
  changelog_v501: '・新キャラ追加（全19種）\n・ランキング3タブ化\n・ランキング不具合修正\n・高レベル時UI改善\n・パフォーマンス改善',
  changelog_v500: '・広告非表示パック（アプリ内購入）\n・アイテム交換機能\n・月間ランキング追加\n・振動ON/OFF設定\n・名前登録機能\n・スコアバランス調整\n・パフォーマンス大幅改善',

  // Score popup with score label
  score_display: 'スコア: {0}',
  level_display: 'レベル: {0}',
  level_display_ta: 'レベル: {0}（開始 LV30）',

  // Shuffle with penalty
  shuffle_penalty: 'シャッフル！ -{0}pts',

  // Language names
  lang_ja: '日本語',
  lang_en: 'English',
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
  exchange_del_mix: 'DEL×5 → MIX×1',
  exchange_del_chg: 'DEL×10 → CHG×1',
  exchange_del_all: 'DEL×15 → ALL×1',
  exchange_mix_done: 'DEL×5 → MIX×1 Exchanged!',
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
  char_next_unlock: 'Next LV {0}',
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

  // Bonus popup
  bonus_popup: '✨ Bonus!',

  // Rules
  rules_header: '📖 How to Play',
  rules_nav_prev: '◀ Prev',
  rules_nav_next: 'Next ▶',
  rules_s1_title: '① Basic Rules',
  rules_s1_body: 'Tap to erase when the same type of dinosaur is connected by the number shown.',
  rules_th_dino: 'Dinosaur',
  rules_th_display: 'Number',
  rules_th_required: 'Required Connections',
  rules_single_ok: '{0} (single OK)',
  rules_n_or_more: '{0} or more',
  rules_s1_tip: '💡 Tap to highlight groups that can be erased!',
  rules_s2_title: '② Scoring',
  rules_s2_body1: 'Score is calculated by **tiles erased × display number**.',
  rules_s2_body2: 'Bigger groups and higher-number dinos mean **more points**!',
  rules_s2_rare: '✨ **Rare Bonus**\nErase Spinosaurus or higher for a rare bonus!\nHarder dinos give bigger bonuses\n\n📈 **Level Multiplier**: Score UP from the start!\nLV1: ×2 → LV10: ×4 → LV50: ×10 → LV100+: ×20+',
  rules_s2_tip: '💡 Tyrannosaurus (number 1) can be erased alone — great for getting unstuck!',
  rules_s3_title: '③ Volcano 🌋',
  rules_s3_body1: 'Tap 🌋 to erase the entire **row + column** at once.',
  rules_s3_body2: '🌋 Nearby volcanoes can chain-explode!',
  rules_s3_tip: 'Volcanoes appear more at LV1–3. Max 3 on the board.',
  rules_s4_title: '④ Level Up & Items',
  rules_s4_body: 'Level up every **10 groups** erased! New characters appear.',
  rules_th_unlock_lv: 'Unlock LV',
  rules_th_button: 'Button',
  rules_th_effect: 'Effect',
  rules_item_del: 'Erase any 1 cell. +1 per level up from LV2',
  rules_item_mix: 'Shuffle the entire grid',
  rules_item_chg: 'Convert one type to a random basic type',
  rules_item_all: 'Erase all of one dino type from the board',
  rules_s4_tip: '💡 Having DEL/MIX/CHG/ALL prevents Game Over!\nUse them when buttons flash!\n🔁 Exchange: DEL×5 → MIX×1, DEL×10 → CHG×1, DEL×15 → ALL×1',
  rules_s5_title: '⑤ New Characters',
  rules_s5_body: 'As you level up, more powerful new characters appear.',
  rules_th_needed: 'Required',
  rules_n_pcs: '{0}',
  rules_mystery: '??? Find out for yourself!',
  rules_s5_tip: '⚠️ New species are harder to erase but worth more points!\n🎁 Big groups give fixed bonus scores!\n✨ Header shows "Next LV N"!\n⚡ Cut-in animation on new character unlock! (toggle in Settings)\n📐 Field expands at LV10, 50, and 100!',
  rules_changelog_title: '📋 Update History',
  changelog_v603: '・Adjusted midway start scores to match actual gameplay\n・Improved Time Attack score display visibility\n・Fixed Time Attack ranking not showing on first open',
  changelog_v601: '・Fixed interstitial ad issue on Time Attack "Play Again"',
  changelog_v600: '・Improved score display visibility\n・Significantly boosted score multipliers\n・Added DEL×5 → MIX×1 exchange\n・DEL item now earned from LV2\n・Spinosaurus now unlocks at LV3\n・Changed progress bar to block display\n・Added field expansion animation\n・Removed HINT button\n・Compacted settings screen',
  changelog_v560: '・Added Time Attack mode (6×8 board, 90s, Score ×5 + Combo)\n・Added interstitial ads\n・Added tutorial screen\n・Added English language support',
  changelog_v551: '・Fixed header layout for small iPhones\n・Changed progress dots to progress bar\n・Shortened exchange button text',
  changelog_v550: '・Added "Next unlock" gauge to header\n・Added character unlock cut-in animation\n・Expanded start LV to 7 choices\n・Redesigned header layout\n・Adjusted background transitions',
  changelog_v541: '・Adjusted volcano cap: max 4 at LV100+\n・Stabilized reward ads',
  changelog_v540: '・Added start LV selection on Game Over\n・Added highest LV display in Settings\n・Increased volcano cap at high levels\n・Rebalanced spawns at LV50+',
  changelog_v539: '・Improved reward ad stability for iOS 26',
  changelog_v533: '・Fixed App Store language setting',
  changelog_v531: '・Adjusted spawn balance at LV70+\n・Fixed ad loading freeze\n・Fixed iOS reward ad settings',
  changelog_v530: '・Added 7 new characters (World Tree, Ocean, Earth, Sky, Star, Void, ∞)\n・Extended character unlocks to LV500',
  changelog_v522: '・Added Game Over revival (watch ad for items)\n・Added Premium (ad-free + revival)\n・Hid revival modal on retire',
  changelog_v520: '・Improved score popup timing\n・Boosted early score multiplier\n・Added post-explosion pause\n・Added new dino card flip animation\n・Show unlock LV on locked characters\n・Improved MIX/Game Over sounds',
  changelog_v510: '・Added ALL (erase all of one type) button\n・Changed unlock animation to footer style\n・Rebalanced high-level rewards\n・Added drop animation\n・Improved touch detection',
  changelog_v501: '・Added new characters (19 total)\n・3-tab ranking (Daily/Weekly/Monthly)\n・Fixed ranking display bugs\n・Improved high-level UI\n・Performance improvements',
  changelog_v500: '・Ad removal pack (in-app purchase)\n・Item exchange feature\n・Monthly ranking\n・Haptics ON/OFF setting\n・Name registration on Game Over\n・Score balance adjustments\n・Major performance improvements',

  // Score popup with score label
  score_display: 'Score: {0}',
  level_display: 'Level: {0}',
  level_display_ta: 'Level: {0} (Start LV30)',

  // Shuffle with penalty
  shuffle_penalty: 'Shuffle! -{0}pts',

  // Language names
  lang_ja: '日本語',
  lang_en: 'English',
};

const DINO_NAMES_JA = [
  'ティラノサウルス', 'ブラキオサウルス', 'プテラノドン',
  'トリケラトプス', 'ステゴサウルス', 'スピノサウルス',
  'アロサウルス', 'パキケファロサウルス', 'モササウルス',
  'アンキロサウルス', 'マイアサウラ', 'ケツァルコアトル',
  'マンモス', 'ヒト', 'ロボット', 'AI', 'エイリアン',
  'ドラゴン', 'ヤマタノオロチ', 'ユニコーン',
  'フェニックス', '麒麟', '時空', '世界樹',
  '海', '大地', '空', '星', '虚無', '∞',
];

const DINO_NAMES_EN = [
  'Tyrannosaurus', 'Brachiosaurus', 'Pteranodon',
  'Triceratops', 'Stegosaurus', 'Spinosaurus',
  'Allosaurus', 'Pachycephalosaurus', 'Mosasaurus',
  'Ankylosaurus', 'Maiasaura', 'Quetzalcoatlus',
  'Mammoth', 'Human', 'Robot', 'AI', 'Alien',
  'Dragon', 'Yamata no Orochi', 'Unicorn',
  'Phoenix', 'Qilin', 'Spacetime', 'World Tree',
  'Ocean', 'Earth', 'Sky', 'Star', 'Void', '∞',
];

const DINO_NAMES_SHORT_JA = [
  'ティラノ', 'ブラキオ', 'プテラ',
  'トリケラ', 'ステゴ', 'スピノ',
  'アロ', 'パキケファロ', 'モサ',
  'アンキロ', 'マイアサウラ', 'ケツァル',
  'マンモス', 'ヒト', 'ロボット', 'AI', 'エイリアン',
  'ドラゴン', 'オロチ', 'ユニコーン',
  'フェニックス', '麒麟', '時空', '世界樹',
  '海', '大地', '空', '星', '虚無', '∞',
];

const DINO_NAMES_SHORT_EN = [
  'T-Rex', 'Brachio', 'Ptera',
  'Tricera', 'Stego', 'Spino',
  'Allo', 'Pachy', 'Mosa',
  'Ankylo', 'Maiasaura', 'Quetzal',
  'Mammoth', 'Human', 'Robot', 'AI', 'Alien',
  'Dragon', 'Orochi', 'Unicorn',
  'Phoenix', 'Qilin', 'Spacetime', 'World Tree',
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

export function dinoNameShort(index: number): string {
  const names = currentLang === 'en' ? DINO_NAMES_SHORT_EN : DINO_NAMES_SHORT_JA;
  return names[index] ?? `Dino ${index}`;
}

export type BoldSegment = { text: string; bold: boolean };

export function parseBold(key: string): BoldSegment[] {
  const raw = t(key);
  const parts: BoldSegment[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: raw.slice(lastIndex, match.index), bold: false });
    }
    parts.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < raw.length) {
    parts.push({ text: raw.slice(lastIndex), bold: false });
  }
  return parts;
}
