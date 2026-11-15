"""표현 뱅크 현황: 상태별·수준별·분야별·말투별 개수. 실행: python3 count_bank.py"""
import os
from collections import Counter
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

rows, page = [], 0
while True:
    chunk = (
        sb.table("hook_phrase_bank")
        .select("status,source_type,level_band,field_tag,tone")
        .range(page * 1000, page * 1000 + 999)
        .execute()
        .data
    )
    rows += chunk
    if len(chunk) < 1000:
        break
    page += 1

print(f"전체 {len(rows)}개")
print("상태:", dict(Counter(r["status"] for r in rows)))
print("출처:", dict(Counter(r.get("source_type") for r in rows)))
ok = [r for r in rows if r["status"] == "approved"]
print(f"\n승인 {len(ok)}개")
print("수준:", dict(Counter(r.get("level_band") or "라벨없음(기사 수집)" for r in ok)))
print("말투:", dict(Counter(r.get("tone") for r in ok)))
print("분야:")
for k, v in Counter(r.get("field_tag") or "라벨없음" for r in ok).most_common():
    print(f"  {k}: {v}")
