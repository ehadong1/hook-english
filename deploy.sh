#!/bin/bash
# 사용법: 터미널에서  ./deploy.sh "이번에 바꾼 내용 메모"
# 하는 일: 바뀐 파일 담기 → 기록(commit) → GitHub로 올리기(push)
# (.env 같은 비밀 파일은 .gitignore 때문에 자동으로 제외됩니다)
set -e
cd "$(dirname "$0")"

MSG="${1:-앱 업데이트}"

# 잠금 파일이 남아 있고 실행 중인 git이 없으면 정리
if [ -f .git/index.lock ] && ! pgrep -x git >/dev/null 2>&1; then
  rm -f .git/index.lock
fi

git add -A

# 비밀 파일이 올라가지 않는지 마지막 확인
if git diff --cached --name-only | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example' >/dev/null; then
  echo "중단: .env 파일이 올라갈 뻔했어요. 올리지 않았습니다." >&2
  exit 1
fi

if git diff --cached --quiet; then
  echo "올릴 변경이 없어요."
  exit 0
fi

echo "---- 올릴 파일 ----"
git status --short
git commit -m "$MSG"
git push
echo "완료! 1~2분 뒤 사이트에 반영돼요."
