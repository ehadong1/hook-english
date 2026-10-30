import { useState, useEffect, useMemo } from "react";
import type { HistoryItem, Profile, Sentence, Store, StoreItem } from "./types";
import type { TabKey } from "./components/RoutineGuide";
import { BookOpen, Volume2, Mic, MessageCircle, Clock, Settings, Loader2, Notebook } from "lucide-react";
import { getDeviceId } from "./lib/deviceId";
import { isSupabaseConfigured, ensureSessionUserId } from "./lib/supabaseClient";
import { fetchRemoteState, saveProfileRemote, insertItemRemote, updateItemRemote, insertHistoryRemote } from "./lib/persistence";
import { NotebookModal, VoiceSettings } from "./components/Modals";
import { Badge, REVIEW_INTERVALS_DAYS, Toast, addDays, uid } from "./components/common";
import { GRAMMAR_LIBRARY, detectGrammarKeysFromText } from "./data/grammar";
import { SENTENCE_BANK } from "./data/sentences";
import { WEAKNESS_TO_TAB } from "./data/survey";
import { normalizeProfile } from "./lib/personalization";
import { loadVoices } from "./lib/speech";
import { HookWordmark, MainTab } from "./screens/Main";
import { Onboarding } from "./screens/Onboarding";
import { ReviewTab } from "./screens/Review";
import { RoleplayTab } from "./screens/Roleplay";
import { ScoringTab } from "./screens/Scoring";
import { TrainingTab } from "./screens/Training";

/* ============================================================================
   SECTION 16. App (최상위 상태 관리)
   ============================================================================ */

const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
  { key: "main", label: "메인", icon: BookOpen },
  { key: "training", label: "리스닝", icon: Volume2 },
  { key: "scoring", label: "발음", icon: Mic },
  { key: "review", label: "복습", icon: Clock },
  { key: "roleplay", label: "실전대화", icon: MessageCircle },
];

