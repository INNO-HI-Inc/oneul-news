#!/bin/zsh
# 아침 7시 — 이 컴퓨터에서 매일 아침 브리핑을 만들어 올린다.
#
# API 키 없이 이 맥에 설치된 claude 명령으로 요약한다.
# launchd 가 부르므로 PATH 를 직접 깔아 준다 (launchd 는 로그인 셸 환경을 물려주지 않는다).

set -u
export PATH="/Users/flareon078/.nvm/versions/node/v22.21.0/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export TZ="Asia/Seoul"

REPO="/Users/flareon078/Desktop/oneul-news"
LOG="$REPO/.morning.log"
DATE="$(date +%F)"

exec >>"$LOG" 2>&1
echo ""
echo "════ $(date '+%Y-%m-%d %H:%M:%S') 시작 ════"

cd "$REPO" || { echo "저장소를 찾지 못했습니다: $REPO"; exit 1; }

# 인터넷이 없으면 조용히 물러난다. 서버가 7시에 대신 발행한다.
if ! /usr/bin/curl -sf -m 10 -o /dev/null https://www.yna.co.kr/rss/news.xml; then
  echo "네트워크가 없어 건너뜁니다."
  exit 0
fi

git pull --rebase --quiet || { echo "git pull 실패"; exit 1; }
[ -d node_modules ] || npm ci --silent

if ! node build.mjs; then
  echo "빌드 실패 — 오늘은 서버 쪽 발행에 맡깁니다."
  exit 1
fi

# 요약이 실제로 Claude 로 됐는지 확인한다. 리드 문장으로 내려갔으면 굳이 올리지 않는다.
ENGINE="$(node -e "console.log(require('./dist/api/today.json').engine)")"
if [ "$ENGINE" != "claude" ]; then
  echo "요약이 리드 문장으로 내려갔습니다($ENGINE). 서버 발행과 다를 게 없어 올리지 않습니다."
  exit 0
fi

git add data
if git diff --staged --quiet; then
  echo "보관본에 달라진 게 없습니다."
else
  git -c user.name="oneul-hi bot" -c user.email="actions@users.noreply.github.com" \
    commit -q -m "news: $DATE 아침 브리핑 (이 컴퓨터에서 요약) [skip ci]"
  git push --quiet || { echo "git push 실패"; exit 1; }
  echo "보관본을 올렸습니다."
fi

# 서버가 이 보관본으로 페이지를 그려 배포하도록 깨운다.
if gh workflow run news-daily.yml --repo INNO-HI-Inc/oneul-news --ref main; then
  echo "배포를 요청했습니다."
else
  echo "배포 요청 실패 — 7시 정기 실행이 대신 처리합니다."
fi

echo "════ $(date '+%H:%M:%S') 끝 ════"
