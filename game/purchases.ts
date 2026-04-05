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

// Product identifiers
export const AD_REMOVAL_PRODUCT_ID = 'ad_free_pack';       // 旧300円（引き続き有効）
export const PREMIUM_PRODUCT_ID = 'premium_pack';           // 新500円 Premium

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
 * Check if the user has Premium entitlement.
 * Both 'remove_ads' (旧300円) and 'premium' (新500円) count as Premium.
 */
export async function checkPremiumEntitlement(): Promise<boolean> {
  if (!Purchases || !initialized) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const active = customerInfo.entitlements.active;
    return active['remove_ads'] !== undefined || active['premium'] !== undefined;
  } catch (e) {
    console.warn('Failed to check entitlements:', e);
    return false;
  }
}

/** @deprecated Use checkPremiumEntitlement instead */
export const checkAdRemovalEntitlement = checkPremiumEntitlement;

/**
 * Fetch available packages for Premium purchase.
 */
export async function getPremiumOffering() {
  if (!Purchases || !initialized) return null;
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      // Try premium product first, fallback to ad_free_pack
      const pkg = offerings.current.availablePackages.find(
        (p: any) => p.product.identifier === PREMIUM_PRODUCT_ID
      ) || offerings.current.availablePackages.find(
        (p: any) => p.product.identifier === AD_REMOVAL_PRODUCT_ID
      ) || offerings.current.availablePackages[0] || null;
      return pkg;
    }
    return null;
  } catch (e) {
    console.warn('Failed to get offerings:', e);
    return null;
  }
}

/** @deprecated Use getPremiumOffering instead */
export const getAdRemovalOffering = getPremiumOffering;

/**
 * Purchase Premium.
 * Returns true if purchase succeeded.
 */
export interface PurchaseResult {
  success: boolean;
  reason: string;
}

export async function purchasePremium(): Promise<PurchaseResult> {
  if (!Purchases || !initialized) {
    return { success: false, reason: 'ストアが初期化されていません' };
  }
  try {
    const pkg = await getPremiumOffering();
    if (!pkg) {
      return { success: false, reason: '商品情報を取得できませんでした' };
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active;
    const hasEntitlement = active['remove_ads'] !== undefined || active['premium'] !== undefined;
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

/** @deprecated Use purchasePremium instead */
export const purchaseAdRemoval = purchasePremium;

/**
 * Restore previous purchases.
 * Returns true if Premium entitlement is found.
 */
export async function restorePurchases(): Promise<boolean> {
  if (!Purchases || !initialized) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    const active = customerInfo.entitlements.active;
    return active['remove_ads'] !== undefined || active['premium'] !== undefined;
  } catch (e) {
    console.warn('Restore failed:', e);
    return false;
  }
}
