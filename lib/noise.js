// 통신사 피드에는 사람이 읽을 브리핑에 넣으면 안 되는 항목이 섞여 온다.
// 인사·부고·동정 단신, 시황표, 포토/만평, 게시판 공지 같은 것들.

const NOISE_TAGS = [
  '인사', '부고', '동정', '게시판', '알림', '표', '포토', '사진', '영상', '카툰', '만평',
  '신간', '문화가산책', '오늘의 운세', '주요 일정', '증시-마감', '증시-개장', '외신-',
  '사설', '기고', '칼럼', '기자수첩', '왜냐면', '독자投稿',
];

// 제목 그 자체가 공지/표에 가까운 경우
const NOISE_TITLE = [
  /^▲/,
  /^※/,
  /^\s*\(?끝\)?\s*$/,
  /^오늘의\s*(운세|날씨\s*요약|증시)/,
  /^(주요|오늘의)\s*일정/,
  /^\[?(부고|인사|동정)\]?/,
  /인사\s*[·]?\s*동정/,
  /^(코스피|코스닥|환율)\s*(마감|개장)\s*$/,
];

const NOISE_SUMMARY = [
  /^\s*▲/,
  /^\s*◇/,                       // "◇PGA 투어 최종 순위" — 표 데이터
  /^\s*\(?서울=연합뉴스\)?\s*\(?끝\)?\s*$/,
  /^\s*$/,
  /^\s*[(){}[\]<>.…\s]*$/,       // 속보 기사의 본문은 "(" 한 글자뿐인 경우가 있다
  /^\s*[\w.]+@[\w.]+\s*\(?끝\)?\s*$/, // 기자 이메일만 남은 것
];

// 지역 기상 특보 단신 — 전국 브리핑에 넣을 내용이 아니다.
const LOCAL_WEATHER = /(호우|강풍|건조|대설|폭염|한파|풍랑|안개)\s*(주의보|경보).{0,12}(발효|해제)/;

/** 제목 앞머리 대괄호 태그를 모두 뽑아낸다. */
function leadingTags(title) {
  const tags = [];
  const re = /^\s*(?:\[([^\]]{1,16})\]|【([^】]{1,16})】)/;
  let rest = String(title);
  for (let i = 0; i < 3; i++) {
    const m = rest.match(re);
    if (!m) break;
    tags.push((m[1] || m[2]).trim());
    rest = rest.slice(m[0].length);
  }
  return tags;
}

/** 브리핑에 넣지 말아야 할 기사인가 */
export function isNoise(article) {
  const title = String(article.title || '').trim();
  const summary = String(article.summary || '').trim();

  if (title.length < 8) return true;

  for (const tag of leadingTags(title)) {
    if (NOISE_TAGS.some((n) => tag === n || tag.startsWith(n))) return true;
  }
  if (NOISE_TITLE.some((re) => re.test(title))) return true;
  if (LOCAL_WEATHER.test(title)) return true;
  if (NOISE_SUMMARY.some((re) => re.test(summary))) return true;

  // 리드가 "(끝)" 뿐이거나 사실상 비어 있으면 요약할 내용이 없다.
  const body = summary.replace(/\([^)]*\)/g, '').replace(/\s+/g, '');
  if (body.length < 12 && title.length < 20) return true;

  return false;
}

export function dropNoise(articles) {
  return articles.filter((a) => !isNoise(a));
}
