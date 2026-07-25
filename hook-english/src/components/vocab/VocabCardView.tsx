import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VocabCard } from '../../types';

interface VocabCardViewProps {
  card: VocabCard;
  onPlayFormal?: () => void;
  onPlayCasual?: () => void;
  isPlaying?: boolean;
}

export function VocabCardView({ card, onPlayFormal, onPlayCasual, isPlaying }: VocabCardViewProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>한글 원문</Text>
      <Text style={styles.korean}>{card.korean}</Text>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>포멀 영문</Text>
          <Pressable onPress={onPlayFormal} style={styles.playBtn}>
            <Text style={styles.playText}>{isPlaying ? '▶' : '🔊'}</Text>
          </Pressable>
        </View>
        <Text style={styles.en}>{card.formalEn}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>캐주얼 영문</Text>
          <Pressable onPress={onPlayCasual} style={styles.playBtn}>
            <Text style={styles.playText}>🔊</Text>
          </Pressable>
        </View>
        <Text style={styles.enCasual}>{card.casualEn}</Text>
      </View>

      <View style={styles.tipBox}>
        <Text style={styles.tipLabel}>문법 팁</Text>
        <Text style={styles.tip}>{card.grammarTip}</Text>
      </View>

      <View style={styles.swipeHintRow}>
        <Text style={styles.swipeLeft}>← 다시 보기</Text>
        <Text style={styles.swipeRight}>암기 완료 →</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  korean: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 30,
  },
  section: {
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  en: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
    lineHeight: 24,
  },
  enCasual: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    lineHeight: 24,
  },
  tipBox: {
    marginTop: 18,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 14,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  tip: {
    marginTop: 6,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 21,
  },
  playBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
  },
  playText: {
    fontSize: 14,
  },
  swipeHintRow: {
    marginTop: 'auto',
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  swipeLeft: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
  },
  swipeRight: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
});
