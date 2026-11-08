import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { BottomSheet } from "./common";
import {
  PHRASE_SITUATIONS,
  fetchPendingPhrases,
  setPhraseStatus,
  submitPhrase,
  type PendingPhrase,
} from "../lib/persistence";

/* ============================================================================
   표현 제안하기 (로그인한 사용자) / 표현 검수 (관리자)
   - 제안한 표현은 항상 "검토 대기"로 저장되고, 관리자가 승인해야 다른 사람에게 보여요.
   ============================================================================ */

export function SubmitPhraseSheet({ onClose }: { onClose: () => void }) {
  const [english, setEnglish] = useState("");
  const [korean, setKorean] = useState("");
  const [tag, setTag] = useState<string>(PHRASE_SITUATIONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit = english.trim().length >= 2 && korean.trim().length >= 1 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setError("");
    const err = await submitPhrase({ english, korean, situationTag: tag, note });
    setBusy(false);
    if (err) { setError(err); return; }
    setDone(true);
    setEnglish(""); setKorean(""); setNote("");
  };

  return (
    <BottomSheet title="표현 제안하기" onClose={onClose}>
      <p className="text-sm text-gray-700 leading-relaxed">직접 보거나 들은 좋은 비즈니스 영어 표현을 알려주세요. 확인 후 승인되면 다른 사람에게도 보여요.</p>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-gray-600">영어 표현 (200자 이내)</span>
          <textarea value={english} onChange={(e) => { setEnglish(e.target.value.slice(0, 200)); setDone(false); }} rows={2} placeholder="예: Let me circle back on that." className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-gray-600">한글 뜻</span>
          <input value={korean} onChange={(e) => { setKorean(e.target.value.slice(0, 200)); setDone(false); }} placeholder="예: 그 부분은 나중에 다시 말씀드릴게요." className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-gray-600">주로 쓰는 상황</span>
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white">
            {PHRASE_SITUATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-gray-600">메모 (선택)</span>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="언제 쓰면 좋은지 한 줄" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
        </label>
      </div>
      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      {done && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mt-3">제안해 주셔서 고마워요. 확인 후 반영할게요.</p>}
      <button type="button" onClick={submit} disabled={!canSubmit} className="w-full mt-4 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
        {busy && <Loader2 size={16} className="animate-spin" />}제안하기
      </button>
      <p className="text-xs text-gray-500 mt-2 text-center">개인정보나 회사 기밀이 들어간 문장은 올리지 마세요.</p>
    </BottomSheet>
  );
}

export function ReviewPhrasesSheet({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<PendingPhrase[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchPendingPhrases().then(setRows); }, []);

  const act = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id); setMsg("");
    const ok = await setPhraseStatus(id, status);
    setBusyId(null);
    if (ok) setRows((r) => (r || []).filter((x) => x.id !== id));
    else setMsg("처리하지 못했어요. 관리자 권한을 확인해 주세요.");
  };

  return (
    <BottomSheet title="표현 검수" onClose={onClose}>
      {rows === null && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 불러오는 중...</p>}
      {rows && rows.length === 0 && <p className="text-sm text-gray-600">검토할 표현이 없어요.</p>}
      {msg && <p className="text-xs text-rose-600 mb-2">{msg}</p>}
      <div className="space-y-3">
        {(rows || []).map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-100 p-3">
            <p className="text-sm font-bold text-gray-900 break-words">{r.english}</p>
            <p className="text-xs text-gray-600 mt-0.5 break-words">{r.korean}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              {r.sourceType === "user" ? "사용자 제안" : "자동 수집"}
              {r.situationTag ? ` · ${r.situationTag}` : ""}
              {r.score != null ? ` · ${r.score}점` : ""}
            </p>
            {r.reason && <p className="text-[11px] text-gray-500 mt-0.5 break-words">{r.reason}</p>}
            {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-600 underline break-all">출처</a>}
            <div className="flex gap-2 mt-2.5">
              <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, "approved")} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"><Check size={14} /> 승인</button>
              <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, "rejected")} className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"><X size={14} /> 반려</button>
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
