import { Image } from 'expo-image';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { isTutorialDone } from '../tutorial';
import { t, setLanguage } from '../../game/i18n';
import { loadSettings } from '../../game/storage';

const DINO_SOURCES = [
  require('../../assets/images/dino-0.png'),
  require('../../assets/images/dino-1.png'),
  require('../../assets/images/dino-2.png'),
  require('../../assets/images/dino-3.png'),
  require('../../assets/images/dino-4.png'),
  require('../../assets/images/dino-5.png'),
];

export default function HomeScreen() {
  const router = useRouter();
  const [dinoIdx] = React.useState(() => Math.floor(Math.random() * DINO_SOURCES.length));
  const { width } = useWindowDimensions();
  const cardMaxWidth = Math.min(500, width - 32);
  const [, setRenderKey] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      const s = await loadSettings();
      if (s.language) setLanguage(s.language);
      setRenderKey(k => k + 1);
      const done = await isTutorialDone();
      if (!done) router.replace('/tutorial' as Href);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSettings().then(s => {
        if (s.language) setLanguage(s.language);
        setRenderKey(k => k + 1);
      });
    }, [])
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.card, { maxWidth: cardMaxWidth }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('app_title')}</Text>
        </View>

        <View style={styles.hero}>
          <Image
            source={DINO_SOURCES[dinoIdx]}
            style={styles.heroImage}
            contentFit="contain"
          />
          <Text style={styles.subtitle}>{t('app_subtitle')}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.primaryButton, styles.shadow]}
          onPress={() => router.push('/game' as Href)}>
          <Text style={styles.primaryButtonText}>{t('mode_normal')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.taButton, styles.taShadow]}
          onPress={() => router.push('/timeattack' as Href)}>
          <Text style={styles.taButtonText}>{t('mode_ta')}</Text>
          <Text style={styles.taButtonSub}>{t('mode_ta_sub')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => router.push('/tutorial' as Href)}>
          <Text style={styles.helpButtonText}>{t('how_to_play')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v6.0.1</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  titleRow: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 10,
  },
  title: {
    backgroundColor: '#fffbeb',
    color: '#d97706',
    fontSize: 28,
    fontWeight: '900',
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 12,
    letterSpacing: 1.2,
    borderWidth: 3,
    borderColor: '#f59e0b',
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  heroImage: {
    width: 180,
    height: 180,
  },
  subtitle: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  shadow: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  taButton: {
    backgroundColor: '#dc2626',
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  taButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  taButtonSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  taShadow: {
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  helpButton: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  version: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    color: 'rgba(0,0,0,0.35)',
    fontWeight: '600',
  },
});
