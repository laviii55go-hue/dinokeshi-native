import { Platform } from 'react-native';
import Constants from 'expo-constants';

let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
let TestIds: any = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    const ads = require('react-native-google-mobile-ads');
    RewardedAd = ads.RewardedAd;
    RewardedAdEventType = ads.RewardedAdEventType;
    AdEventType = ads.AdEventType;
    TestIds = ads.TestIds;
  } catch {}
}

const REWARDED_AD_UNIT = __DEV__ && TestIds
  ? TestIds.REWARDED
  : Platform.select({
      ios: 'ca-app-pub-3965931075265436/8486341785',
      android: 'ca-app-pub-3965931075265436/8696093335',
    }) ?? '';

let rewardedAd: any = null;
let isAdLoaded = false;
let loadListeners: (() => void)[] = [];

// 自動リトライ設定（ロード失敗時）
const MAX_LOAD_RETRY = 3;
const LOAD_RETRY_INTERVAL_MS = 5000;
let loadRetryCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

// showRewardedAd() で未ロード時に待機する最大時間
const SHOW_WAIT_LOAD_MS = 5000;

/**
 * リワード広告をプリロードする。ゲーム開始時に呼ぶ。
 * ロード失敗時は最大 MAX_LOAD_RETRY 回、LOAD_RETRY_INTERVAL_MS 間隔で自動リトライ。
 */
export function preloadRewardedAd(): void {
  if (!RewardedAd || isExpoGo || !REWARDED_AD_UNIT) return;

  try {
    rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT, {
      requestNonPersonalizedAdsOnly: true,
    });

    isAdLoaded = false;
    // 新規ロード開始なのでリトライカウンタはリセット
    loadRetryCount = 0;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }

    // 読み込み完了 — RewardedAd は RewardedAdEventType.LOADED を使う
    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      isAdLoaded = true;
      loadRetryCount = 0;
      loadListeners.forEach(fn => fn());
      loadListeners = [];
    });

    // 読み込みエラー — ERROR / CLOSED は AdEventType を使う
    rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('[RewardedAd] Load error:', error);
      isAdLoaded = false;
      // 自動リトライ（最大 MAX_LOAD_RETRY 回）
      if (loadRetryCount < MAX_LOAD_RETRY) {
        loadRetryCount++;
        console.log(`[RewardedAd] Retry ${loadRetryCount}/${MAX_LOAD_RETRY} in ${LOAD_RETRY_INTERVAL_MS}ms`);
        retryTimer = setTimeout(() => {
          retryTimer = null;
          try { rewardedAd && rewardedAd.load(); } catch (e) {
            console.warn('[RewardedAd] Retry load failed:', e);
          }
        }, LOAD_RETRY_INTERVAL_MS);
      } else {
        console.warn('[RewardedAd] Max retries reached. Will fallback on next show request.');
      }
    });

    rewardedAd.load();
  } catch (e) {
    console.warn('[RewardedAd] Failed to create ad:', e);
  }
}

/**
 * リワード広告が読み込み済みかどうか
 */
export function isRewardedAdReady(): boolean {
  return isAdLoaded && rewardedAd != null;
}

/**
 * 指定ミリ秒まで広告ロード完了を待つ
 */
function waitForLoad(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (isAdLoaded) return resolve(true);
    const timer = setTimeout(() => {
      // タイムアウト時は listeners から自分を外せないが、resolve 済みなら副作用なし
      resolve(false);
    }, timeoutMs);
    loadListeners.push(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

/**
 * リワード広告を表示し、視聴完了を待つ。
 * 未ロード時は短時間だけ再取得を試み、それでも失敗なら報酬を付与する（ユーザー救済）。
 * 完了時は true を返す。キャンセル/エラー時は false。
 */
export async function showRewardedAd(): Promise<boolean> {
  // 未ロード時: 再ロード試行＆短時間待機
  if (!rewardedAd || !isAdLoaded) {
    // まだ作成されていない場合は作成から
    if (!rewardedAd) {
      preloadRewardedAd();
    } else if (!isAdLoaded) {
      // 再ロード試行（既存rewardedAdで）
      try { rewardedAd.load(); } catch (e) {
        console.warn('[RewardedAd] show-time retry load failed:', e);
      }
    }
    const loaded = await waitForLoad(SHOW_WAIT_LOAD_MS);
    if (!loaded) {
      // 規定時間内にロードできなかった → フォールバック報酬
      console.warn('[RewardedAd] Show-time load timeout — granting reward (fallback)');
      preloadRewardedAd();
      return true;
    }
  }

  // ここからロード済みの広告を表示
  return new Promise((resolve) => {
    let rewarded = false;
    let settled = false;

    const settle = (result: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      isAdLoaded = false;
      preloadRewardedAd();
      resolve(result);
    };

    // 15秒タイムアウト — 黒画面・フリーズ対策（ユーザーのせいではないので報酬あり）
    const timer = setTimeout(() => {
      console.warn('[RewardedAd] Timeout after 15s — granting reward');
      settle(true);
    }, 15000);

    // リワード獲得 — RewardedAdEventType
    const earnedSub = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => { rewarded = true; }
    );

    // 広告を閉じた — AdEventType.CLOSED
    const closedSub = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        earnedSub();
        closedSub();
        // ユーザーが自分で閉じた場合: EARNED_REWARDが発火していればtrue、していなければfalse
        settle(rewarded);
      }
    );

    // show()失敗 — 表示自体がエラーになった場合（ユーザーのせいではないので報酬あり）
    try {
      rewardedAd.show();
    } catch (e) {
      console.warn('[RewardedAd] show() failed:', e);
      earnedSub();
      closedSub();
      settle(true);
    }
  });
}
