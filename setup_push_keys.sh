#!/bin/bash
# 사용법: 터미널에서  bash setup_push_keys.sh
# 하는 일: 복습 알림용 보안 키 한 쌍(VAPID)을 만들고, 비공개 키는 화면에 보여주지 않고 Supabase 비밀로 바로 저장합니다.
#          마지막에 "공개 키"만 출력합니다. (공개 키는 비밀이 아니라서 채팅에 붙여도 괜찮아요)
set -e
cd "$(dirname "$0")"

KEYS=$(npx --yes web-push generate-vapid-keys --json)
PUB=$(printf '%s' "$KEYS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).publicKey))')
PRIV=$(printf '%s' "$KEYS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).privateKey))')

if [ -z "$PUB" ] || [ -z "$PRIV" ]; then
  echo "키를 만들지 못했어요. 아무것도 저장하지 않았습니다." >&2
  exit 1
fi

supabase secrets set \
  VAPID_PUBLIC_KEY="$PUB" \
  VAPID_PRIVATE_KEY="$PRIV" \
  VAPID_SUBJECT="https://ehadong1.github.io/hook-english/" \
  --project-ref iwqiygkgpepsbqjhgpqj

echo
echo "=== 공개 키 (이 한 줄만 복사해서 알려주세요) ==="
echo "$PUB"
