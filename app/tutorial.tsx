import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../game/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TUTORIAL_DONE_KEY = 'dinoKeshiTutorialDone';

const DINO_IMAGES = [
  require('../assets/images/dino-0.png'),
  require('../assets/images/dino-1.png'),
  require('../assets/images/dino-2.png'),
  require('../assets/images/dino-3.png'),
  require('../assets/images/dino-4.png'),
  require('../assets/images/dino-5.png'),
];

interface TutorialPage {
  title: string;
  body: string;
  dinoIndices: number[];
  accent: string;
  emoji: string;
}

function getPages(): TutorialPage[] {
  return [
    { title: t('tut_welcome'), body: t('tut_welcome_body'), dinoIndices: [0, 1, 2], accent: '#f59e0b', emoji: '🦕' },
    { title: t('tut_howto'), body: t('tut_howto_body'), dinoIndices: [0, 3, 5], accent: '#10b981', emoji: '👆' },
    { title: t('tut_items'), body: t('tut_items_body'), dinoIndices: [4, 5, 0], accent: '#6366f1', emoji: '🎁' },
    { title: t('tut_ta'), body: t('tut_ta_body'), dinoIndices: [1, 2, 4], accent: '#dc2626', emoji: '⏱' },
    { title: t('tut_start'), body: t('tut_start_body'), dinoIndices: [0, 3, 5], accent: '#f59e0b', emoji: '🎮' },
  ];
}

export async function isTutorialDone(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(TUTORIAL_DONE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markTutorialDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_DONE_KEY, 'true');
  } catch {}
}

export default function TutorialScreen() {
  const router = useRouter();
  const flatListRef = React.useRef<FlatList>(null);
  const [currentPage, setCurrentPage] = React.useState(0);
  const pages = React.useMemo(() => getPages(), []);

  const finish = async () => {
    await markTutorialDone();
    router.replace('/');
  };

  const goNext = () => {
    if (currentPage < pages.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
    } else {
      finish();
    }
  };

  const renderPage = ({ item, index }: { item: TutorialPage; index: number }) => (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>

        <View style={styles.dinoRow}>
          {item.dinoIndices.map((di, i) => (
            <Image
              key={i}
              source={DINO_IMAGES[di]}
              style={styles.dino}
              contentFit="contain"
            />
          ))}
        </View>

        <Text style={styles.body}>{item.body}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index ? { backgroundColor: item.accent, width: 24 } : {},
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: item.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {index === pages.length - 1 ? t('tut_begin') : t('tut_next')}
          </Text>
        </TouchableOpacity>

        {index < pages.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderPage}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(idx);
        }}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fffbeb',
  },
  page: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 28,
  },
  content: {
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 20,
  },
  dinoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dino: {
    width: 72,
    height: 72,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    gap: 14,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d1d5db',
  },
  nextBtn: {
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 48,
    minWidth: 200,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
});
