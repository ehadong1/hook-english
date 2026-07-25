import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCachedTTS } from '../src/hooks/useCachedTTS';

const DEMO_SENTENCE = 'Would it be possible to reschedule our meeting?';

export default function ListenDemoScreen() {
  const { speak, startLoop, stopLoop, isLoading, isPlaying, lastSource, error } = useCachedTTS();
  const [looping, setLooping] = useState(false);

  const toggleLoop = async () => {
    if (looping) {
      setLooping(false);
      await stopLoop();
    } else {
      setLooping(true);
      startLoop(DEMO_SENTENCE);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.badge}>V2 · TTS 캐싱</Text>
        <Text style={styles.title}>Hook English</Text>
        <Text style={styles.sub}>expo-speech 제거 → OpenAI TTS + 로컬/Supabase 캐시</Text>

        <View style={styles.card}>
          <Text style={styles.sentence}>{DEMO_SENTENCE}</Text>
          <Pressable style={styles.btn} onPress={() => speak(DEMO_SENTENCE)} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>고품질 TTS 재생</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnSecondary, looping && styles.btnDanger]}
            onPress={toggleLoop}
          >
            <Text style={styles.btnText}>{looping || isPlaying ? '무한 반복 중지' : '무한 반복 듣기'}</Text>
          </Pressable>
          {lastSource && (
            <Text style={styles.meta}>캐시 소스: {lastSource} (local=0원, remote/generated=최초 1회)</Text>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Link href="/vocabulary" style={styles.link}>
          Vocabulary 스와이프 화면 →
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eef2ff' },
  container: { padding: 20 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  title: { marginTop: 12, fontSize: 28, fontWeight: '800', color: '#0f172a' },
  sub: { marginTop: 6, fontSize: 14, color: '#64748b', lineHeight: 20 },
  card: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sentence: { fontSize: 18, fontWeight: '700', color: '#1e3a8a', lineHeight: 26 },
  btn: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondary: { backgroundColor: '#0f766e' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  meta: { marginTop: 10, fontSize: 12, color: '#475569' },
  error: { marginTop: 10, fontSize: 12, color: '#dc2626' },
  link: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'center',
  },
});
