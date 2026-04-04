import Constants from 'expo-constants';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useAd } from './AdContext';

// Only import ads in standalone builds (not Expo Go)
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
const isExpoGo = Constants.appOwnership === 'expo';
if (!isExpoGo) {
  try {
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch {}
}

const BANNER_AD_UNIT = __DEV__ && TestIds
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: 'ca-app-pub-3965931075265436/8034744202',
      android: 'ca-app-pub-3965931075265436/3839034274',
    }) ?? 'ca-app-pub-3965931075265436/3839034274';

export function GlobalBanner() {
  const { isAdRemoved, isLoaded } = useAd();

  if (!isLoaded || isAdRemoved || isExpoGo || !BannerAd) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
});
