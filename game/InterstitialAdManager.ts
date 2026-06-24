import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';

let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    const ads = require('react-native-google-mobile-ads');
    InterstitialAd = ads.InterstitialAd;
    AdEventType = ads.AdEventType;
    TestIds = ads.TestIds;
  } catch {}
}

const INTERSTITIAL_AD_UNIT = __DEV__ && TestIds
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: 'ca-app-pub-3965931075265436/5393634340',
      android: 'ca-app-pub-3965931075265436/5202062656',
    }) ?? '';

const SHOW_FAIL_TIMEOUT_MS = 3000;
const APP_STATE_SETTLE_DELAY_MS = 400;

let interstitialAd: any = null;
let isAdLoaded = false;

const MAX_LOAD_RETRY = 2;
const LOAD_RETRY_INTERVAL_MS = 5000;
let loadRetryCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

let taGameCount = 0;

export function preloadInterstitialAd(): void {
  if (!InterstitialAd || isExpoGo || !INTERSTITIAL_AD_UNIT) return;

  try {
    interstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT, {
      requestNonPersonalizedAdsOnly: true,
    });

    isAdLoaded = false;
    loadRetryCount = 0;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      isAdLoaded = true;
      loadRetryCount = 0;
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.warn('[InterstitialAd] Load error:', error);
      isAdLoaded = false;
      if (loadRetryCount < MAX_LOAD_RETRY) {
        loadRetryCount++;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          try { interstitialAd && interstitialAd.load(); } catch (e) {
            console.warn('[InterstitialAd] Retry load failed:', e);
          }
        }, LOAD_RETRY_INTERVAL_MS);
      }
    });

    interstitialAd.load();
  } catch (e) {
    console.warn('[InterstitialAd] Failed to create ad:', e);
  }
}

export function incrementTAGameCount(): void {
  taGameCount++;
}

export function getTAGameCount(): number {
  return taGameCount;
}

/**
 * TA「もう一度プレイ」用: 3回に1回表示
 */
export function shouldShowOnTARestart(): boolean {
  return taGameCount > 0 && taGameCount % 3 === 0;
}

/**
 * インタースティシャル広告を表示し、閉じるまで待つ。
 * Premium ユーザーまたは未ロード時はスキップ（即 resolve）。
 */
export async function showInterstitialAd(isPremium: boolean): Promise<void> {
  if (isPremium || !interstitialAd || !isAdLoaded || isExpoGo) {
    return;
  }

  return new Promise((resolve) => {
    let settled = false;
    let opened = false;
    let sawInactive = false;
    let appStateResumeTimer: ReturnType<typeof setTimeout> | null = null;
    let failTimer: ReturnType<typeof setTimeout> | null = null;

    let closedSub: (() => void) | undefined;
    let errorSub: (() => void) | undefined;
    let openedSub: (() => void) | undefined;
    let appStateSub: { remove: () => void } | undefined;

    const cleanup = () => {
      try { closedSub && closedSub(); } catch {}
      try { errorSub && errorSub(); } catch {}
      try { openedSub && openedSub(); } catch {}
      try { appStateSub && appStateSub.remove(); } catch {}
      if (appStateResumeTimer) clearTimeout(appStateResumeTimer);
      if (failTimer) clearTimeout(failTimer);
    };

    const settle = () => {
      if (settled) return;
      settled = true;
      isAdLoaded = false;
      cleanup();
      preloadInterstitialAd();
      resolve();
    };

    closedSub = interstitialAd.addAdEventListener(
      AdEventType.CLOSED,
      () => settle()
    );

    errorSub = interstitialAd.addAdEventListener(
      AdEventType.ERROR,
      () => settle()
    );

    openedSub = interstitialAd.addAdEventListener(
      AdEventType.OPENED,
      () => {
        opened = true;
        if (failTimer) {
          clearTimeout(failTimer);
          failTimer = null;
        }
      }
    );

    // CLOSED が来ない端末向け: 広告表示中の inactive → active 復帰で settle
    appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'inactive' || next === 'background') {
        sawInactive = true;
      }
      if (next === 'active' && sawInactive) {
        if (appStateResumeTimer) clearTimeout(appStateResumeTimer);
        appStateResumeTimer = setTimeout(() => {
          if (!settled) settle();
        }, APP_STATE_SETTLE_DELAY_MS);
      }
    });

    // OPENED 前に失敗した場合（Modal 競合等）の救済
    failTimer = setTimeout(() => {
      if (!settled && !opened) {
        console.warn('[InterstitialAd] Show failed to open — settling');
        settle();
      }
    }, SHOW_FAIL_TIMEOUT_MS);

    try {
      interstitialAd.show();
    } catch (e) {
      console.warn('[InterstitialAd] show() failed:', e);
      settle();
    }
  });
}
