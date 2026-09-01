// 한국어 제목을 비교 가능한 키워드 묶음으로 바꾸는 도구들.
// 형태소 분석기 없이, 조사만 떼어내는 정도로도 "같은 사건인가" 판단에는 충분하다.

const JOSA = [
  '으로부터', '에서는', '에게서', '이라고', '라고는', '까지', '부터', '에게', '한테',
  '에서', '으로', '이라', '라는', '보다', '처럼', '만큼', '조차', '마저', '뿐',
  '와', '과', '은', '는', '이', '가', '을', '를', '의', '에', '로', '도', '만', '나', '든',
];

const STOPWORDS = new Set([
  '오늘', '내일', '어제', '올해', '작년', '지난', '이번', '내년', '현재', '최근',
  '기자', '연합뉴스', '단독', '속보', '종합', '영상', '사진', '인터뷰', '기고', '칼럼',
  '그리고', '하지만', '그러나', '위해', '대해', '통해', '따라', '관련', '대한', '있다',
  '없다', '한다', '했다', '된다', '됐다', '이다', '까지', '동안', '경우', '가장', '모든',
  '다시', '먼저', '아직', '이미', '전날', '당시', '이날', '내내', '무슨', '이런', '그런',
]);

/** 제목 앞머리의 [단독] [영상] (종합) 같은 꼬리표를 떼어낸다. */
export function cleanTitle(title) {
  return String(title)
    .replace(/^\s*(?:\[[^\]]{1,14}\]|【[^】]{1,14}】|<[^>]{1,14}>)\s*/g, '')
    .replace(/\s*\((?:종합|1보|2보|3보|영상|사진|전문)\d?\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 요약문 앞의 전문(前文)을 떼어낸다.
 * "(서울=연합뉴스) 홍길동 기자 =", "이정현 이율립 기자 =", "홍길동 특파원 =" 모두 걸린다.
 */
export function cleanSummary(summary) {
  return String(summary)
    .replace(/^\s*\([^)]{2,30}=[^)]{2,20}\)\s*/, '')
    .replace(/^\s*(?:[가-힣]{2,4}\s+){0,3}[가-힣]{2,4}\s*(?:기자|특파원|통신원)\s*=\s*/, '')
    .replace(/\s*<[^>]*>\s*/g, ' ')
    .replace(/\s*\.{3,}\s*$/, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripJosa(word) {
  if (word.length < 3) return word;
  for (const j of JOSA) {
    if (word.length - j.length >= 2 && word.endsWith(j)) return word.slice(0, -j.length);
  }
  return word;
}

/** 제목/요약 → 비교용 키워드 Set */
export function tokenize(text) {
  const raw = String(text).match(/[가-힣]+|[A-Za-z][A-Za-z0-9]*|\d{2,}/g) || [];
  const out = new Set();
  for (const t of raw) {
    const w = /[가-힣]/.test(t) ? stripJosa(t) : t.toUpperCase();
    if (w.length < 2) continue;
    if (STOPWORDS.has(w)) continue;
    out.add(w);
  }
  return out;
}

/** 두 키워드 묶음이 얼마나 겹치는지 (0~1) */
export function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (large.has(t)) shared++;
  // 짧은 제목이 불리하지 않도록 작은 쪽 기준으로도 본다 (겹침 계수).
  const jaccard = shared / (a.size + b.size - shared);
  const overlap = shared / small.size;
  return Math.max(jaccard, overlap * 0.85);
}

/** 문장 단위로 자른다 (한국어 종결어미 + 마침표 기준) */
export function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?…])\s+|(?<=다\.)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 글자 수 기준으로 자르되 단어 중간에서 끊지 않는다. */
export function truncate(text, max) {
  const s = String(text).trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}
