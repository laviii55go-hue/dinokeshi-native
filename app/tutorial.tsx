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

const PAGES: TutorialPage[] = [
  {
    title: 'ようこそ！',
    body: '恐竜けしは、同じ種類の恐竜を\nつなげて消すパズルゲームです。\n\nたくさん消してハイスコアを目指そう！',
    dinoIndices: [0, 1, 2],
    accent: '#f59e0b',
    emoji: '🦕',
  },
  {
    title: 'あそびかた',
    body: '恐竜にはそれぞれ数字があります。\nその数字の数だけ同じ恐竜を\nつなげると消せます！\n\n数字が大きい恐竜ほど消しにくいけど\n高得点！',
    dinoIndices: [0, 3, 5],
    accent: '#10b981',
    emoji: '👆',
  },
  {
    title: 'アイテムを使おう',
    body: 'レベルアップでアイテムがもらえます。\n\nDEL … 1匹だけ消す\nMIX … 盤面シャッフル\nCHG … 種類を変える\nALL … 同じ種類を全部消す\n\n困ったときに使ってみよう！',
    dinoIndices: [4, 5, 0],
    accent: '#6366f1',
    emoji: '🎁',
  },
  {
    title: 'タイムアタック！',
    body: '90秒のスピード勝負モード！\n\nスコア5倍＋コンボでさらに倍率UP。\n素早く消して最高スコアを狙おう！\n\n世界ランキングにも挑戦できるよ！',
    dinoIndices: [1, 2, 4],
    accent: '#dc2626',
    emoji: '⏱',
  },
  {
    title: 'さあ、はじめよう！',
    body: '通常モードでじっくり遊ぶもよし、\nタイムアタックで熱くなるもよし。\n\nきみだけの恐竜パズルを楽しもう！',
    dinoIndices: [0, 3, 5],
    accent: '#f59e0b',
    emoji: '🎮',
  },
];

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

  const finish = async () => {
    await markTutorialDone();
    router.replace('/');
  };

  const goNext = () => {
    if (currentPage < PAGES.length - 1) {
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
          {PAGES.map((_, i) => (
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
            {index === PAGES.length - 1 ? 'はじめる！' : 'つぎへ'}
          </Text>
        </TouchableOpacity>

        {index < PAGES.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>スキップ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
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
