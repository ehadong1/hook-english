import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Sparkles, Send, Lightbulb, Check, RotateCcw, Loader2, Mic, Square } from "lucide-react";
import { SpeakButton } from "../components/common";
import { createRecognizer, isSTTSupported } from "../lib/speech";
import { getRoleplayScene } from "../lib/personalization";
import { callLlmRoleplay, type RoleplayMessage, type RoleplayResult } from "../lib/llmProvider";
import { describeLlmFailure } from "../lib/translate";
import { isSupabaseConfigured } from "../lib/supabaseClient";

/* ============================================================================
   SECTION 13. 실전 대화
   내가 저장한 문장(최근 3개)을 대화 속에서 "자연스럽게 말해야만 하는 상황"을 AI가 만들어 줍니다.
   AI를 못 쓰는 경우(한도 초과/연결 문제)에는 고정 대본으로 이어가고, 그 사실을 화면에 알립니다.
   ============================================================================ */

type Feedback = NonNullable<RoleplayResult["feedback"]>;
type Turn = { from: "user" | "partner"; text: string; ko?: string; feedback?: Feedback };
type Saved = { text: string };

const MAX_USER_TURNS = 8;

// AI를 못 쓸 때의 고정 대본 (진짜 AI가 아님을 화면에 표시함)
function scriptedTurn(i: number, targets: string[]): string {
  const t = targets[i % targets.length];
  const lines = [
    "Hey, got a minute? I wanted to sync on where things stand.",
    `That reminds me — you mentioned something like "${t}" before. Does that apply here?`,
    "Makes sense. What would you prioritize if we only had two weeks?",
    `Try putting it the way you practiced: "${t}" — would that fit this moment?`,
    "Good. Anything you need from me before we wrap up?",
  ];
  return lines[i % lines.length];
}

