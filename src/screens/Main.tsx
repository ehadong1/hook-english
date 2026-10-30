import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { Mic, Check, X, Star, Sparkles, Languages, Loader2, Newspaper, PenLine, Notebook } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { fetchLatestPhrases, fetchNewsSentences, type PhraseBankEntry } from "../lib/persistence";
import { SpeakButton } from "../components/common";
import { TOPIC_TO_BANK } from "../data/survey";
import { getNewsSentences, getRecommendedSentences, mixFreshPhrases, rankNewsForProfile } from "../lib/personalization";
import { createRecognizer, isSTTSupported } from "../lib/speech";
import type { HistoryItem, Profile, Sentence, StoreItem } from "../types";
import { containsKorean, describeLlmFailure, translateKoreanToEnglish, writingFeedbackProvider } from "../lib/translate";
import { SentenceDissection } from "./Grammar";
import { RoutineGuide, type TabKey } from "../components/RoutineGuide";

/* ============================================================================
   SECTION 14. 메인 탭 (텍스트 + 음성 입력 + 한글 영작)
   ============================================================================ */

export async function analyzeUserWriting(text: string, profile: Profile, mode = "diary") {
  const raw = (text || "").trim();
  if (!raw) return null;

  let notice;
  if (writingFeedbackProvider) {
    try {
      const r = await writingFeedbackProvider(raw, profile, mode);
      return { original: raw, ...r, confidence: "high", source: "llm" };
    } catch (e) {
      notice = describeLlmFailure(e).replace("간이 번역으로 보여드려요", "간이 첨삭으로 보여드려요");
      /* 폴백 */
    }
  }

  const isKo = containsKorean(raw);
  const words = raw.replace(/[^\w\s']/g, " ").split(/\s+/).filter(Boolean);
  const hasSubject = /\b(I|We|They|He|She|It|My|The|Our)\b/i.test(raw);
  const hasVerb = /\b(is|are|was|were|have|has|had|do|did|will|can|could|learned|worked|discussed|met|finished|think|feel)\b/i.test(raw);
  const tips = [];
  if (!hasSubject && !isKo) tips.push("문장 시작에 I / We / The 등 주어를 명확히 두면 더 자연스럽습니다.");
  if (!hasVerb && !isKo) tips.push("동사(learned, discussed, finished 등)가 있어야 완전한 문장이 됩니다.");
  if (isKo) tips.push("한글로 쓰셨네요. 아래 영어 제안을 참고해 다시 써 보세요.");
  if ((profile.weaknesses || []).includes("문법")) tips.push("시제를 하루 전체로 통일했는지 확인해 보세요.");

  let corrected = raw;
  let natural = raw;
  if (isKo) {
    corrected = mode === "diary"
      ? "Today I practiced the sentences I learned and discussed key updates with my team."
      : "I would like to reschedule our meeting to Thursday afternoon.";
    natural = "Wrapped up today by using the phrases I studied — felt more natural than yesterday.";
  } else {
    corrected = raw.replace(/\bi\b/g, "I").replace(/\s+/g, " ").trim();
    if (!/[.!?]$/.test(corrected)) corrected += ".";
    natural = corrected.replace(/I think that /i, "I think ").replace(/very very/i, "really");
  }

  return {
    original: raw,
    corrected,
    natural,
    structure: hasSubject && hasVerb
      ? "S + V (+ O/Adv) — 기본 문장 구조를 갖추고 있습니다."
      : "주어 + 동사 + (목적어/부사) 순서로 완성해 보세요.",
    tips,
    keywordsUsed: words.filter((w) => w.length > 3).slice(0, 5),
    source: "fallback",
    notice,
  };
}

export function WritingPractice({ profile, mode, savedSentences, onClose }: { profile: Profile; mode: string; savedSentences: StoreItem[]; onClose: () => void }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState<Sentence | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const recRef = useRef<any>(null);
  const sttOk = isSTTSupported();
  const prompt = mode === "diary"
    ? "오늘 배운 문장을 활용해 영어 일기를 3~5문장 써 보세요."
    : "배운 표현을 써서 업무 상황 문장을 만들어 보세요.";
  const hint = savedSentences.length
    ? `힌트: ${savedSentences.slice(-2).map((s) => s.text).join(" / ")}`
    : "먼저 문장을 학습·저장하면 힌트가 표시됩니다.";

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = createRecognizer("en-US");
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (e: any) => setText(Array.from(e.results).map((r: any) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const submit = async () => {
    setAnalyzing(true);
    const fb = await analyzeUserWriting(text, profile, mode);
    setAnalyzing(false);
    setFeedback(fb);
  };

  return (
    <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{mode === "diary" ? "오늘의 일기 쓰기" : "문장 만들어 보기"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{prompt}</p>
        </div>
        <button type="button" aria-label="닫기" onClick={onClose} className="text-gray-400 p-1"><X size={16} /></button>
      </div>
      <p className="text-xs text-brand-600 bg-brand-50 rounded-lg px-2 py-1 mb-2">{hint}</p>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setFeedback(null); }}
        rows={4}
        placeholder="Type or speak in English..."
        className="w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
      />
      <div className="flex gap-2 mt-2">
        {sttOk && (
          <button onClick={toggleMic} className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 ${listening ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-600"}`}>
            <Mic size={14} /> {listening ? "녹음 중" : "음성 입력"}
          </button>
        )}
        <button onClick={submit} disabled={!text.trim() || analyzing} className="flex-1 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
          {analyzing ? <><Loader2 size={14} className="animate-spin" /> 분석 중...</> : "피드백 받기"}
        </button>
      </div>
      {feedback && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {feedback.source === "fallback" && (
            <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-2.5 py-2 leading-relaxed">
              간이 첨삭이에요. {feedback.notice || "AI 첨삭을 쓰지 못했어요."} 정확도가 낮을 수 있으니 참고용으로만 봐주세요.
            </p>
          )}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-400 mb-1">교정 문장</p>
            <p className="text-sm font-semibold text-gray-900">{feedback.corrected}</p>
            <SpeakButton text={feedback.corrected} size={14} />
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-xs font-bold text-emerald-600 mb-1">더 자연스러운 표현</p>
            <p className="text-sm text-gray-800">{feedback.natural}</p>
          </div>
          <div className="bg-brand-50 rounded-xl p-3">
            <p className="text-xs font-bold text-brand-600 mb-1">구조</p>
            <p className="text-xs text-brand-900">{feedback.structure}</p>
          </div>
          {feedback.tips.map((t: string, i: number) => (
            <p key={i} className="text-xs text-gray-600">· {t}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComposerBox({ profile, onStart, minimal = false, onSubmit }: { profile: Profile; onStart: (english: string, originKo: string | null, meta?: Sentence) => void; minimal?: boolean; onSubmit?: () => void }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<Sentence | null>(null);
  const recRef = useRef<any>(null);
  const sttOk = isSTTSupported();

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = createRecognizer("ko-KR");
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (e: any) => setText(Array.from(e.results).map((r: any) => r[0].transcript).join(""));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const handleGo = async () => {
    const t = text.trim();
    if (!t) return;
    onSubmit?.(); // 새 문장을 입력하면 이전에 보던 문장·목록은 화면에서 치웁니다
    if (containsKorean(t)) {
      setTranslating(true);
      const r = await translateKoreanToEnglish(t, profile);
      setTranslating(false);
      setResult(r);
    } else onStart(t, null);
  };

  return (
    <div className={minimal ? "mt-2" : "mt-4"}>
      {!minimal && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400">오늘 직접 써보고 싶은 문장</p>
          <span className="text-xs text-gray-400">한글로 써도 뉘앙스를 살려 영작해 드려요</span>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleGo()}
            placeholder={listening ? "듣고 있어요..." : minimal ? "영어로 하고 싶은 말을 써보세요 (한글 OK)" : "예: 회의 일정 좀 조정하고 싶은데요"}
            className="w-full pl-3.5 pr-11 py-3 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-brand-300"
          />
          {sttOk && (
            <button type="button" aria-label={listening ? "음성 입력 중지" : "음성으로 입력"} onClick={toggleMic} className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center ${listening ? "bg-rose-500 text-white animate-pulse" : "bg-white text-gray-500 border border-gray-200"}`}>
              <Mic size={15} />
            </button>
          )}
        </div>
        <button onClick={handleGo} disabled={translating} className="px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold shrink-0 disabled:opacity-60">
          {translating ? <Loader2 size={16} className="animate-spin" /> : "시작"}
        </button>
      </div>

      {!sttOk && <p className="text-xs text-gray-400 mt-1.5">이 브라우저는 음성 입력을 지원하지 않아요. Chrome / Edge를 권장합니다.</p>}

      {result && (
        <div className="mt-3 bg-white border-2 border-brand-100 rounded-2xl p-3.5">
          {result.source !== "llm" && (
            <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-2.5 py-2 mb-2 leading-relaxed">
              간이 번역이에요. {result.notice || "AI 번역을 쓰지 못했어요."} 정확도가 낮을 수 있으니 참고용으로만 써주세요.
            </p>
          )}
          <div className="flex items-center gap-1.5 mb-2">
            <Languages size={14} className="text-brand-600" />
            <p className="text-xs font-bold text-brand-600">뉘앙스를 살린 영어 문장</p>
            {result.confidence === "low" && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-auto">정확도 낮음</span>}
          </div>
          <div className="flex justify-between items-start gap-2">
            <p className="text-base font-bold text-gray-900 leading-snug">{result.english}</p>
            <SpeakButton text={result.english} />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mt-2 bg-gray-50 rounded-lg p-2.5">{result.nuance}</p>

          {result.alternatives?.length > 0 && (
            <div className="mt-2.5">
              <p className="text-xs font-bold text-emerald-600 mb-1.5">원어민들은 이렇게도 표현해요</p>
              <div className="space-y-1.5">
                {result.alternatives.map((a: { en: string; ko: string; note: string }, i: number) => (
                  <div key={i} className="bg-emerald-50 rounded-lg p-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium text-gray-900">{a.en}</p>
                      <SpeakButton text={a.en} size={15} className="text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{a.ko}</p>
                    <p className="text-xs text-emerald-600 mt-1">TIP · {a.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { onStart(result.english, text.trim(), result); setResult(null); }} className="w-full mt-3 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold">
            이 문장 해설 보기 (구조·단어·표현)
          </button>
        </div>
      )}
    </div>
  );
}

export function HookWordmark({ size = "md", showSubtitle = true }) {
  const isHero = size === "hero";
  const cfg = {
    sm: { text: "text-[18px]", sub: "text-[9px] tracking-[0.3em]", titleGap: "mt-1.5" },
    hero: { text: "text-[68px]", sub: "text-[20px] tracking-[0.28em]", titleGap: "mt-1" },
  }[size] || { text: "text-3xl", sub: "text-sm tracking-[0.28em]", titleGap: "mt-2" };

  return (
    <div className="inline-flex flex-col items-center select-none">
      <span
        className={`hook-wordmark-title ${cfg.text}${isHero ? " hook-wordmark-title--hero" : ""}`}
      >
        Hook
      </span>
      {showSubtitle && (
        <span
          className={`${cfg.sub} ${cfg.titleGap} font-extrabold text-[#3d5168] uppercase`}
          style={{ fontFamily: "var(--font-ui)" }}
        >
          English
        </span>
      )}
    </div>
  );
}

export function SentenceList({ sentences, activeId, onSelect, badge, renderDetail }: { sentences: Sentence[]; activeId?: string; onSelect: (s: Sentence) => void; badge?: string; renderDetail?: (s: Sentence) => ReactNode }) {
  if (!sentences.length) return <p className="text-xs text-gray-500 text-center py-6">표시할 문장이 없어요.</p>;
  return (
    <div className="space-y-2">
      {sentences.map((s) => (
        <div key={s.id}>
          <button onClick={() => onSelect(s)} aria-expanded={activeId === s.id} className={`w-full text-left p-3 rounded-xl border-2 ${activeId === s.id ? "border-brand-600 bg-brand-50" : "border-gray-100 bg-white"}`}>
            {(s.badge || badge) && <span className="text-xs text-brand-500 font-bold">{s.badge || badge}</span>}
            <p className="text-sm font-semibold text-gray-900">{s.text}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.translation}</p>
          </button>
          {activeId === s.id && renderDetail?.(s)}
        </div>
      ))}
    </div>
  );
}

type MainTabProps = {
  profile: Profile;
  activeSentence: Sentence | null;
  setActiveSentence: (s: Sentence | null) => void;
  history: HistoryItem[];
  onSaveWord: (v: Sentence, s: Sentence) => void;
  onSaveSentence: (s: Sentence) => void;
  savedIds: Set<string | undefined>;
  onStartCustom: (english: string, originKo: string | null, meta?: Sentence) => void;
  savedSentences: StoreItem[];
  onGoTab: (tab: TabKey) => void;
  onOpenNotes: () => void;
};

export function MainTab({ profile, activeSentence, setActiveSentence, history, onSaveWord, onSaveSentence, savedIds, onStartCustom, savedSentences, onGoTab, onOpenNotes }: MainTabProps) {
  const menuOpen = true; // 학습 메뉴는 접지 않고 항상 보여줍니다.
  const [menuMode, setMenuMode] = useState<string | null>(null);
  const baseRecommended = useMemo(() => getRecommendedSentences(profile), [profile]);

  // 표현 뱅크(Exa로 계속 수집·검수)의 최신 표현을 추천 문장에 섞어 넣습니다.
  const [freshPhrases, setFreshPhrases] = useState<PhraseBankEntry[]>([]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    fetchLatestPhrases(30).then((r) => { if (!cancelled) setFreshPhrases(r); }).catch(() => { /* 기본 추천 유지 */ });
    return () => { cancelled = true; };
  }, []);
  const recommended = useMemo(
    () => mixFreshPhrases(baseRecommended, freshPhrases, profile, savedIds),
    [baseRecommended, freshPhrases, profile, savedIds],
  );

  // 우선 정적 SENTENCE_BANK의 뉴스 문장으로 즉시 보여주고, Supabase에
  // 검수 완료(approved)된 실제 뉴스 문장이 있으면 백그라운드에서 교체합니다.
  // (Supabase 미설정/실패 시에도 화면이 비지 않도록 하는 안전장치)
  const [newsSentences, setNewsSentences] = useState<Sentence[]>(() => getNewsSentences(profile));
  const bankTopics = useMemo(
    () => [...new Set<string>((profile.topics || []).map((t: string) => TOPIC_TO_BANK[t]).filter(Boolean))],
    [profile]
  );
  useEffect(() => {
    setNewsSentences(getNewsSentences(profile));
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchNewsSentences(bankTopics.length ? bankTopics : ["최신 시사 및 뉴스"]);
        if (!cancelled && remote.length) setNewsSentences(rankNewsForProfile(remote, profile).slice(0, 3));
      } catch {
        /* 폴백(정적 문장) 유지 */
      }
    })();
    return () => { cancelled = true; };
  }, [profile, bankTopics]);

  const weaknesses = profile.weaknesses || [profile.weakness].filter(Boolean);
  const autoOpen = weaknesses.includes("문법") || weaknesses.includes("문장 구성");
  const openMenu = (mode: string) => { setMenuMode(mode); };

  // 문장을 고르면 그 문장 바로 아래에 해설이 열리고, 화면이 자동으로 그 위치로 내려갑니다.
  const detailRef = useRef<HTMLDivElement>(null);
  const activeId = activeSentence?.id;
  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return () => clearTimeout(t);
  }, [activeId]);

  const listed = menuOpen
    ? menuMode === "recommended" ? recommended : menuMode === "news" ? newsSentences : []
    : [];
  const inlineShown = !!activeSentence && listed.some((s) => s.id === activeSentence.id);

  const activeCard = (s: Sentence) => (
    <div ref={detailRef} className="mt-2 mb-1 bg-white border-2 border-brand-200 rounded-2xl p-4 scroll-mt-16">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-500">학습 중인 문장</p>
        {history.some((h) => h.sentenceId === s.id) && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">이전 학습</span>
        )}
      </div>
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-lg font-bold text-gray-900 leading-snug">{s.text}</p>
          <p className="text-sm text-gray-600 mt-1">{s.translation}</p>
          {s.originKo && <p className="text-xs text-gray-500 mt-1">원문: {s.originKo}</p>}
        </div>
        <SpeakButton text={s.text} size={20} />
      </div>
      <SentenceDissection sentence={s} history={history} onSaveWord={onSaveWord} defaultOpen={autoOpen} />
      <button
        onClick={() => onSaveSentence(s)}
        disabled={savedIds.has(s.id)}
        className={`w-full mt-4 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 ${savedIds.has(s.id) ? "bg-gray-100 text-gray-500" : "bg-brand-600 text-white"}`}
      >
        {savedIds.has(s.id) ? <><Check size={15} /> 저장됨</> : <><Star size={15} /> 나만의 영어노트에 저장하고 훈련 시작</>}
      </button>
    </div>
  );

  return (
    <div className="px-4 pb-6">
      <div className="pt-5 pb-4 text-center rounded-2xl bg-gradient-to-b from-[#f4f7fb] via-white to-white border border-[#e4ebf3] mb-1">
        <HookWordmark size="hero" />
        <p className="mt-3 text-base font-bold text-brand-700">하루 3문장 비즈니스 영어</p>
      </div>
      <ComposerBox profile={profile} onStart={onStartCustom} minimal onSubmit={() => { setMenuMode(null); setActiveSentence(null); }} />
      <RoutineGuide savedCount={savedSentences.length} onGo={onGoTab} onOpenNotes={onOpenNotes} />
      {menuOpen && (
        <>
          <div className="mt-3">
            <p className="text-sm font-extrabold text-brand-700">학습하기 <span className="font-medium text-xs text-gray-500">· 좋은 문장을 골라 이해해요</span></p>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button onClick={() => openMenu("recommended")} className="p-3 rounded-2xl bg-brand-50 border border-brand-100 text-left"><Sparkles size={16} className="text-brand-600 mb-1" /><p className="text-xs font-bold text-brand-800">오늘의 추천 3문장</p><p className="text-[11px] text-gray-500 mt-0.5">내 수준·분야에 맞춰요</p></button>
              <button onClick={() => openMenu("news")} className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-left"><Newspaper size={16} className="text-rose-600 mb-1" /><p className="text-xs font-bold text-rose-800">최신 뉴스 3문장</p><p className="text-[11px] text-gray-500 mt-0.5">요즘 실제 기사 표현</p></button>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-extrabold" style={{ color: "#8a6420" }}>연습하기 <span className="font-medium text-xs text-gray-500">· 내 말로 직접 써봐요</span></p>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button onClick={() => openMenu("diary")} className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-left"><PenLine size={16} className="text-amber-600 mb-1" /><p className="text-xs font-bold text-amber-800">오늘의 일기 쓰기</p><p className="text-[11px] text-gray-500 mt-0.5">하루를 영어로 쓰고 첨삭</p></button>
              <button onClick={() => openMenu("compose")} className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-left"><Notebook size={16} className="text-emerald-600 mb-1" /><p className="text-xs font-bold text-emerald-800">문장 만들어 보기</p><p className="text-[11px] text-gray-500 mt-0.5">배운 표현으로 새 문장</p></button>
            </div>
          </div>
          {menuMode === "recommended" && <div className="mt-4"><p className="text-xs font-bold text-gray-500 mb-2">내 설문(수준·업무 분야·말투)에 맞춘 추천 {recommended.length}문장</p><SentenceList sentences={recommended} activeId={activeSentence?.id} onSelect={setActiveSentence} renderDetail={activeCard} /></div>}
          {menuMode === "news" && <div className="mt-4"><p className="text-xs font-bold text-gray-500 mb-2">내가 고른 업무 분야의 최신 뉴스 기반 {newsSentences.length}문장</p><SentenceList sentences={newsSentences} activeId={activeSentence?.id} onSelect={setActiveSentence} badge="NEWS" renderDetail={activeCard} /></div>}
          {(menuMode === "diary" || menuMode === "compose") && <WritingPractice profile={profile} mode={menuMode} savedSentences={savedSentences} onClose={() => setMenuMode(null)} />}
        </>
      )}

      {activeSentence && !inlineShown && <div className="mt-6">{activeCard(activeSentence)}</div>}
    </div>
  );
}
