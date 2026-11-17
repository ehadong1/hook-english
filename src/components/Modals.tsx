import { useEffect, useState } from "react";
import { Check, Notebook } from "lucide-react";
import { fetchWritingLog, type WritingLogEntry } from "../lib/persistence";
import { BottomSheet, SpeakButton } from "./common";
import { hasNeuralProvider } from "../lib/speech";
import type { HistoryItem, StoreItem } from "../types";

/* ============================================================================
   SECTION 15. 저장소 / 음성 설정 모달
   ============================================================================ */

type NotebookProps = {
  sentences: StoreItem[];
  words: StoreItem[];
  history: HistoryItem[];
  onClose: () => void;
  onMaster: (id: string) => void;
  onSelectSentence: (item: StoreItem) => void;
  deviceId?: string | null;
};

export function NotebookModal({ sentences, words, history, onClose, onMaster, onSelectSentence, deviceId }: NotebookProps) {
  const [log, setLog] = useState<WritingLogEntry[]>([]);
  useEffect(() => { fetchWritingLog(deviceId ?? null, 50).then(setLog).catch(() => { /* 기록 없음 */ }); }, [deviceId]);
  const typeCount: Record<string, number> = {};
  log.forEach((l) => l.errors.forEach((e) => { typeCount[e.type] = (typeCount[e.type] || 0) + 1; }));
  const top = Object.entries(typeCount).sort((x, y) => y[1] - x[1]).slice(0, 3);
  const retry = (t: string) => { onClose(); window.dispatchEvent(new CustomEvent("hook-retry", { detail: t })); };
  const total = sentences.length + words.length;
  const mastered = [...sentences, ...words].filter((i) => i.mastered).length;
  const studiedIds = new Set(history.map((h) => h.sentenceId));

  const renderEntry = (it: StoreItem, type: "sentence" | "word") => {
    const prev = type === "sentence" && studiedIds.has(it.sourceId ?? "");
    return (
      <div key={it.id} className="relative bg-[#fffef8] border border-amber-200/80 rounded-lg px-4 py-3 shadow-sm" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #f3f4f6 28px)" }}>
        {prev && <span className="absolute top-2 right-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">이전 학습</span>}
        <p className={`text-sm font-semibold text-gray-900 leading-relaxed break-words ${prev ? "pr-14" : ""}`}>{it.text}</p>
        {it.meaning && <p className="text-xs text-gray-500 mt-1">{it.meaning}</p>}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-100/80">
          <SpeakButton text={it.text} size={14} />
          {type === "sentence" && (
            <button onClick={() => onSelectSentence(it)} className="text-xs text-brand-600 font-bold">복습하기</button>
          )}
          {!it.mastered ? (
            <button onClick={() => onMaster(it.id)} className="ml-auto text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">암기 완료</button>
          ) : (
            <span className="ml-auto text-xs text-emerald-600 font-bold flex items-center gap-0.5"><Check size={12} /> 완료</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <BottomSheet title="나만의 영어노트" onClose={onClose}>
      <div className="bg-brand-50 rounded-xl p-3 mb-4 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-brand-800">총 {total}개 · 암기 {mastered}개</p>
          <p className="text-xs text-brand-500 mt-0.5">언제든지 배운 내용을 복습하세요</p>
        </div>
        <Notebook size={22} className="text-brand-400" />
      </div>

      <p className="text-xs font-bold text-gray-400 mb-2">저장한 문장 ({sentences.length})</p>
      {sentences.length === 0 ? <p className="text-xs text-gray-400 mb-4">아직 저장한 문장이 없어요.</p> : (
        <div className="space-y-3 mb-5">{sentences.map((s) => renderEntry(s, "sentence"))}</div>
      )}

      <p className="text-xs font-bold text-gray-400 mb-2">저장한 단어 ({words.length})</p>
      {words.length === 0 ? <p className="text-xs text-gray-400">아직 저장한 단어가 없어요.</p> : (
        <div className="space-y-3">{words.map((w) => renderEntry(w, "word"))}</div>
      )}

      <p className="text-xs font-bold text-gray-400 mt-5 mb-2">내가 만든 문장 · 실수 ({log.length})</p>
      {log.length === 0 ? <p className="text-xs text-gray-400">문장을 만들어 보면 틀린 부분이 여기 쌓여요. 자주 틀리는 유형은 추천 문장에도 반영돼요.</p> : (
        <>
          {top.length > 0 && <p className="text-[11px] text-rose-700 mb-2">자주 틀리는 유형: {top.map(([t, n]) => `${t} ${n}번`).join(" · ")} (추천 문장에 반영돼요)</p>}
          <div className="space-y-3">
            {log.slice(0, 20).map((l, i) => (
              <div key={l.id || i} className="bg-[#fffef8] border border-rose-200/80 rounded-lg px-4 py-3 shadow-sm text-xs">
                <p className="text-sm font-semibold text-gray-900 break-words">{l.original}</p>
                {l.corrected && l.corrected !== l.original && <p className="mt-1 text-emerald-800"><b>교정</b> · {l.corrected}</p>}
                {l.errors.map((e, j) => (
                  <p key={j} className="mt-0.5 text-rose-900"><b>[{e.type}]</b> <span className="line-through opacity-70">{e.wrong}</span> → <b>{e.right}</b>{e.note ? ` · ${e.note}` : ""}</p>
                ))}
                {l.errors.length === 0 && <p className="mt-0.5 text-emerald-700">틀린 곳 없음</p>}
                <button type="button" onClick={() => retry(l.original)} className="mt-1.5 text-[11px] font-semibold text-brand-700 underline underline-offset-2">이 문장 다시 써보기</button>
              </div>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

type VoiceProps = {
  voices: SpeechSynthesisVoice[];
  selected: SpeechSynthesisVoice | null;
  onSelect: (v: SpeechSynthesisVoice) => void;
  onClose: () => void;
};

export function VoiceSettings({ voices, selected, onSelect, onClose }: VoiceProps) {
  return (
    <BottomSheet title="음성 품질 설정" onClose={onClose}>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          목록 위쪽일수록 자연스러운 음성입니다. 이름에 <b>Natural</b>, <b>Online</b>, <b>Premium</b>이 포함된 항목이 가장 좋습니다.
          {!hasNeuralProvider() && " 최고 음질을 원하면 setNeuralTTSProvider()로 클라우드 TTS를 연결하세요."}
        </p>
      </div>
      {voices.length === 0 && <p className="text-sm text-gray-400 text-center py-8">사용 가능한 음성을 찾지 못했어요.</p>}
      <div className="space-y-1.5">
        {voices.slice(0, 20).map((v) => (
          <div key={v.name} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border-2 ${selected?.name === v.name ? "border-brand-600 bg-brand-50" : "border-transparent bg-gray-50"}`}>
            <button onClick={() => onSelect(v)} className="text-left min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{v.name}</p>
              <p className="text-xs text-gray-500">{v.lang}{v.localService === false ? " · 온라인 고품질" : " · 기기 내장"}</p>
            </button>
            <SpeakButton text="This is how I sound. Let me read your sentence." size={16} />
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
