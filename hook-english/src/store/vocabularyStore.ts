import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VocabCard, VocabStatus } from '../types';

const STORAGE_KEY = 'hook-english-vocab-v2';

function nowIso() {
  return new Date().toISOString();
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function loadVocabulary(): Promise<VocabCard[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as VocabCard[];
  } catch {
    return [];
  }
}

export async function saveVocabulary(cards: VocabCard[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export async function upsertVocabulary(cards: VocabCard[]): Promise<VocabCard[]> {
  const existing = await loadVocabulary();
  const map = new Map(existing.map((c) => [c.id, c]));
  for (const card of cards) {
    map.set(card.id, card);
  }
  const merged = Array.from(map.values());
  await saveVocabulary(merged);
  return merged;
}

export function getSwipeDeck(cards: VocabCard[]): VocabCard[] {
  const now = Date.now();
  return cards.filter((c) => {
    if (c.status === 'mastered') return false;
    if (c.status === 'review_later') {
      return new Date(c.nextReviewAt).getTime() <= now;
    }
    return c.status === 'learning';
  });
}

export async function updateVocabStatus(
  id: string,
  status: VocabStatus,
): Promise<VocabCard[]> {
  const cards = await loadVocabulary();
  const next = cards.map((c) => {
    if (c.id !== id) return c;
    return {
      ...c,
      status,
      nextReviewAt: status === 'review_later' ? addDays(1) : c.nextReviewAt,
      updatedAt: nowIso(),
    };
  });
  await saveVocabulary(next);
  return next;
}

export async function markMastered(id: string): Promise<VocabCard[]> {
  return updateVocabStatus(id, 'mastered');
}

export async function markReviewLater(id: string): Promise<VocabCard[]> {
  return updateVocabStatus(id, 'review_later');
}
