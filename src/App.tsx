import { useState, useEffect, useMemo } from "react";
import type { HistoryItem, Profile, Sentence, Store, StoreItem } from "./types";
import type { TabKey } from "./components/RoutineGuide";
import { BookOpen, Volume2, Mic, MessageCircle, Clock, Loader2, Notebook, User } from "lucide-react";
import { getDeviceId } from "./lib/deviceId";
import { isSupabaseConfigured, ensureSessionUserId, getAuthInfo, consumeLinkConflict, supabase, type AuthInfo } from "./lib/supabaseClient";
import { flushPendingConsent } from "./lib/consent";
import { AccountSheet } from "./components/AccountSheet";
import { installCloudTTS } from "./lib/ttsProvider";
import { fetchRemoteState, saveProfileRemote, insertItemRemote, updateItemRemote, insertHistoryRemote } from "./lib/persistence";
import { NotebookModal, VoiceSettings } from "./components/Modals";
import { REVIEW_INTERVALS_DAYS, Toast, addDays, uid } from "./components/common";
import { GRAMMAR_LIBRARY, detectGrammarKeysFromText } from "./data/grammar";
import { SENTENCE_BANK } from "./data/sentences";
import { WEAKNESS_TO_TAB } from "./data/survey";
import { normalizeProfile } from "./lib/personalization";
import { loadVoices } from "./lib/speech";
import { MainTab } from "./screens/Main";
import { Onboarding } from "./screens/Onboarding";
import { Tutorial } from "./components/Tutorial";
import { ReviewTab } from "./screens/Review";
import { RoleplayTab } from "./screens/Roleplay";
import { ScoringTab } from "./screens/Scoring";
import { TrainingTab } from "./screens/Training";

/* ============================================================================
   SECTION 16. App (최상위 상태 관리)
   ============================================================================ */

