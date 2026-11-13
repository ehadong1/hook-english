"""최근 AI 생성 표현을 수준·분야 라벨과 함께 보여줍니다. 실행: python3 show_generated.py [개수]"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
n = int(sys.argv[1]) if len(sys.argv) > 1 else 18
only = sys.argv[2] if len(sys.argv) > 2 else None  # approved / rejected / pending_review
rows = (
    sb.table("hook_phrase_bank")
    .select("level_band,field_tag,tone,status,verified_score,english,korean_meaning,verified_reason")
    .eq("source_type", "generated")
    .order("created_at", desc=True)
    .limit(500)
    .execute()
    .data
)
if only:
    rows = [r for r in rows if r["status"] == only]
rows = rows[:n]
for r in rows:
    print(r["status"], r["verified_score"], r["level_band"], r["field_tag"], r["tone"], "|", r["english"], "|", r["korean_meaning"], "||", (r.get("verified_reason") or "")[:90] if only else "")
