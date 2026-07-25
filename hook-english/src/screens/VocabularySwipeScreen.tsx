import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { VocabCardView } from '../../components/vocab/VocabCardView';
import { SAMPLE_VOCAB } from '../../data/sampleVocab';
import { useCachedTTS } from '../../hooks/useCachedTTS';
import type { VocabCard } from '../../types';
import {
  getSwipeDeck,
  loadVocabulary,
  markMastered,
  markReviewLater,
  upsertVocabulary,
} from '../../store/vocabularyStore';

export function VocabularySwipeScreen() {
  const [allCards, setAllCards] = useState<VocabCard[]>([]);
  const [deck, setDeck] = useState<VocabCard[]>([]);
  const [ready, setReady] = useState(false);
  const { speak, isLoading: ttsLoading, lastSource } = useCachedTTS();

  useEffect(() => {
    (async () => {
      let cards = await loadVocabulary();
      if (!cards.length) {
        cards = await upsertVocabulary(SAMPLE_VOCAB);
      }
      setAllCards(cards);
      setDeck(getSwipeDeck(cards));
      setReady(true);
    })();
  }, []);

  const refreshDeck = useCallback(async (cards: VocabCard[]) => {
    setAllCards(cards);
    setDeck(getSwipeDeck(cards));
  }, []);

  const onSwipedRight = useCallback(
    async (index: number) => {
      const card = deck[index];
      if (!card) return;
      const next = await markMastered(card.id);
      await refreshDeck(next);
    },
    [deck, refreshDeck],
  );

  const onSwipedLeft = useCallback(
    async (index: number) => {
      const card = deck[index];
      if (!card) return;
      const next = await markReviewLater(card.id);
      await refreshDeck(next);
    },
    [deck, refreshDeck],
  );

  const masteredCount = useMemo(
    () => allCards.filter((c) => c.status === 'mastered').length,
    [allCards],
  );

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!deck.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>오늘 볼 카드가 없어요 🎉</Text>
        <Text style={styles.emptySub}>“다시 보기”로 미룬 카드는 내일 다시 나타납니다.</Text>
        <Text style={styles.stats}>암기 완료 {masteredCount}개</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vocabulary</Text>
        <Text style={styles.subtitle}>
          남은 {deck.length}장 · 완료 {masteredCount} · TTS {lastSource ? `(${lastSource})` : ''}
        </Text>
      </View>

      <View style={styles.swiperWrap}>
        <Swiper
          key={deck.map((d) => d.id).join('-')}
          cards={deck}
          renderCard={(card: VocabCard) => (
            <VocabCardView
              card={card}
              isPlaying={ttsLoading}
              onPlayFormal={() => speak(card.formalEn)}
              onPlayCasual={() => speak(card.casualEn)}
            />
          )}
          onSwipedRight={onSwipedRight}
          onSwipedLeft={onSwipedLeft}
          cardIndex={0}
          stackSize={2}
          stackSeparation={10}
          backgroundColor="transparent"
          verticalSwipe={false}
          animateCardOpacity
          overlayLabels={{
            left: {
              title: '다시 보기',
              style: { label: styles.overlayLeft, wrapper: styles.overlayWrapper },
            },
            right: {
              title: '암기 완료',
              style: { label: styles.overlayRight, wrapper: styles.overlayWrapper },
            },
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  swiperWrap: {
    flex: 1,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f1f5f9',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  stats: {
    marginTop: 12,
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  overlayWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLeft: {
    color: '#ea580c',
    fontSize: 22,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overlayRight: {
    color: '#16a34a',
    fontSize: 22,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
