import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>🦕 恐竜けし</Text>
        </View>

        <View style={styles.hero}>
          <Image
            source={require('../../assets/images/dino-0.png')}
            style={styles.heroImage}
            contentFit="contain"
          />
          <Text style={styles.subtitle}>つながると消せる、やみつき恐竜パズル</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.primaryButton, styles.shadow]}
          onPress={() => router.push('/game')}>
          <Text style={styles.primaryButtonText}>🦕 ゲームスタート</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.secondaryButton}
          onPress={() => router.push('/howto' as Href)}>
          <Text style={styles.secondaryButtonText}>📖 あそびかた</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 18,
  },
  titleRow: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 10,
  },
  title: {
    backgroundColor: '#ffffff',
    color: '#d97706',
    fontSize: 28,
    fontWeight: '900',
    paddingVertical: 6,
    paddingHorizontal: 22,
    borderRadius: 10,
    letterSpacing: 1.2,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  heroImage: {
    width: 220,
    height: 220,
  },
  subtitle: {
    color: 'rgba(0,0,0,0.75)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  secondaryButton: {
    backgroundColor: '#ef4444',
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
});
