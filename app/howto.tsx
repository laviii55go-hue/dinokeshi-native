import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DINO_SOURCES } from '../game/images';
import { DINO_NAMES, DINO_UNLOCK_LV } from '../game/constants';

const PAGES = [
  {
    title: '基本ルール',
    content: `🦕 恐竜けしは、同じ恐竜をつなげて消すパズルゲームです。

● 8×10のマス目に恐竜が並んでいます
● 各恐竜には数字が書かれています
● その数字の数だけ同じ恐竜がつながっていると消せます

例：
　「1」→ 1個で消せる
　「3」→ 3個つながっていれば消せる
　「6」→ 6個つながっていれば消せる`,
  },
  {
    title: 'ボルケーノ（🌋）',
    content: `🌋 ボルケーノは特殊マスです。

● タップするとその行と列が全て消えます
● 爆発範囲内に別の🌋があると連鎖します
● 盤面に同時に最大2個まで出現
● レベルが低いほど出現確率が高い`,
  },
  {
    title: 'アイテム',
    content: `レベルアップでアイテムを獲得できます。

【消】消しゴム（LV3で解放）
　→ 1マスだけ自由に消せます

【混】シャッフル（LV5で解放）
　→ 盤面を全てシャッフルします

【変】変換（LV10で解放）
　→ 選んだ恐竜を基本6種のどれかに変換`,
  },
  {
    title: 'レベルアップ',
    content: `一定数のグループを消すとレベルアップ！

● LV1〜49: 10グループで次のレベルへ
● LV50〜79: 20グループ
● LV80〜99: 30グループ
● LV100〜: 50グループ

レベルが上がると新しい恐竜が登場します。
高い数字の恐竜ほど消すのが難しいですが、
得点が高くなります。`,
  },
  {
    title: 'ゲームオーバー',
    content: `消せるグループがなく、アイテムも
使い切った場合にゲームオーバーです。

● ヒントボタンで消せる場所を確認
● アイテムが残っていればボタンが光ります
● スコアはランキングに保存されます

目指せハイスコア！🏆`,
  },
];

export default function HowtoScreen() {
  const router = useRouter();
  const [page, setPage] = React.useState(0);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>📖 あそびかた</Text>

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{PAGES[page].title}</Text>
          <Text style={styles.pageNum}>{page + 1}/{PAGES.length}</Text>
        </View>

        <ScrollView style={styles.scroll}>
          <Text style={styles.content}>{PAGES[page].content}</Text>

          {page === 0 && (
            <View style={styles.dinoRow}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <View key={i} style={styles.dinoDemo}>
                  <Image source={DINO_SOURCES[i]} style={styles.dinoImg} contentFit="contain" />
                  <Text style={styles.dinoDemoNum}>{i + 1}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.nav}>
          {page > 0 ? (
            <TouchableOpacity style={styles.navBtn} onPress={() => setPage(page - 1)}>
              <Text style={styles.navBtnText}>◀ 前へ</Text>
            </TouchableOpacity>
          ) : <View />}

          {page < PAGES.length - 1 ? (
            <TouchableOpacity style={styles.navBtn} onPress={() => setPage(page + 1)}>
              <Text style={styles.navBtnText}>次へ ▶</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.navBtn, styles.navBtnClose]} onPress={() => router.back()}>
              <Text style={[styles.navBtnText, { color: '#fff' }]}>閉じる</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#d97706',
    textAlign: 'center',
    marginBottom: 12,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  pageNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
  },
  scroll: {
    flex: 1,
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 24,
    color: '#374151',
    fontWeight: '600',
  },
  dinoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  dinoDemo: {
    alignItems: 'center',
    gap: 2,
  },
  dinoImg: {
    width: 44,
    height: 44,
  },
  dinoDemoNum: {
    fontSize: 12,
    fontWeight: '900',
    color: '#d97706',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  navBtnText: {
    fontWeight: '900',
    color: '#d97706',
    fontSize: 15,
  },
  navBtnClose: {
    backgroundColor: '#f59e0b',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#6b7280',
  },
});
