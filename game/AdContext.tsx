import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as React from 'react';
import { Alert, Platform } from 'react-native';

import {
  initPurchases,
  checkPremiumEntitlement,
  purchasePremium,
  restorePurchases,
  type PurchaseResult,
} from './purchases';

const AD_REMOVED_KEY = 'dinoKeshiAdRemoved';
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * iOS: App Tracking Transparency プロンプト要求（初回起動時1回）→ AdMob SDK 初期化。
 * Android: AdMob SDK 初期化のみ（ATTは iOS 固有のため Platform.OS でガード）。
 * Expo Go では両方スキップ（native モジュール未バンドル）。
 */
async function initAdsAndTracking(): Promise<void> {
  if (isExpoGo) return;

  if (Platform.OS === 'ios') {
    try {
      const TrackingTransparency = require('expo-tracking-transparency');
      await TrackingTransparency.requestTrackingPermissionsAsync();
    } catch (e) {
      console.warn('[Ads] ATT request failed:', e);
    }
  }

  try {
    const ads = require('react-native-google-mobile-ads');
    await ads.default().initialize();
  } catch (e) {
    console.warn('[Ads] mobileAds().initialize() failed:', e);
  }
}

interface AdContextType {
  /** Premium (= 広告OFF + 復活特典) が有効か */
  isPremium: boolean;
  /** 後方互換: isPremium と同値 */
  isAdRemoved: boolean;
  isLoaded: boolean;
  setAdRemoved: (removed: boolean) => void;
  buyPremium: () => Promise<void>;
  /** @deprecated Use buyPremium */
  buyAdRemoval: () => Promise<void>;
  restore: () => Promise<void>;
}

const AdContext = React.createContext<AdContextType>({
  isPremium: false,
  isAdRemoved: false,
  isLoaded: false,
  setAdRemoved: () => {},
  buyPremium: async () => {},
  buyAdRemoval: async () => {},
  restore: async () => {},
});

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Initialize on mount
  React.useEffect(() => {
    (async () => {
      // 1. Check AsyncStorage first (instant)
      try {
        const val = await AsyncStorage.getItem(AD_REMOVED_KEY);
        if (val === 'true') setIsPremium(true);
      } catch {}

      // 2. ATT prompt (iOS only) + AdMob SDK initialize
      await initAdsAndTracking();

      // 3. Initialize RevenueCat
      await initPurchases();

      // 4. Verify with RevenueCat (source of truth)
      const hasEntitlement = await checkPremiumEntitlement();
      if (hasEntitlement) {
        setIsPremium(true);
        await AsyncStorage.setItem(AD_REMOVED_KEY, 'true');
      }

      setIsLoaded(true);
    })();
  }, []);

  // Persist when changed
  const setAdRemoved = React.useCallback(async (removed: boolean) => {
    setIsPremium(removed);
    try {
      await AsyncStorage.setItem(AD_REMOVED_KEY, removed ? 'true' : 'false');
    } catch {}
  }, []);

  // Purchase Premium
  const buyPremium = React.useCallback(async () => {
    try {
      const result = await purchasePremium();
      if (result.success) {
        await setAdRemoved(true);
        Alert.alert('購入完了', 'Premiumが有効になりました！\n広告OFF＋ゲームオーバー復活特典が使えます');
      } else if (result.reason !== 'cancelled') {
        Alert.alert('購入できませんでした', result.reason);
      }
    } catch (e: any) {
      Alert.alert('エラー', `購入処理中にエラーが発生しました: ${e?.message || e}`);
    }
  }, [setAdRemoved]);

  // Restore purchases
  const restore = React.useCallback(async () => {
    const success = await restorePurchases();
    if (success) {
      await setAdRemoved(true);
      Alert.alert('復元完了', 'Premiumが復元されました！');
    } else {
      Alert.alert('復元結果', '復元可能な購入が見つかりませんでした。');
    }
  }, [setAdRemoved]);

  const value = React.useMemo(
    () => ({
      isPremium,
      isAdRemoved: isPremium,
      isLoaded,
      setAdRemoved,
      buyPremium,
      buyAdRemoval: buyPremium,
      restore,
    }),
    [isPremium, isLoaded, setAdRemoved, buyPremium, restore]
  );

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAd() {
  return React.useContext(AdContext);
}
