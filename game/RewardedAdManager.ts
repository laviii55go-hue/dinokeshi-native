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
      ios: 'ca-app-pub-3965931075265436/8696093335',
      android: 'ca-app-pub-3965931075265436/8696093335',
    }) ?? '';

let rewardedAd: any = null;
let isAdLoaded = false;
let loadListeners: (() => void)[] = [];

/**
 * リワード広告をプリロードする。ゲーム開始時に呼ぶ。
 */
export function preloadRewardedAd(): void {
  if (!RewardedAd || isExpoGo || !REWARDED_AD_UNIT) return;

  try {
    rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT, {
      requestNonPersonalizedAdsOnly: true,
    });

    isAdLoaded = false;

    // 読み込み完了 — RewardedAd は RewardedAdEventType.LOADED を使う
    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      isAdLoaded = true;
      loadListeners.forEach(fn => fn());
      loadListeners = [];
    });

    // 読み込みエラー — ERROR / CLOSED は AdEventType を使う
    rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('[RewardedAd] Load error:', error);
      isAdLoaded = false;
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
 * リワード広告を表示し、視聴完了を待つ。
 * 完了時は true を返す。キャンセル/エラー時は false。
 */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!rewardedAd || !isAdLoaded) {
      resolve(false);
      return;
    }

    let rewarded = false;

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
        isAdLoaded = false;
        // 次回用にプリロード
        preloadRewardedAd();
        resolve(rewarded);
      }
    );

    rewardedAd.show();
  });
}
