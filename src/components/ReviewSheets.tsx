import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { BottomSheet } from "./common";
import {
  deleteMyReview,
  fetchApprovedReviews,
  fetchMyReviews,
  fetchPendingReviews,
  fetchWritingLog,
  isPhraseAdmin,
  setReviewStatus,
  submitReview,
  type ReviewEntry,
  type ReviewStats,
} from "../lib/persistence";

/* ============================================================================
   활용 후기: 내 사용 기록(저장 문장·학습한 날·실수 노트) + 한줄 후기
   - 후기는 항상 "검토 대기"로 저장되고, 운영자가 승인해야 다른 사람에게 보여요.
   - 사용 기록 숫자는 작성할 때 앱이 계산해 함께 저장해요. (보상 없음, 대가 표시 불필요)
   ============================================================================ */

const STATUS_LABEL: Record<string, string> = { pending: "검토 중", approved: "공개됨", rejected: "비공개(반려)" };

function StatChips({ s }: { s: ReviewStats }) {
  const items = [
    s.saved != null ? `저장 ${s.saved}문장` : null,
    s.days != null ? `${s.days}일 학습` : null,
    s.notes ? `실수 노트 ${s.notes}개` : null,
  ].filter(Boolean) as string[];
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {items.map((t) => <span key={t} className="text-[11px] font-semibold text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">{t}</span>)}
    </div>
  );
}

export function ReviewsSheet({ onClose, loggedIn, deviceId, savedCount, studyDays }: { onClose: () => void; loggedIn: boolean; deviceId: string | null; savedCount: number; studyDays: number }) {
  const [noteCount, setNoteCount] = useState(0);
  const [approved, setApproved] = useState<ReviewEntry[] | null>(null);
  const [mine, setMine] = useState<ReviewEntry[]>([]);
  const [pending, setPending] = useState<ReviewEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nickname, setNickname] = useState("");
  const [body, setBody] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const reload = () => {
    fetchApprovedReviews().then(setApproved);
    if (loggedIn) fetchMyReviews().then(setMine);
  };
  useEffect(() => {
    reload();
    fetchWritingLog(deviceId, 200).then((l) => setNoteCount(l.length));
    if (loggedIn) isPhraseAdmin().then((a) => { setIsAdmin(a); if (a) fetchPendingReviews().then(setPending); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats: ReviewStats = { saved: savedCount, days: studyDays, notes: noteCount };
  const canSubmit = loggedIn && agree && body.trim().length >= 5 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setMsg("");
    const err = await submitReview({ nickname, body, stats });
    setBusy(false);
    if (err) { setMsg(err); return; }
    setBody(""); setAgree(false);
    setMsg("후기를 보냈어요. 확인 후 공개돼요. 고마워요!");
    reload();
  };

  const act = async (id: string, status: "approved" | "rejected") => {
    if (await setReviewStatus(id, status)) { setPending((p) => p.filter((x) => x.id !== id)); reload(); }
  };

  return (
    <BottomSheet title="활용 후기" onClose={onClose}>
      <div className="rounded-xl bg-brand-50 p-3">
        <p className="text-xs font-bold text-brand-700">나의 활용 기록</p>
        <StatChips s={stats} />
        <p className="text-[11px] text-gray-500 mt-1.5">저장한 문장 수, 학습한 날 수, 실수 노트에 쌓인 문장 수예요.</p>
      </div>

      <h4 className="text-sm font-extrabold text-gray-900 mt-5">다른 학습자의 활용 사례</h4>
      {approved === null && <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> 불러오는 중...</p>}
      {approved && approved.length === 0 && <p className="text-xs text-gray-500 mt-2 leading-relaxed">아직 공개된 후기가 없어요. 첫 후기를 남겨 주세요.</p>}
      <div className="mt-2 space-y-2">
        {(approved || []).map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-100 p-3">
            <p className="text-sm text-gray-900 break-words leading-relaxed">{r.body}</p>
            <p className="text-[11px] text-gray-500 mt-1">{r.nickname || "학습자"}{r.createdAt ? ` · ${r.createdAt.slice(0, 10)}` : ""}</p>
            <StatChips s={r.stats} />
          </div>
        ))}
      </div>

      <h4 className="text-sm font-extrabold text-gray-900 mt-6">내 후기 남기기</h4>
      {!loggedIn ? (
        <p className="text-xs text-gray-600 mt-2 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">후기는 구글 로그인 후 남길 수 있어요. 왼쪽 위 사람 아이콘에서 로그인해 주세요.</p>
      ) : (
        <div className="mt-2 space-y-2.5">
          <input value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, 20))} placeholder="표시할 이름 (선택, 20자 이내)" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
          <textarea value={body} onChange={(e) => { setBody(e.target.value.slice(0, 200)); setMsg(""); }} rows={3} placeholder="어떻게 활용했고 어떤 점이 좋았나요? (5~200자)" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
          <label className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            내 후기와 위의 사용 기록 숫자를 다른 학습자에게 공개하는 데 동의해요. (이메일·계정 정보는 공개되지 않아요)
          </label>
          <button type="button" onClick={submit} disabled={!canSubmit} className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
            {busy && <Loader2 size={15} className="animate-spin" />}후기 보내기
          </button>
          {msg && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</p>}
          <p className="text-[11px] text-gray-500">개인정보나 회사 기밀은 쓰지 마세요. 하루 3개까지 보낼 수 있고, 운영자가 확인한 뒤 공개해요.</p>
        </div>
      )}

      {mine.length > 0 && (
        <>
          <h4 className="text-sm font-extrabold text-gray-900 mt-6">내가 보낸 후기</h4>
          <div className="mt-2 space-y-2">
            {mine.map((r) => (
              <div key={r.id} className="rounded-xl bg-gray-50 p-3">
                <p className="text-sm text-gray-800 break-words">{r.body}</p>
                <p className="text-[11px] text-gray-500 mt-1">{STATUS_LABEL[r.status] || r.status}</p>
                <button type="button" onClick={async () => { if (await deleteMyReview(r.id)) reload(); }} className="mt-1 text-[11px] font-semibold text-rose-600 underline underline-offset-2">삭제</button>
              </div>
            ))}
          </div>
        </>
      )}

      {isAdmin && (
        <>
          <h4 className="text-sm font-extrabold text-gray-900 mt-6">후기 검수 (운영자) · 대기 {pending.length}개</h4>
          <div className="mt-2 space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-amber-200 p-3">
                <p className="text-sm text-gray-900 break-words">{r.body}</p>
                <p className="text-[11px] text-gray-500 mt-1">{r.nickname || "학습자"}</p>
                <StatChips s={r.stats} />
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => act(r.id, "approved")} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1"><Check size={14} /> 승인</button>
                  <button type="button" onClick={() => act(r.id, "rejected")} className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1"><X size={14} /> 반려</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  );
}
