import { Platform } from 'react-native';
import Constants from 'expo-constants';

// RevenueCat is only available in standalone builds
let Purchases: any = null;
let LOG_LEVEL: any = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    const rc = require('react-native-purchases');
    if (rc.default && typeof rc.default.configure === 'function') {
      Purchases = rc.default;
      LOG_LEVEL = rc.LOG_LEVEL;
      console.log('[Purchases] Native module loaded');
    } else {
      console.warn('[Purchases] Native module found but configure not available');
    }
  } catch (e) {
    console.warn('[Purchases] Failed to load native module:', e);
  }
} else {
  console.log('[Purchases] Expo Go detected, skipping native module');
}

const IOS_API_KEY = '';
const ANDROID_API_KEY = 'goog_IdlskbmqMfyQBZhEyUMaBazzyBj';

// Product identifier for ad removal (set in RevenueCat dashboard & Google Play)
export const AD_REMOVAL_PRODUCT_ID = 'ad_free_pack';

let initialized = false;

/**
 * Initialize RevenueCat SDK. Call once at app startup.
 */
export async function initPurchases(): Promise<void> {
  if (initialized) { console.log('[Purchases] Already initialized'); return; }
  if (!Purchases || !LOG_LEVEL) { console.warn('[Purchases] SDK not available (Expo Go or module missing)'); return; }
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) { console.warn('[Purchases] No API key configured'); return; }
  try {
    // setLogLevel may fail if native module is not fully available
    try { await Purchases.setLogLevel(LOG_LEVEL.DEBUG); } catch {}
    await Purchases.configure({ apiKey });
    initialized = true;
    console.log('[Purchases] Initialized successfully');
  } catch (e) {
    console.warn('[Purchases] Init failed:', e);
    Purchases = null;
  }
}

/**
 * Check if the user has active ad-removal entitlement.
 * Returns true if ads should be hidden.
 */
export async function checkAdRemovalEntitlement(): Promise<boolean> {
  if (!Purchases || !initialized) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['remove_ads'] !== undefined;
  } catch (e) {
    console.warn('Failed to check entitlements:', e);
    return false;
  }
}

/**
 * Fetch available packages for ad removal.
 */
export async function getAdRemovalOffering() {
  if (!Purchases || !initialized) return null;
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      // Find the package that contains the ad removal product
      const pkg = offerings.current.availablePackages.find(
        (p: any) => p.product.identifier === AD_REMOVAL_PRODUCT_ID
      );
      return pkg || offerings.current.availablePackages[0] || null;
    }
    return null;
  } catch (e) {
    console.warn('Failed to get offerings:', e);
    return null;
  }
}

/**
 * Purchase the ad removal item.
 * Returns true if purchase succeeded and ads should be removed.
 */
export interface PurchaseResult {
  success: boolean;
  reason: string;
}

export async function purchaseAdRemoval(): Promise<PurchaseResult> {
  if (!Purchases || !initialized) {
    return { success: false, reason: 'ストアが初期化されていません' };
  }
  try {
    const pkg = await getAdRemovalOffering();
    if (!pkg) {
      return { success: false, reason: '商品情報を取得できませんでした' };
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const hasEntitlement = customerInfo.entitlements.active['remove_ads'] !== undefined;
    if (hasEntitlement) {
      return { success: true, reason: 'ok' };
    }
    return { success: false, reason: '購入後にエンタイトルメントが確認できませんでした' };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, reason: 'cancelled' };
    }
    return { success: false, reason: `購入エラー: ${e?.message || e}` };
  }
}

/**
 * Restore previous purchases.
 * Returns true if ad removal entitlement is found.
 */
export async function restorePurchases(): Promise<boolean> {
  if (!Purchases || !initialized) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active['remove_ads'] !== undefined;
  } catch (e) {
    console.warn('Restore failed:', e);
    return false;
  }
}
