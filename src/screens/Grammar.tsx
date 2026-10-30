import { useState, useEffect, useMemo } from "react";
import { BookOpen, ChevronDown, Info } from "lucide-react";
import { BottomSheet, SpeakButton } from "../components/common";
import { GRAMMAR_LIBRARY, detectGrammarKeysFromText, explainGrammarInSentence, findGrammarMatch, highlightGrammarMatch } from "../data/grammar";
import { findPastGrammarCases as rawPastCases } from "../lib/personalization";
import { fetchPhraseBank, type PhraseBankEntry } from "../lib/persistence";
import type { HistoryItem, Sentence } from "../types";

// "지난번에 본 문장"은 실제로 그 문법 패턴이 문장 안에 있을 때만 보여줍니다.
// (예전에는 문장에 붙은 태그만 보고 골라서, 관련 없는 문장이 뜰 수 있었어요.)
function findPastGrammarCases(key: string, history: HistoryItem[], currentId: string) {
  return rawPastCases(key, history, currentId).filter((h) => !!findGrammarMatch(key, h.text));
}

// 빈도 표기: 실제 말뭉치로 검증하지 않은 "상위 N%"는 보여주지 않고 쓰이는 분야만 표시합니다.
function fieldLabel(freq?: string): string {
  const f = (freq || "").replace(/상위\s*\d+\s*%/g, "").replace(/[·]/g, " ").replace(/\s+/g, " ").trim();
  if (!f || f === "GPT 분석" || f === "빈도 데이터 없음") return "비즈니스 표현";
  return /(어휘|동사|표현|관용구)$/.test(f) ? f : `${f} 표현`;
}

/* ============================================================================
   SECTION 9. 문법 상세 시트 + 문장 해부
   ============================================================================ */

type DetailProps = {
  grammarKey: string;
  pastCases: HistoryItem[];
  sentenceText?: string;
  sentenceTranslation?: string;
  onClose: () => void;
};

