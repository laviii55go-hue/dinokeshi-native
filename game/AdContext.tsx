import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { Alert } from 'react-native';

import {
  initPurchases,
  checkAdRemovalEntitlement,
  purchaseAdRemoval,
  restorePurchases,
  type PurchaseResult,
} from './purchases';

const AD_REMOVED_KEY = 'dinoKeshiAdRemoved';

interface AdContextType {
  isAdRemoved: boolean;
  isLoaded: boolean;
  setAdRemoved: (removed: boolean) => void;
  buyAdRemoval: () => Promise<void>;
  restore: () => Promise<void>;
}

const AdContext = React.createContext<AdContextType>({
  isAdRemoved: false,
  isLoaded: false,
  setAdRemoved: () => {},
  buyAdRemoval: async () => {},
  restore: async () => {},
});

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [isAdRemoved, setIsAdRemoved] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Initialize on mount
  React.useEffect(() => {
    (async () => {
      // 1. Check AsyncStorage first (instant)
      try {
        const val = await AsyncStorage.getItem(AD_REMOVED_KEY);
        if (val === 'true') setIsAdRemoved(true);
      } catch {}

      // 2. Initialize RevenueCat
      await initPurchases();

      // 3. Verify with RevenueCat (source of truth)
      const hasEntitlement = await checkAdRemovalEntitlement();
      if (hasEntitlement) {
        setIsAdRemoved(true);
        await AsyncStorage.setItem(AD_REMOVED_KEY, 'true');
      }

      setIsLoaded(true);
    })();
  }, []);

  // Persist when changed
  const setAdRemoved = React.useCallback(async (removed: boolean) => {
    setIsAdRemoved(removed);
    try {
      await AsyncStorage.setItem(AD_REMOVED_KEY, removed ? 'true' : 'false');
    } catch {}
  }, []);

  // Purchase ad removal
  const buyAdRemoval = React.useCallback(async () => {
    try {
      const result = await purchaseAdRemoval();
      if (result.success) {
        await setAdRemoved(true);
        Alert.alert('購入完了', '広告が削除されました！');
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
      Alert.alert('復元完了', '広告削除が復元されました！');
    } else {
      Alert.alert('復元結果', '復元可能な購入が見つかりませんでした。');
    }
  }, [setAdRemoved]);

  const value = React.useMemo(
    () => ({ isAdRemoved, isLoaded, setAdRemoved, buyAdRemoval, restore }),
    [isAdRemoved, isLoaded, setAdRemoved, buyAdRemoval, restore]
  );

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAd() {
  return React.useContext(AdContext);
}