export function RoleplayTab({ savedSentences, profile }: { savedSentences: Saved[]; profile: Record<string, unknown> }) {
  const enabled = savedSentences.length >= 3;
  const scene = useMemo(() => getRoleplayScene(profile), [profile]);
  const targets = useMemo(() => savedSentences.slice(-3).map((s) => s.text), [savedSentences]);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetIdx, setTargetIdx] = useState(0);
  const [used, setUsed] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const sttOk = typeof window !== "undefined" && isSTTSupported();

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    const r = createRecognizer("en-US");
    if (!r) return;
    setMicError(null);
    recRef.current = r;
    r.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInput(text.slice(0, 300));
    };
    r.onerror = (e: any) => {
      setMicError(e?.error === "not-allowed" ? "마이크 권한이 꺼져 있어요. 브라우저 주소창의 마이크 설정에서 허용해 주세요." : "음성을 인식하지 못했어요. 다시 눌러 말해 주세요.");
      setListening(false);
    };
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  };

  useEffect(() => () => { recRef.current?.abort?.(); }, []);

  const userTurns = turns.filter((t) => t.from === "user").length;
  const finished = started && userTurns >= MAX_USER_TURNS && !loading;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, loading]);

  if (!enabled) {
    return (
      <div className="px-4 pb-6">
        <div className="bg-gray-50 rounded-2xl p-6 mt-6 text-center">
          <MessageCircle size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-600">문장을 3개 이상 저장하면 실전 대화가 열려요</p>
          <p className="text-xs text-gray-500 mt-1">현재 {savedSentences.length}개 저장됨</p>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            저장한 문장을 대화 속에서 직접 말해보는 연습이에요.<br />메인 탭에서 마음에 드는 문장을 저장해 보세요.
          </p>
        </div>
      </div>
    );
  }

  const ask = async (history: Turn[], idx: number): Promise<RoleplayResult | null> => {
    if (!isSupabaseConfigured) return null;
    const messages: RoleplayMessage[] = history.map((t) => ({ from: t.from, text: t.text }));
    try {
      const r = await callLlmRoleplay({ messages, targets, currentIndex: idx, scene, profile });
      setNotice(null);
      return r;
    } catch (e) {
      setNotice(`${describeLlmFailure(e).replace("간이 번역으로 보여드려요", "고정 대본으로 이어갈게요")} 지금은 AI 대화가 아니라 연습용 고정 대본이에요.`);
      return null;
    }
  };

  const begin = async () => {
    setStarted(true);
    setLoading(true);
    const r = await ask([], targetIdx);
    const first: Turn = r ? { from: "partner", text: r.reply, ko: r.replyKo } : { from: "partner", text: scriptedTurn(0, targets) };
    setTurns([first]);
    if (r) setTargetIdx(r.nextTargetIndex);
    setLoading(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || finished) return;
    setInput("");
    setShowHint(false);
    const withUser: Turn[] = [...turns, { from: "user", text }];
    setTurns(withUser);
    setLoading(true);

    const r = await ask(withUser, targetIdx);
    if (r) {
      if (r.feedback?.usedTarget) setUsed((u) => (u.includes(targetIdx) ? u : [...u, targetIdx]));
      setTurns([
        ...withUser.slice(0, -1),
        { ...withUser[withUser.length - 1], feedback: r.feedback ?? undefined },
        { from: "partner", text: r.reply, ko: r.replyKo },
      ]);
      setTargetIdx(r.nextTargetIndex);
    } else {
      const partnerCount = withUser.filter((t) => t.from === "partner").length;
      setTurns([...withUser, { from: "partner", text: scriptedTurn(partnerCount, targets) }]);
    }
    setLoading(false);
  };

  const restart = () => {
    setTurns([]);
    setStarted(false);
    setUsed([]);
    setTargetIdx(0);
    setShowHint(false);
    setNotice(null);
  };

  return (
    <div className="px-4 pb-6">
      <div className="bg-brand-50 rounded-xl p-3 mt-3">
        <p className="text-xs font-bold text-brand-500 mb-1">상황 설정 · {String(profile?.situation ?? "")}</p>
        <p className="text-sm text-brand-800 leading-relaxed">{scene}</p>
      </div>

      <div className="mt-3 bg-white border border-gray-100 rounded-xl p-3">
        <p className="text-xs font-bold text-gray-500 mb-2">오늘 대화에서 써볼 내 문장 ({used.length}/{targets.length})</p>
        <ul className="space-y-1.5">
          {targets.map((t, i) => {
            const done = used.includes(i);
            const current = started && i === targetIdx && !done;
            return (
              <li key={i} className={`flex items-start gap-2 text-sm rounded-lg px-2.5 py-2 ${done ? "bg-emerald-50 text-emerald-800" : current ? "bg-amber-50 text-amber-900" : "bg-gray-50 text-gray-500"}`}>
                <span className="mt-0.5 shrink-0">{done ? <Check size={14} /> : <span className="text-xs font-bold">{i + 1}</span>}</span>
                <span className="flex-1">
                  {done || !started || (current && showHint) ? t : current ? "지금 이 상황에 어울리는 내 문장이에요" : "다음 차례"}
                </span>
                {current && !showHint && (
                  <button type="button" onClick={() => setShowHint(true)} className="shrink-0 text-xs font-semibold text-amber-800 flex items-center gap-1">
                    <Lightbulb size={12} /> 힌트
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {notice && <p className="mt-3 text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2 leading-relaxed">{notice}</p>}

      {!started ? (
        <button type="button" onClick={begin} className="w-full mt-4 py-3.5 rounded-xl bg-brand-600 text-white font-semibold flex items-center justify-center gap-2">
          <Sparkles size={16} /> 실전 대화 시작
        </button>
      ) : (
        <>
          <div className="mt-3 space-y-2.5 max-h-[360px] overflow-y-auto pr-1" aria-live="polite">
            {turns.map((t, i) => (
              <div key={i}>
                <div className={`flex ${t.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${t.from === "user" ? "bg-brand-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                    {t.text}
                    {t.from === "partner" && (
                      <div className="mt-1 flex items-start gap-2">
                        <SpeakButton text={t.text} size={14} />
                        {t.ko && <span className="text-xs text-gray-500">{t.ko}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {t.feedback && (
                  <div className={`mt-1.5 ml-auto max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${t.feedback.usedTarget ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                    <p className="font-bold mb-0.5">{t.feedback.usedTarget ? "저장한 문장을 잘 썼어요" : "이번엔 저장한 문장을 안 썼어요"}</p>
                    <p>{t.feedback.comment}</p>
                    {t.feedback.better && (
                      <p className="mt-1 flex items-start gap-1.5">
                        <span className="font-semibold">더 자연스럽게:</span> <span>{t.feedback.better}</span>
                        <SpeakButton text={t.feedback.better} size={13} />
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> 생각 중...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {finished ? (
            <div className="mt-3 bg-brand-50 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-brand-800">오늘 대화 끝! 문장 {used.length}/{targets.length}개를 대화에서 썼어요.</p>
              <p className="text-xs text-brand-700 mt-1">못 쓴 문장은 복습 탭에서 다시 만나게 돼요.</p>
              <button type="button" onClick={restart} className="mt-3 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold inline-flex items-center gap-1.5">
                <RotateCcw size={14} /> 한 번 더 하기
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mt-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  disabled={loading}
                  aria-label="영어로 답해보세요"
                  placeholder="영어로 답해보세요..."
                  maxLength={300}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-60"
                />
                {sttOk && (
                  <button
                    type="button"
                    aria-label={listening ? "음성 입력 멈추기" : "음성으로 입력하기"}
                    aria-pressed={listening}
                    onClick={toggleMic}
                    disabled={loading}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 ${listening ? "bg-rose-500 text-white animate-pulse" : "bg-brand-50 text-brand-700 border border-brand-100"}`}
                  >
                    {listening ? <Square size={16} /> : <Mic size={18} />}
                  </button>
                )}
                <button type="button" aria-label="보내기" onClick={send} disabled={loading || !input.trim()} className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
              {listening && <p className="text-xs text-rose-600 font-semibold mt-2" aria-live="polite">듣고 있어요. 영어로 말씀하세요. 끝나면 사각형 버튼을 누르세요.</p>}
              {micError && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-2">{micError}</p>}
              {!sttOk && <p className="text-xs text-gray-500 mt-2">이 브라우저는 음성 입력을 지원하지 않아요. 크롬이나 사파리에서 열어 보세요.</p>}
              <p className="text-xs text-gray-500 mt-2">{userTurns}/{MAX_USER_TURNS}번 말했어요 · 막히면 위의 힌트를 눌러보세요</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