export function GrammarDetailSheet({ grammarKey, pastCases, sentenceText, sentenceTranslation, onClose }: DetailProps) {
  const g = GRAMMAR_LIBRARY[grammarKey];
  if (!g) return null;
  const applied = explainGrammarInSentence(grammarKey, sentenceText ?? "");
  return (
    <BottomSheet title={g.label} onClose={onClose}>
      <div className="inline-block bg-brand-50 text-brand-700 text-xs font-bold px-2.5 py-1 rounded-lg mb-3">{g.structure}</div>
      <p className="text-sm text-gray-800 leading-relaxed mb-4">{g.summary}</p>

      {sentenceText && applied && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-3.5 mb-5">
          <p className="text-xs font-bold text-brand-600 mb-1.5">이 문장에서</p>
          <p className="text-sm font-medium text-gray-900 leading-snug">{highlightGrammarMatch(sentenceText, applied.match)}</p>
          {sentenceTranslation && <p className="text-xs text-gray-500 mt-1">{sentenceTranslation}</p>}
          <p className="text-sm text-gray-700 leading-relaxed mt-2">{applied.tip}</p>
        </div>
      )}

      <p className="text-xs font-bold text-gray-400 mb-2">자세히 알아보기</p>
      <ul className="space-y-2.5 mb-5">
        {g.detail.map((d, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
            <span className="text-brand-400 font-bold shrink-0">{i + 1}</span><span>{d}</span>
          </li>
        ))}
      </ul>

      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 mb-5">
        <p className="text-xs font-bold text-rose-500 mb-1">자주 하는 실수</p>
        <p className="text-sm text-gray-700 leading-relaxed">{g.pitfall}</p>
      </div>

      <p className="text-xs font-bold text-gray-400 mb-2">실제 대화에서 이렇게 씁니다</p>
      <div className="space-y-2 mb-5">
        {sentenceText && (
          <div className="bg-brand-50 rounded-xl p-3 flex justify-between items-start gap-2 border border-brand-100">
            <div>
              <p className="text-xs font-bold text-brand-500 mb-1">지금 배우는 문장</p>
              <p className="text-sm font-medium text-gray-900">{highlightGrammarMatch(sentenceText, applied?.match)}</p>
              {sentenceTranslation && <p className="text-xs text-gray-500 mt-0.5">{sentenceTranslation}</p>}
            </div>
            <SpeakButton text={sentenceText} size={16} />
          </div>
        )}
        {g.realUsage.map((u, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 flex justify-between items-start gap-2">
            <div><p className="text-sm font-medium text-gray-900">{u.en}</p><p className="text-xs text-gray-500 mt-0.5">{u.ko}</p></div>
            <SpeakButton text={u.en} size={16} />
          </div>
        ))}
      </div>

      {pastCases.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-400 mb-2">내가 이 문법을 배웠던 문장</p>
          <div className="space-y-1.5">
            {pastCases.map((c, i) => (
              <div key={i} className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-700">{c.text}</p>
                <span className="text-xs text-amber-600 shrink-0 ml-2">{new Date(c.at).toLocaleDateString("ko-KR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

type DissectionProps = {
  sentence: Sentence;
  history: HistoryItem[];
  onSaveWord: (vocab: Sentence, sentence: Sentence) => void;
  defaultOpen?: boolean;
};

export function SentenceDissection({ sentence, history, onSaveWord, defaultOpen }: DissectionProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  useEffect(() => { setOpen(!!defaultOpen); }, [sentence.id, defaultOpen]);

  // 1) 문장에 달린 grammarKeys 우선
  // 2) 비어 있으면 문장 텍스트에서 패턴 탐지 (뉴스/커스텀 문장 대비)
  // 3) 그래도 없으면 예전 학습 문법 중 최빈값을 복습용으로
  const validKeys = (sentence.grammarKeys || []).filter((k: string) => GRAMMAR_LIBRARY[k]);
  const detectedKeys = useMemo(
    () => detectGrammarKeysFromText(sentence.text).filter((k) => GRAMMAR_LIBRARY[k]),
    [sentence.text]
  );
  const reviewKey = useMemo(() => {
    if (validKeys.length > 0 || detectedKeys.length > 0) return null;
    const counts: Record<string, number> = {};
    (history || []).forEach((h) => (h.grammarKeys || []).forEach((k) => {
      if (GRAMMAR_LIBRARY[k]) counts[k] = (counts[k] || 0) + 1;
    }));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }, [validKeys.length, detectedKeys.length, history]);
  const displayKeys = validKeys.length > 0
    ? validKeys
    : (detectedKeys.length > 0 ? detectedKeys.slice(0, 2) : (reviewKey ? [reviewKey] : []));
  const isReview = validKeys.length === 0 && detectedKeys.length === 0 && displayKeys.length > 0;

  // 표현 뱅크(Exa로 계속 수집·검수되는 원어민 표현)에서 같은 문법의 최신 표현을 가져옵니다.
  const [live, setLive] = useState<PhraseBankEntry[]>([]);
  const keysSig = displayKeys.join(",");
  useEffect(() => {
    if (!open || !keysSig) { setLive([]); return; }
    let cancelled = false;
    fetchPhraseBank(keysSig.split(","), 3).then((r) => { if (!cancelled) setLive(r.filter((p) => p.english.trim().toLowerCase() !== sentence.text.trim().toLowerCase())); });
    return () => { cancelled = true; };
  }, [open, keysSig, sentence.text]);

  // "원어민들은 이렇게도 표현해요": 기본 대안 표현 + 최근 수집·검수된 표현(최신 배지)을 한 목록으로
  const altItems = [
    ...live.map((p) => ({ key: `live-${p.id}`, en: p.english, ko: p.korean, note: p.note, url: p.sourceUrl, fresh: true })),
    ...((sentence.nativeAlternatives || []) as Sentence[]).map((a, i) => ({ key: `alt-${i}`, en: String(a.en), ko: String(a.ko), note: a.note as string | undefined, url: undefined as string | undefined, fresh: false })),
  ];

  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-50 text-brand-700 text-sm font-semibold">
        <span className="flex items-center gap-1.5"><BookOpen size={16} /> 구조 및 해설 보기</span>
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3.5">
            <p className="text-xs font-bold text-gray-400 mb-2">
              ① 문법 구조{isReview && <span className="ml-1.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">복습</span>}
            </p>
            {displayKeys.length === 0 ? (
              <p className="text-xs text-gray-400 leading-relaxed">
                이 문장에서 새로 배울 문법 포인트는 없어요. 문장을 몇 개 더 풀면 예전에 배운 문법이 복습으로 여기 나타나요.
              </p>
            ) : (
              <div className="space-y-2.5">
                {displayKeys.map((key: string) => {
                  const g = GRAMMAR_LIBRARY[key];
                  if (!g) return null;
                  const past = findPastGrammarCases(key, history, sentence.id);
                  const applied = explainGrammarInSentence(key, sentence.text);
                  return (
                    <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
                      <button onClick={() => setDetailKey(key)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{g.label}</p>
                            <p className="text-xs text-brand-600 font-medium mt-0.5">{g.structure}</p>
                          </div>
                          <span className="flex items-center gap-0.5 text-xs text-brand-500 font-semibold shrink-0 bg-brand-50 px-2 py-1 rounded-full">
                            <Info size={11} /> 자세히
                          </span>
                        </div>
                        {applied && (
                          <div className="mt-2.5 bg-brand-50/70 rounded-lg px-2.5 py-2">
                            <p className="text-xs font-bold text-brand-500 mb-1">이 문장에서</p>
                            <p className="text-sm font-medium text-gray-900 leading-snug">
                              {highlightGrammarMatch(sentence.text, applied.match)}
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed mt-1.5">{applied.tip}</p>
                          </div>
                        )}
                      </button>
                      {past.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200">
                          <p className="text-xs font-bold text-amber-600 mb-1">지난번에도 이 문법을 봤어요</p>
                          {past.map((c, i) => (
                            <p key={i} className="text-xs text-gray-500 leading-relaxed">
                              · {c.text} <span className="text-gray-300">({new Date(c.at).toLocaleDateString("ko-KR")})</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {sentence.vocab?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs font-bold text-gray-500 mb-2">② 핵심 어휘 · 주로 쓰이는 분야</p>
              <div className="space-y-2">
                {sentence.vocab.map((v: Sentence) => (
                  <button key={v.word} onClick={() => onSaveWord(v, sentence)} className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100 active:bg-brand-50">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">{v.word}</p>
                      <p className="text-xs text-gray-500">{v.meaning}</p>
                    </div>
                    <span className="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded-full font-medium shrink-0 ml-2">{fieldLabel(v.freq)}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">③ 단어를 누르면 나만의 영어노트에 저장돼요</p>
              <p className="text-xs text-gray-500 mt-1">분야 표기는 AI·편집자 분류이며, 실제 빈도 순위(상위 %)는 검증된 말뭉치 데이터를 붙이기 전까지 표시하지 않아요.</p>
            </div>
          )}

          {altItems.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
              <p className="text-xs font-bold text-emerald-700 mb-2">④ 원어민들은 이렇게도 표현해요</p>
              <div className="space-y-2">
                {altItems.map((a) => (
                  <div key={a.key} className="bg-white rounded-lg p-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium text-gray-900 leading-snug">
                        {a.fresh && <span className="mr-1.5 align-middle text-xs font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded-full">최신</span>}
                        {a.en}
                      </p>
                      <SpeakButton text={a.en} size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{a.ko}</p>
                    {a.note && <p className="text-xs text-emerald-700 mt-1.5">TIP · {a.note}</p>}
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-xs text-gray-500 underline">출처 보기</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sentence.isNews && sentence.sourceUrl && (
            <a
              href={sentence.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3.5 py-3 text-xs text-gray-500"
            >
              <span>원문 기사 보러 가기</span>
              <span className="text-brand-500 font-semibold">열기 ↗</span>
            </a>
          )}
        </div>
      )}

      {detailKey && (
        <GrammarDetailSheet
          grammarKey={detailKey}
          pastCases={findPastGrammarCases(detailKey, history, sentence.id)}
          sentenceText={sentence.text}
          sentenceTranslation={sentence.translation}
          onClose={() => setDetailKey(null)}
        />
      )}
    </div>
  );
}
