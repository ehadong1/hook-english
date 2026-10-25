import { SENTENCE_BANK } from "../data/sentences";
import { LEVEL_TO_LEGACY, TIME_TO_COUNT, TOPIC_TO_BANK } from "../data/survey";
import type { HistoryItem, Profile } from "../types";

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
  return map[profile?.situation] || map["화상회의 및 발표"];
}
