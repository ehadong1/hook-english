import { Check, RotateCcw } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { Store } from "../types";
import { updateItemRemote } from "../lib/persistence";
import { REVIEW_INTERVALS_DAYS, SpeakButton, addDays } from "../components/common";

/* ============================================================================
   SECTION 12. 복습 (에빙하우스)
   ============================================================================ */

type ReviewProps = {
  store: Store;
  setStore: Dispatch<SetStateAction<Store>>;
  virtualNow: Date;
  advanceDay: () => void;
  deviceId: string | null;
  devTools?: boolean;
};

export function ReviewTab({ store, setStore, virtualNow, advanceDay, deviceId, devTools = false }: ReviewProps) {
  const due = store.items.filter((i) => !i.mastered && new Date(i.nextReviewAt) <= virtualNow);
  const upcoming = store.items.filter((i) => !i.mastered && new Date(i.nextReviewAt) > virtualNow);

  const again = (id: string) => {
    let nextReviewAt: string | null = null;
    let stage = 0;
    setStore((p) => ({
      ...p,
      items: p.items.map((it) => {
        if (it.id !== id) return it;
        const ns = Math.min(it.stage + 1, REVIEW_INTERVALS_DAYS.length - 1);
        stage = ns;
        nextReviewAt = addDays(virtualNow, REVIEW_INTERVALS_DAYS[ns]).toISOString();
        return { ...it, stage: ns, nextReviewAt };
      }),
    }));
    if (nextReviewAt) updateItemRemote(deviceId, id, { stage, nextReviewAt });
  };
  const master = (id: string) => {
    setStore((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, mastered: true } : it)) }));
    updateItemRemote(deviceId, id, { mastered: true });
  };

  return (
    <div className="px-4 pb-6">
      {devTools && (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3.5 py-2.5 mt-3">
          <p className="text-xs text-gray-500">[개발용] 가상 학습일 <span className="font-semibold text-gray-800">{virtualNow.toLocaleDateString("ko-KR")}</span></p>
          <button type="button" onClick={advanceDay} className="text-xs font-semibold text-brand-600 flex items-center gap-1"><RotateCcw size={12} /> +1일</button>
        </div>
      )}

      <p className="text-xs font-bold text-gray-400 mt-5 mb-2">스마트 리마인드 ({due.length})</p>
      {due.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">지금 복습할 항목이 없어요.</p>}
      <div className="space-y-2.5">
        {due.map((it) => (
          <div key={it.id} className="bg-white border border-brand-100 rounded-xl p-3.5">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-xs font-bold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">{it.type === "sentence" ? "문장" : "단어"}</span>
                <p className="text-sm font-semibold text-gray-900 mt-1">{it.text}</p>
                {it.meaning && <p className="text-xs text-gray-500">{it.meaning}</p>}
              </div>
              <SpeakButton text={it.text} size={16} />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => again(it.id)} className="flex-1 py-2 rounded-lg bg-brand-50 text-brand-600 text-xs font-semibold">다시 복습할게요</button>
              <button onClick={() => master(it.id)} className="flex-1 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold flex items-center justify-center gap-1">
                <Check size={13} /> 완전히 알아요
              </button>
            </div>
          </div>
        ))}
      </div>

      {upcoming.length > 0 && (
        <>
          <p className="text-xs font-bold text-gray-400 mt-6 mb-2">예정된 복습 ({upcoming.length})</p>
          <div className="space-y-1.5">
            {upcoming.map((it) => (
              <div key={it.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-sm text-gray-700 truncate mr-2">{it.text}</p>
                <span className="text-xs text-gray-400 shrink-0">{new Date(it.nextReviewAt).toLocaleDateString("ko-KR")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