const TAB_KEYS: TabKey[] = ["main", "training", "scoring", "review", "roleplay"];
function tabFromHash(): TabKey {
  if (typeof window === "undefined") return "main";
  const k = window.location.hash.replace(/^#\/?/, "");
  return (TAB_KEYS as string[]).includes(k) ? (k as TabKey) : "main";
}

export default function App() {
  // 저장소의 사용자 식별자. Supabase가 켜져 있으면 익명 로그인으로 받은 auth.uid를 쓰고
  // (DB 규칙이 이 값 기준으로 "내 데이터만" 허용), 실패하거나 꺼져 있으면 예전 방식의
  // 기기 ID로 로컬 모드를 이어갑니다.
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // 탭을 주소(#/review 등)와 연결: 새로고침해도 같은 탭, 브라우저 뒤로가기도 동작합니다.
  const [tab, setTabState] = useState<TabKey>(tabFromHash);
  const setTab = (next: TabKey) => {
    setTabState(next);
    if (typeof window !== "undefined" && tabFromHash() !== next) window.location.hash = `/${next}`;
  };
  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [activeSentence, setActiveSentence] = useState<Sentence | null>(null);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<"notebook" | "voice" | null>(null);
  const isDev = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("dev"); // ?dev=1 일 때만 개발용 도구 표시
  const [virtualNow, setVirtualNow] = useState(new Date());
  const [store, setStore] = useState<Store>({ items: [] });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  // Supabase 미설정 시엔 기다릴 필요가 없으니 바로 "로딩 끝"으로 시작
  const [remoteLoaded, setRemoteLoaded] = useState(!isSupabaseConfigured);

  useEffect(() => { loadVoices().then((vs) => { setVoices(vs); setVoice(vs[0] || null); }); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setDeviceId(getDeviceId()); return; }
    let cancelled = false;
    ensureSessionUserId().then((id) => { if (!cancelled) setDeviceId(id || getDeviceId()); });
    return () => { cancelled = true; };
  }, []);

  // 사용자 식별자가 정해지면, 이 사용자에게 저장된 온보딩 결과/단어장/이력을 Supabase에서 불러옵니다.
  // 키가 설정되어 있지 않으면(로컬 전용 모드) 아무 것도 하지 않고 넘어갑니다.
  useEffect(() => {
    if (!isSupabaseConfigured || !deviceId) return;
    let cancelled = false;
    fetchRemoteState(deviceId).then((remote) => {
      if (cancelled) return;
      if (remote.answers) setProfile(normalizeProfile(remote.answers));
      if (remote.items.length) setStore({ items: remote.items });
      if (remote.history.length) setHistory(remote.history);
      setRemoteLoaded(true);
    }).catch((err) => {
      console.warn("[Hook English] 저장된 데이터 불러오기 실패, 로컬 전용으로 계속합니다:", err);
      if (!cancelled) setRemoteLoaded(true);
    });
    return () => { cancelled = true; };
  }, [deviceId]);

  // 문장 열람 시마다 문법 이력 축적 → "지난번 사례" 노출에 사용
  useEffect(() => {
    if (!activeSentence) return;
    setHistory((h) => {
      if (h.some((x) => x.sentenceId === activeSentence.id)) return h;
      const entry = {
        sentenceId: activeSentence.id,
        text: activeSentence.text,
        grammarKeys: activeSentence.grammarKeys || [],
        at: virtualNow.toISOString(),
      };
      insertHistoryRemote(deviceId, entry);
      return [...h, entry];
    });
  }, [activeSentence]);

  const savedSentences = store.items.filter((i) => i.type === "sentence");
  const savedWords = store.items.filter((i) => i.type === "word");
  const savedIds = useMemo(() => new Set(savedSentences.map((i) => i.sourceId)), [store]);
  const dueCount = store.items.filter((i) => !i.mastered && new Date(i.nextReviewAt) <= virtualNow).length;

  const addItem = (payload: Pick<StoreItem, "type" | "text"> & Partial<StoreItem>) => {
    const item: StoreItem = { id: uid(payload.type), stage: 0, nextReviewAt: addDays(virtualNow, REVIEW_INTERVALS_DAYS[0]).toISOString(), mastered: false, ...payload };
    setStore((p) => ({ ...p, items: [...p.items, item] }));
    insertItemRemote(deviceId, item);
  };

  const handleSaveWord = (v: Sentence, sentence: Sentence) => {
    if (store.items.some((i) => i.type === "word" && i.text === v.word)) { setToast("이미 나만의 영어노트에 있어요"); return; }
    addItem({ type: "word", text: v.word, meaning: v.meaning, sourceId: sentence.id });
    setToast(`'${v.word}' 나만의 영어노트에 저장되었습니다`);
  };

  const handleSaveSentence = (s: Sentence) => {
    if (savedIds.has(s.id)) return;
    addItem({ type: "sentence", text: s.text, meaning: s.translation, sourceId: s.id });
    setToast("나만의 영어노트에 저장되었습니다");
    const weaknesses = profile?.weaknesses || [profile?.weakness].filter(Boolean);
    const target = WEAKNESS_TO_TAB[weaknesses[0]] || "main";
    setTab(target === "main" ? "training" : (target as TabKey));
  };

  const handleStartCustom = (englishText: string, originKo: string | null, meta?: Sentence) => {
    // meta는 ComposerBox가 실제 GPT 호출(translate Edge Function) 결과를 그대로 넘겨준 것.
    // GPT가 골라준 문법 키/어휘/대안 표현이 있으면 그걸 쓰고, 없으면(GPT 미연결/실패) 예전
    // 정규식 기반 추측으로 폴백합니다.
    const validGrammarKeys = (meta?.grammarKeys || []).filter((k: string) => GRAMMAR_LIBRARY[k]);
    const llmVocab = (meta?.vocab || [])
      .filter((v: Sentence) => v?.word && v?.meaning)
      .map((v: Sentence) => ({ word: String(v.word).toLowerCase(), meaning: v.meaning, freq: v.note || "GPT 분석" }));

    let grammarKeys = validGrammarKeys;
    let vocab = llmVocab;

    if (!grammarKeys.length || !vocab.length) {
      const words = englishText.replace(/[.,!?]/g, "").split(" ");
      if (!grammarKeys.length) {
        const detected = detectGrammarKeysFromText(englishText);
        grammarKeys = (detected.length ? detected : ["phrasalVerb"]).slice(0, 3);
      }
      if (!vocab.length) {
        vocab = words.filter((w: string) => w.length > 3).slice(0, 3).map((w: string) => ({ word: w.toLowerCase(), meaning: "직접 입력 문장의 어휘", freq: "빈도 데이터 없음" }));
      }
    }

    setActiveSentence({
      id: uid("custom"),
      level: profile?.level, topic: profile?.topic, tone: profile?.tone,
      text: englishText,
      originKo,
      translation: originKo || "(직접 입력한 문장)",
      grammarKeys,
      vocab,
      sound: {
        title: "일반 연음 패턴",
        pattern: "자음 + 모음 → 이어서 발음",
        note: "직접 입력한 문장에는 일반 연음 규칙을 적용합니다. 앞 단어가 자음으로 끝나고 뒤 단어가 모음으로 시작하는 지점을 찾아 붙여서 발음해 보세요. 그리고 내용어(명사·동사·형용사)에만 강세를 주고 기능어(전치사·관사·조동사)는 빠르게 흘리세요.",
        examples: [
          { en: "**Can you** hear me okay?", ko: "잘 들리세요?" },
          { en: "Let me **get back** to you.", ko: "확인하고 알려드릴게요." },
        ],
      },
      nativeAlternatives: meta?.alternatives || [],
    });
    setToast("입력한 문장으로 학습을 시작합니다");
  };

  const handleReviewFromNotebook = (item: StoreItem) => {
    const found = SENTENCE_BANK.find((s) => s.id === item.sourceId);
    if (found) setActiveSentence(found);
    else {
      setActiveSentence({
        id: item.sourceId || item.id,
        text: item.text,
        translation: item.meaning || "",
        grammarKeys: ["phrasalVerb"],
        vocab: [],
        nativeAlternatives: [],
      });
    }
    setModal(null);
    setTab("main");
  };

  const markMastered = (id: string) => {
    setStore((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, mastered: true } : i)) }));
    updateItemRemote(deviceId, id, { mastered: true });
  };

  if (!remoteLoaded) {
    return (
      <div className="max-w-[400px] mx-auto min-h-screen bg-white flex items-center justify-center text-gray-400 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" /> 저장된 학습 기록 불러오는 중...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-[400px] mx-auto min-h-screen bg-white shadow-xl">
        <Onboarding onComplete={(a) => { setProfile(normalizeProfile(a)); saveProfileRemote(deviceId, a); setTab("main"); }} />
      </div>
    );
  }

  const needSentence = <div className="px-4 pt-12 text-center text-sm text-gray-400">메인 탭에서 문장을 먼저 선택해주세요.</div>;

  return (
    <div className="max-w-[400px] mx-auto min-h-screen bg-white shadow-xl flex flex-col relative">
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white/95 backdrop-blur z-20 border-b border-gray-100">
        <HookWordmark size="sm" showSubtitle={false} />
        <div className="flex items-center gap-1">
          <button type="button" aria-label="음성 설정" onClick={() => setModal("voice")} className="p-2 text-gray-500"><Settings size={20} /></button>
          <button type="button" aria-label="나만의 영어노트 열기" onClick={() => setModal("notebook")} className="relative p-2 text-gray-500">
            <Notebook size={19} />{(savedSentences.length + savedWords.length) > 0 && <Badge n={savedSentences.length + savedWords.length} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "main" && (
          <MainTab
            profile={profile} activeSentence={activeSentence} setActiveSentence={setActiveSentence}
            history={history} onSaveWord={handleSaveWord} onSaveSentence={handleSaveSentence}
            savedIds={savedIds} onStartCustom={handleStartCustom} savedSentences={savedSentences} onGoTab={setTab}
          />
        )}
        {tab === "training" && (activeSentence ? <TrainingTab sentence={activeSentence} voice={voice} /> : needSentence)}
        {tab === "scoring" && (activeSentence ? <ScoringTab sentence={activeSentence as { text: string }} voice={voice} /> : needSentence)}
        {tab === "review" && <ReviewTab store={store} setStore={setStore} virtualNow={virtualNow} advanceDay={() => setVirtualNow((d) => addDays(d, 1))} deviceId={deviceId} devTools={isDev} />}
        {tab === "roleplay" && <RoleplayTab savedSentences={savedSentences} profile={profile} />}
      </div>

      <div className="border-t border-gray-100 bg-white flex justify-around py-2 sticky bottom-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button type="button" key={t.key} onClick={() => setTab(t.key)} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-0.5 px-2 py-1 relative min-w-[56px]">
              <Icon size={19} className={active ? "text-brand-600" : "text-gray-400"} />
              <span className={`text-xs font-medium ${active ? "text-brand-600" : "text-gray-400"}`}>{t.label}</span>
              {t.key === "review" && dueCount > 0 && (
                <span className="absolute -top-1 right-0 bg-rose-500 text-white text-xs rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{dueCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {modal === "notebook" && (
        <NotebookModal
          sentences={savedSentences}
          words={savedWords}
          history={history}
          onClose={() => setModal(null)}
          onMaster={markMastered}
          onSelectSentence={handleReviewFromNotebook}
        />
      )}
      {modal === "voice" && <VoiceSettings voices={voices} selected={voice} onSelect={setVoice} onClose={() => setModal(null)} />}

      <Toast message={toast} />
    </div>
  );
}