// step: 5단계 활용법과 연결되는 번호
const TABS: { key: TabKey; label: string; step: string; icon: typeof BookOpen }[] = [
  { key: "main", label: "문장·해설", step: "1단계", icon: BookOpen },
  { key: "training", label: "듣기", step: "2단계", icon: Volume2 },
  { key: "scoring", label: "말하기", step: "3단계", icon: Mic },
  { key: "roleplay", label: "실전대화", step: "4단계", icon: MessageCircle },
  { key: "review", label: "복습", step: "5단계", icon: Clock },
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
  const [modal, setModal] = useState<"notebook" | "voice" | "account" | null>(null);
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [linkConflict, setLinkConflict] = useState(false);
  const isDev = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("dev"); // ?dev=1 일 때만 개발용 도구 표시
  const [virtualNow, setVirtualNow] = useState(new Date());
  const [store, setStore] = useState<Store>({ items: [] });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  // Supabase 미설정 시엔 기다릴 필요가 없으니 바로 "로딩 끝"으로 시작
  const [remoteLoaded, setRemoteLoaded] = useState(!isSupabaseConfigured);

  // AI 원어민 음성(실패하면 기기 기본 음성으로 자동 대체)
  useEffect(() => { if (isSupabaseConfigured) installCloudTTS(); }, []);
  useEffect(() => { loadVoices().then((vs) => { setVoices(vs); setVoice(vs[0] || null); }); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setDeviceId(getDeviceId()); return; }
    let cancelled = false;
    ensureSessionUserId().then((id) => { if (!cancelled) setDeviceId(id || getDeviceId()); });
    return () => { cancelled = true; };
  }, []);

  // 로그인 상태(익명/구글) 추적. 구글 로그인에서 돌아오면 동의 기록을 서버에 저장하고 안내합니다.
  useEffect(() => {
    if (!isSupabaseConfigured || !deviceId) return;
    let cancelled = false;
    if (consumeLinkConflict()) { setLinkConflict(true); setModal("account"); }
    const refresh = async () => {
      const info = await getAuthInfo();
      if (cancelled) return;
      setAuth(info);
      if (info && !info.isAnonymous) {
        flushPendingConsent(info.userId);
      }
    };
    refresh();
    const sub = supabase?.auth.onAuthStateChange(() => { refresh(); });
    return () => { cancelled = true; sub?.data.subscription.unsubscribe(); };
  }, [deviceId]);

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
      .map((v: Sentence) => ({ word: String(v.word).toLowerCase(), meaning: v.meaning, pos: v.pos, freq: v.note || "GPT 분석" }));

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

  // 설문 화면 미리보기(저장하지 않음): 주소 끝에 #/survey-preview
  if (typeof window !== "undefined" && window.location.hash === "#/survey-preview") {
    return (
      <div className="max-w-[400px] mx-auto min-h-screen bg-white shadow-xl">
        <Onboarding onComplete={() => { window.location.hash = ""; window.location.reload(); }} />
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

  // 시작 화면 바꾸기 (내 계정 화면): "own"(내 말부터) 또는 "given"(추천 문장부터)
  const changeStart = (choice: string) => {
    const next = normalizeProfile({ ...profile, startMode: choice === "own" ? "own" : "given" });
    setProfile(next);
    saveProfileRemote(deviceId, next);
  };
  const recentSaved = [...savedSentences].reverse().slice(0, 3);
  const needSentence = (what: string) => (
    <div className="px-5 pt-10 pb-6">
      <p className="text-base font-bold text-gray-900 text-center">{what}</p>
      <p className="text-sm text-gray-600 text-center mt-1.5 leading-relaxed">연습할 문장이 아직 없어요.<br />저장해 둔 문장을 고르거나, 새 문장을 만들어 보세요.</p>
      {recentSaved.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-bold text-gray-500">최근 저장한 문장으로 바로 연습</p>
          {recentSaved.map((it) => (
            <button key={it.id} type="button" onClick={() => handleReviewFromNotebook(it)} className="w-full text-left rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-3 active:opacity-80">
              <span className="block text-sm font-semibold text-gray-900 break-words">{it.text}</span>
              {it.meaning && <span className="block text-xs text-gray-500 mt-0.5 break-words">{it.meaning}</span>}
            </button>
          ))}
          <button type="button" onClick={() => setModal("notebook")} className="w-full text-xs font-semibold text-brand-700 underline pt-1">나만의 영어노트에서 고르기</button>
        </div>
      )}
      <button type="button" onClick={() => setTab("main")} className="w-full mt-5 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold">
        내가 영어로 하고 싶은 말 입력하러 가기
      </button>
    </div>
  );

  return (
    <div className="max-w-[400px] mx-auto min-h-screen bg-white shadow-xl flex flex-col relative">
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white/95 backdrop-blur z-20 border-b border-gray-100">
        {isSupabaseConfigured ? (
          <button type="button" aria-label={auth && !auth.isAnonymous ? "내 계정" : "로그인"} onClick={() => setModal("account")} className="relative p-2 -ml-2 text-gray-500">
            <User size={22} className={auth && !auth.isAnonymous ? "text-brand-600" : ""} />
            {auth && !auth.isAnonymous && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
        ) : <span />}
        <button type="button" aria-label="나만의 영어노트 열기" onClick={() => setModal("notebook")} className="relative flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full bg-brand-50 text-brand-700 text-sm font-bold">
          <Notebook size={20} />나만의 영어노트
          {(savedSentences.length + savedWords.length) > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">{savedSentences.length + savedWords.length}</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "main" && (
          <MainTab
            profile={profile} activeSentence={activeSentence} setActiveSentence={setActiveSentence}
            history={history} onSaveWord={handleSaveWord} onSaveSentence={handleSaveSentence}
            savedIds={savedIds} onStartCustom={handleStartCustom} savedSentences={savedSentences} onGoTab={setTab} onOpenNotes={() => setModal("notebook")}
          />
        )}
        {tab === "training" && (activeSentence ? <TrainingTab sentence={activeSentence} voice={voice} /> : needSentence("듣기·따라 읽기 연습"))}
        {tab === "scoring" && (activeSentence ? <ScoringTab sentence={activeSentence as { text: string }} voice={voice} /> : needSentence("말하기 연습"))}
        {tab === "review" && <ReviewTab store={store} setStore={setStore} virtualNow={virtualNow} advanceDay={() => setVirtualNow((d) => addDays(d, 1))} deviceId={deviceId} devTools={isDev} />}
        {tab === "roleplay" && <RoleplayTab savedSentences={savedSentences} profile={profile} />}
      </div>

      <div data-tour="tabs" className="border-t border-gray-100 bg-white flex justify-around py-2 sticky bottom-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button type="button" key={t.key} onClick={() => setTab(t.key)} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-0.5 px-2 py-1 relative min-w-[56px]">
              <Icon size={19} className={active ? "text-brand-600" : "text-gray-400"} />
              <span className={`text-xs font-medium ${active ? "text-brand-600" : "text-gray-500"}`}>{t.label}</span>
              <span className={`text-[10px] leading-none ${active ? "text-brand-500" : "text-gray-400"}`}>{t.step}</span>
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
      {<Tutorial startMode={profile.startMode === "given" ? "given" : "own"} />}
      {modal === "account" && <AccountSheet auth={auth} linkConflict={linkConflict} onClose={() => { setModal(null); setLinkConflict(false); }} startChoice={profile.startMode === "given" ? "given" : "own"} onChangeStart={changeStart} />}
      {modal === "voice" && <VoiceSettings voices={voices} selected={voice} onSelect={setVoice} onClose={() => setModal(null)} />}

      <Toast message={toast} />
    </div>
  );
}
