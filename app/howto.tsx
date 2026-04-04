import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CHANGELOG = [
  {
    version: 'v5.2.0',
    date: '2026.4.4',
    changes: [
      'スコアポップアップ表示タイミング改善（落下後に表示）',
      '序盤スコア倍率強化（LV3から段階的に上昇）',
      '火山爆発後の空白待機追加（演出の視認性向上）',
      '新恐竜登場時のカード回転演出',
      '未解放キャラに解放レベルを表示',
      'MIX効果音の変更',
      'ゲームオーバー音の演出改善',
      '同じ数字が補充された際の落下アニメーション修正',
    ],
  },
  {
    version: 'v5.1.0',
    date: '2026.4.1',
    changes: [
      '一括消去ボタン（ALL）追加',
      '新恐竜アンロック演出をフッター演出に変更',
      '高レベル恐竜の報酬バランス見直し',
      '落下アニメーション追加',
      'タッチ判定改善',
    ],
  },
  {
    version: 'v5.0.0',
    date: '2026.3.21',
    changes: [
      'Expo (React Native) 版リリース',
      'react-native-reanimated による60fps落下アニメーション',
      '火山カスケード爆発エフェクト＋パーティクル',
      'BGM 3曲 + 効果音（タップ/消去/爆弾/ボーナス/アイテム）',
      'グローバルランキング（Firebase連携）',
      'ローカルランキング（TOP10）',
      '戻る機能（1手前）',
      '恐竜パネル（タップで詳細表示）',
      '設定：音量4段階/数値サイズ4段階/BGM切替/プレイヤー名',
      '17種の恐竜（LV100で全解放）',
      'アイテム：🗑DEL / 🔀MIX / 🔄CHG',
      'アイテム交換：DEL×10 → CHG×1',
      'ポップアップ表示の独立コンポーネント化で再レンダリング最適化',
      'タイマー・サウンドのメモリリーク修正でパフォーマンス改善',
    ],
  },
];

export default function ChangelogScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerText}>📋 更新履歴</Text>
          <TouchableOpacity style={styles.closeX} onPress={() => router.back()}>
            <Text style={styles.closeXText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {CHANGELOG.map((entry, i) => (
            <View key={i} style={styles.entry}>
              <View style={styles.versionRow}>
                <Text style={styles.versionText}>{entry.version}</Text>
                <Text style={styles.dateText}>{entry.date}</Text>
              </View>
              {entry.changes.map((change, j) => (
                <View key={j} style={styles.changeRow}>
                  <Text style={styles.bullet}>●</Text>
                  <Text style={styles.changeText}>{change}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>閉じる</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: '#fffbeb',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  card: {
    width: '100%', maxWidth: 400, flex: 1, maxHeight: '85%',
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
  },
  header: {
    backgroundColor: '#f59e0b', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16,
  },
  headerText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  closeX: {
    position: 'absolute', right: 12, top: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  closeXText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  scroll: { flex: 1 },
  entry: { gap: 6 },
  versionRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
    borderBottomWidth: 2, borderBottomColor: '#f59e0b', paddingBottom: 6,
  },
  versionText: { fontSize: 18, fontWeight: '900', color: '#d97706' },
  dateText: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  changeRow: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  bullet: { color: '#f59e0b', fontSize: 10, marginTop: 4 },
  changeText: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1, lineHeight: 20 },
  closeBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  closeBtnText: { color: '#d97706', fontWeight: '900', fontSize: 16 },
});
