import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function HowtoScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>あそびかた</Text>
      <Text style={styles.subtitle}>ここにルール説明画面を実装します。</Text>

      <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={() => router.back()}>
        <Text style={styles.buttonText}>戻る</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { marginTop: 8, opacity: 0.7 },
  button: {
    marginTop: 18,
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonText: { color: 'white', fontWeight: '800' },
});

