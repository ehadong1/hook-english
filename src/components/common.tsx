import { useState, type ReactNode } from "react";
import { Volume2, X, AudioLines } from "lucide-react";
import { speak } from "../lib/speech";

/* ============================================================================
   SECTION 7. 공통 유틸 & UI
   ============================================================================ */

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
export const uid = (p = "id") => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
export const addDays = (d: Date | string | number, n: number): Date => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export function renderHighlighted(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <span key={i} className="font-bold text-brand-600 underline decoration-brand-300 decoration-2 underline-offset-2">{p.slice(2, -2)}</span>
      : <span key={i}>{p}</span>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg z-[60] max-w-[340px] text-center">
      {message}
    </div>
  );
}

export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-[400px] bg-white rounded-t-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-[15px] pr-4">{title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose} className="text-gray-400 shrink-0 p-1"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function SpeakButton({ text, size = 18, className = "" }: { text: string; size?: number; className?: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      aria-label="영어 발음 듣기"
      onClick={(e) => { e.stopPropagation(); setPlaying(true); speak(text, { onEnd: () => setPlaying(false) }); }}
      className={`shrink-0 ${playing ? "text-brand-400" : "text-brand-600"} ${className}`}
    >
      {playing ? <AudioLines size={size} className="animate-pulse" /> : <Volume2 size={size} />}
    </button>
  );
}

export function Badge({ n }: { n: number }) {
  return <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-xs rounded-full w-[18px] h-[18px] flex items-center justify-center">{n}</span>;
}
