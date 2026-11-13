import { SENTENCE_BANK } from "../data/sentences";
import { LEVEL_TO_LEGACY, TIME_TO_COUNT, TOPIC_TO_BANK } from "../data/survey";
import type { HistoryItem, Profile } from "../types";
import type { PhraseBankEntry } from "./persistence";

/* ============================================================================
   SECTION 6. 개인화 엔진
   ============================================================================ */

export function normalizeProfile(answers: Profile): Profile {
  const topics = answers.topics || [];
  return {
    ...answers,
    levelCode: answers.level,
    level: LEVEL_TO_LEGACY[answers.level] || "기초 회화",
    topics,
    topic: topics[0] ? (TOPIC_TO_BANK[topics[0]] || "일상 및 오피스 회화") : "일상 및 오피스 회화",
    weaknesses: answers.weaknesses || [],
    weakness: (answers.weaknesses && answers.weaknesses[0]) || "문장 구성",
  };
}

export function getRecommendedSentences(
  profile: Profile | null,
  { newsOnly = false, countOverride }: { newsOnly?: boolean; countOverride?: number } = {},
) {
  if (!profile) return [];
  const count = countOverride ?? (TIME_TO_COUNT[profile.dailyTime] || 3);
  const legacyLevel = profile.level || LEVEL_TO_LEGACY[profile.levelCode] || "기초 회화";
  const bankTopics = (profile.topics || []).map((t: string) => TOPIC_TO_BANK[t]).filter(Boolean);
  const weaknesses = profile.weaknesses || [profile.weakness].filter(Boolean);

  return SENTENCE_BANK.filter((s) => (newsOnly ? s.isNews : !s.isNews))
    .map((s) => {
      let score = 0;
      if (s.level === legacyLevel) score += 100;
      else if (legacyLevel === "중상급" && s.level === "기초 회화") score += 30;
      else if (legacyLevel === "기초 회화" && s.level === "왕초보") score += 30;
      else score -= 40;

      if (bankTopics.includes(s.topic)) score += 40;
      if (s.topic === profile.topic) score += 20;
      if (s.situations?.includes(profile.situation)) score += 30;
      if (s.tone === profile.tone) score += 20;
      if (profile.purpose === "발음·연음 교정" && s.sound?.note?.length > 90) score += 15;
      if (weaknesses.includes("문법") && s.grammarKeys.length > 1) score += 15;
      if (weaknesses.includes("듣기") && s.sound) score += 12;
      if (weaknesses.includes("어휘") && s.vocab?.length >= 2) score += 10;
      return { s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.s);
}

export function getNewsSentences(profile: Profile) {
  return getRecommendedSentences(profile, { newsOnly: true, countOverride: 3 });
}

/**
 * DB에서 가져온 뉴스 문장을 사용자 수준·상황·말투에 맞게 정렬합니다.
 * - 같은 수준이 가장 먼저, 한 단계 쉬운 수준은 그다음, 너무 어렵거나 쉬운 문장은 맨 뒤로 보냅니다.
 * - 점수가 같으면 가져온 순서(최신순)를 그대로 유지합니다.
 */
export function rankNewsForProfile<T extends { level?: string; situations?: string[]; tone?: string }>(rows: T[], profile: Profile | null): T[] {
  if (!profile) return rows;
  const legacyLevel = profile.level || LEVEL_TO_LEGACY[profile.levelCode] || "기초 회화";
  const scored = rows.map((s, idx) => {
    let score = 0;
    if (s.level === legacyLevel) score += 100;
    else if (legacyLevel === "중상급" && s.level === "기초 회화") score += 30;
    else if (legacyLevel === "기초 회화" && s.level === "왕초보") score += 30;
    else score -= 40;
    if (s.situations?.includes(profile.situation)) score += 30;
    if (s.tone === profile.tone) score += 20;
    return { s, score, idx };
  });
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.map((x) => x.s);
}

const TONE_EN_TO_KO: Record<string, string> = { formal: "정중한 비즈니스", neutral: "중립 실무", casual: "캐주얼 친근" };

/** 표현 뱅크의 최신 표현을 앱의 학습 문장 모양으로 바꿉니다. (어휘 카드는 없어요) */
export function phraseToSentence(p: PhraseBankEntry) {
  return {
    id: `pb-${p.id}`,
    level: undefined,
    topic: "일상 및 오피스 회화",
    tone: TONE_EN_TO_KO[p.tone || "neutral"] || "중립 실무",
    situations: p.situation ? [p.situation] : [],
    text: p.english,
    translation: p.korean,
    grammarKeys: [p.grammarKey],
    vocab: [] as { word: string; meaning: string; freq?: string }[],
    nativeAlternatives: p.note ? [{ en: p.english, ko: p.korean, note: p.note }] : [],
    sourceUrl: p.sourceUrl,
    badge: "최신 표현",
    isNews: false,
  };
}

/** 목록에서 n개를 seed 위치부터 이어 뽑습니다. seed가 바뀌면 다른 문장이 나오고, 끝나면 처음으로 돌아가요. */
function pickRotating<T>(arr: T[], n: number, seed: number): T[] {
  if (!arr.length || n <= 0) return [];
  const take = Math.min(n, arr.length);
  const start = ((seed * take) % arr.length + arr.length) % arr.length;
  return Array.from({ length: take }, (_, i) => arr[(start + i) % arr.length]);
}

/**
 * 오늘의 추천 문장: 내 설문에 맞춘 기본 문장 풀 + 표현 뱅크(승인된 표현) 풀에서
 * 날짜(seed)마다 다른 문장을 돌려가며 뽑습니다. "다른 문장 보기"는 seed를 올려요.
 * 왕초보에게는 어려울 수 있어 표현 뱅크 문장을 넣지 않아요. 이미 저장한 문장은 뺍니다.
 */
export function buildRecommended(profile: Profile | null, fresh: PhraseBankEntry[], savedIds: Set<string | undefined>, seed: number) {
  if (!profile) return [];
  const count = TIME_TO_COUNT[profile.dailyTime] || 3;
  const basePool = getRecommendedSentences(profile, { countOverride: 12 }).filter((x) => !savedIds.has(x.id));
  const wantTone = Object.entries(TONE_EN_TO_KO).find(([, ko]) => ko === profile.tone)?.[0];
  const freshPool = profile.level === "왕초보"
    ? []
    : fresh
        .filter((p) => !savedIds.has(`pb-${p.id}`) && p.english.length <= 90)
        .sort((a, b) => Number(b.tone === wantTone) - Number(a.tone === wantTone)); // 같은 말투 먼저
  const freshSlots = freshPool.length ? Math.min(2, count - 1) : 0;
  const picked = [
    ...pickRotating(basePool.length ? basePool : getRecommendedSentences(profile, { countOverride: 12 }), count - freshSlots, seed),
    ...pickRotating(freshPool, freshSlots, seed).map(phraseToSentence),
  ];
  return picked;
}

export function describeProfile(p: Profile) {
  if (!p) return "";
  const topics = (p.topics || []).slice(0, 2).join(" · ") || p.topic;
  const weak = (p.weaknesses || [p.weakness]).filter(Boolean).slice(0, 2).join(", ");
  return `${p.levelCode || p.level} · ${topics} · ${p.tone} · ${weak}`;
}

export function findPastGrammarCases(key: string, history: HistoryItem[], currentId: string) {
  return history.filter((h) => h.grammarKeys.includes(key) && h.sentenceId !== currentId).slice(-3).reverse();
}

export function getRoleplayScene(profile?: Profile) {
  const map: Record<string, string> = {
    "외국인 동료와 일상 대화": "점심시간, 외국인 동료가 옆자리에 앉으며 가볍게 말을 겁니다. 지난주 프로젝트 이야기로 자연스럽게 넘어갑니다.",
    "화상회의 및 발표": "주간 화상회의가 시작됐습니다. 팀 리더가 당신에게 담당 업무의 진행 상황을 묻습니다.",
    "이메일 및 문서": "해외 파트너가 일정 변경을 요청하는 메시지를 보냈습니다. 정중하게 조율해야 합니다.",
    "해외 출장 및 여행": "출장 첫날, 현지 사무실에서 처음 만난 담당자와 미팅 일정을 조율하고 있습니다.",
  };
  if (profile?.situation && map[profile.situation]) return map[profile.situation];
  // 상황을 고르지 않았다면 날짜마다 다른 장면으로 돌려요.
  const keys = Object.keys(map);
  return map[keys[Math.floor(Date.now() / 86400000) % keys.length]];
}
