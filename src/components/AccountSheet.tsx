import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { BottomSheet } from "./common";
import { linkGoogleAccount, signInWithGoogle, signOutUser, isSupabaseConfigured, type AuthInfo } from "../lib/supabaseClient";
import { legalUrl, markConsentPending } from "../lib/consent";

/* ============================================================================
   내 계정 (구글 로그인 / 로그아웃)
   - 처음 가입: 지금 쓰던 기록에 구글 계정을 "연결" → 기록이 그대로 이어집니다.
   - 이미 가입한 사람이 다른 기기에서: 구글로 "로그인" → 그 계정의 기록을 불러옵니다.
   - 가입(로그인) 전에 이용약관·개인정보 수집 동의(필수)를 체크해야 합니다.
   ============================================================================ */

type Props = { auth: AuthInfo | null; linkConflict: boolean; onClose: () => void };

function Check2({ checked, onChange, label, href }: { checked: boolean; onChange: (v: boolean) => void; label: string; href: string }) {
  return (
    <label className="flex items-start gap-2.5 py-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-[18px] h-[18px] accent-brand-600 shrink-0" />
      <span className="text-sm text-gray-800 flex-1">
        <b className="text-brand-700">[필수]</b> {label}
      </span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 underline shrink-0 mt-0.5">보기</a>
    </label>
  );
}

export function AccountSheet({ auth, linkConflict, onClose }: Props) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showExisting, setShowExisting] = useState(linkConflict);

  const loggedIn = !!auth && !auth.isAnonymous;
  const agreed = terms && privacy;
  const allChecked = agreed;
  const setAll = (v: boolean) => { setTerms(v); setPrivacy(v); };

  const go = async (mode: "link" | "signin") => {
    if (!agreed || busy) return;
    setBusy(true); setError("");
    markConsentPending();
    const err = mode === "link" ? await linkGoogleAccount() : await signInWithGoogle();
    if (err) { setBusy(false); setError(`로그인을 시작하지 못했어요. (${err})`); }
    // 성공하면 구글 화면으로 이동하므로 여기서 더 할 일이 없습니다.
  };

  const logout = async () => {
    if (!window.confirm("로그아웃할까요?\n로그아웃해도 계정에 저장된 기록은 그대로 남아요. 다시 구글로 로그인하면 불러옵니다.")) return;
    setBusy(true);
    await signOutUser();
    window.location.reload();
  };

  if (!isSupabaseConfigured) {
    return (
      <BottomSheet title="내 계정" onClose={onClose}>
        <p className="text-sm text-gray-600">서버에 연결되어 있지 않아 지금은 로그인을 쓸 수 없어요.</p>
      </BottomSheet>
    );
  }

  if (loggedIn) {
    return (
      <BottomSheet title="내 계정" onClose={onClose}>
        <div className="bg-brand-50 rounded-xl p-3.5 mb-4 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0"><Check size={16} /></span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-800">구글 계정으로 로그인됨</p>
            <p className="text-xs text-gray-600 truncate">{auth?.email || "이메일 정보 없음"}</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">나만의 영어노트와 학습 기록이 이 계정에 저장돼요. 다른 기기에서도 같은 구글 계정으로 로그인하면 이어서 쓸 수 있어요.</p>
        <button type="button" onClick={logout} disabled={busy} className="w-full mt-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-60">
          {busy ? "처리 중..." : "로그아웃"}
        </button>
        <p className="text-xs text-gray-500 mt-4 text-center">
          <a href={legalUrl("terms")} target="_blank" rel="noopener noreferrer" className="underline">이용약관</a>
          <span className="mx-2">·</span>
          <a href={legalUrl("privacy")} target="_blank" rel="noopener noreferrer" className="underline">개인정보처리방침</a>
        </p>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title="로그인하고 기록 보관하기" onClose={onClose}>
      {linkConflict && (
        <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2.5 mb-3 leading-relaxed">
          이 구글 계정은 이미 가입되어 있어요. 아래 <b>"이미 계정이 있어요"</b>로 로그인해 주세요.
        </p>
      )}
      <p className="text-sm text-gray-700 leading-relaxed">지금은 이 기기에만 기록이 저장돼요. 구글 계정으로 로그인하면 <b>지금까지 쓴 영어노트가 그대로 계정에 연결</b>되고, 기기를 바꿔도 이어서 쓸 수 있어요.</p>

      <div className="mt-4 rounded-xl border border-gray-100 px-3 py-1">
        <label className="flex items-center gap-2.5 py-2.5 border-b border-gray-100">
          <input type="checkbox" checked={allChecked} onChange={(e) => setAll(e.target.checked)} className="w-[18px] h-[18px] accent-brand-600 shrink-0" />
          <span className="text-sm font-bold text-gray-900">전체 동의</span>
        </label>
        <Check2 checked={terms} onChange={setTerms} label="이용약관에 동의합니다" href={legalUrl("terms")} />
        <Check2 checked={privacy} onChange={setPrivacy} label="개인정보 수집·이용에 동의합니다" href={legalUrl("privacy")} />
      </div>

      {!showExisting && (
        <button type="button" onClick={() => go("link")} disabled={!agreed || busy} className="w-full mt-4 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          구글로 계속하기
        </button>
      )}
      {showExisting && (
        <button type="button" onClick={() => go("signin")} disabled={!agreed || busy} className="w-full mt-4 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          이미 있는 구글 계정으로 로그인
        </button>
      )}
      {!agreed && <p className="text-xs text-gray-500 mt-2 text-center">필수 항목에 모두 동의하면 버튼이 켜져요.</p>}
      {error && <p className="text-xs text-rose-600 mt-2 leading-relaxed">{error}</p>}

      <button type="button" onClick={() => setShowExisting((v) => !v)} className="w-full mt-4 text-xs text-gray-600 underline">
        {showExisting ? "처음이에요 (지금 기록을 계정에 연결)" : "이미 계정이 있어요 (다른 기기에서 쓰던 계정으로 로그인)"}
      </button>
      {showExisting && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed text-center">이 기기에서 지금까지 쓴 기록은 계정에 합쳐지지 않고, 계정에 저장된 기록을 불러와요.</p>
      )}
    </BottomSheet>
  );
}
