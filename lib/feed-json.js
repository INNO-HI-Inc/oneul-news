// 오늘하이(iOS)가 매일 아침 읽어가는 기계용 출력물.
// 사람이 보는 HTML과 달리 여기서는 "그대로 소리 내어 읽을 수 있는 원고"가 제일 중요하다.

export const API_VERSION = 1;

/** TTS가 어색하게 읽는 기호를 미리 없앤다. (앱의 ttsSafe와 같은 규칙) */
export function ttsSafe(text) {
  let s = String(text ?? '');
  s = s.replace(/\[[^\]]{1,20}\]/g, ' '); // [단독] 같은 꼬리표
  for (const sym of ['[', ']', '<', '>', '«', '»', '…', '·', '|', '"', "'", '“', '”', '‘', '’', '~']) {
    s = s.split(sym).join(' ');
  }
  s = s
    .replace(/%/g, '퍼센트')
    .replace(/&/g, ' 그리고 ')
    .replace(/(\d)\s*~\s*(\d)/g, '$1에서 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return s.replace(/[ .,]+$/, '');
}

function sentence(text) {
  const s = ttsSafe(text);
  if (!s) return '';
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

/**
 * 낭독 원고를 만든다.
 * 오늘하이는 30초 브리핑과 2~3분 브리핑 두 가지를 쓰므로 길이별로 미리 준비해 둔다.
 */
function buildScript(items, { count, withSummary }) {
  const picked = items.slice(0, count);
  if (!picked.length) {
    return '오늘 뉴스는 아직 가져오지 못했어요. 잠시 뒤에 다시 알려드릴게요.';
  }

  const ordinals = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째', '일곱 번째', '여덟 번째'];
  const parts = [`밤사이 들어온 소식 ${picked.length}건 전해 드릴게요.`];

  picked.forEach((item, i) => {
    const head = ordinals[i] || `${i + 1}번째`;
    parts.push(`${head}, ${sentence(item.headline)}`);
    if (withSummary && item.summary) parts.push(sentence(item.summary));
    if (withSummary && item.why) parts.push(sentence(item.why));
  });

  return parts.filter(Boolean).join(' ');
}

/** 잠금화면 한 줄 요약 — 알람 카드에 실린다. */
function buildGlance(items) {
  if (!items.length) return '오늘의 뉴스 준비 중';
  const first = ttsSafe(items[0].headline);
  return first.length > 28 ? `${first.slice(0, 27)}…` : first;
}

/**
 * @param {object} briefing build.mjs가 만든 하루치 데이터
 * @returns 앱이 읽어갈 JSON 객체
 */
export function buildAppFeed(briefing) {
  const flat = [];
  for (const section of briefing.sections) {
    for (const c of section.clusters) {
      flat.push({
        id: c.id,
        category: section.id,
        categoryLabel: section.label,
        headline: c.item.headline || c.title,
        summary: c.item.summary || '',
        why: c.item.why || '',
        link: c.lead.link,
        press: c.lead.sourceName,
        sources: c.sources,
        sourceCount: c.sourceCount,
        image: c.image || null,
        publishedAt: c.publishedAt,
        isHeadline: section.id === 'headline',
      });
    }
  }

  // 머리기사가 먼저, 그다음 카테고리 순서대로.
  const headlines = flat.filter((i) => i.isHeadline);
  const rest = flat.filter((i) => !i.isHeadline);
  const ordered = [...headlines, ...rest];

  return {
    version: API_VERSION,
    date: briefing.date,
    dateLabel: briefing.dateLabel,
    weekday: briefing.weekday,
    publishedAt: briefing.publishedAt,
    timezone: 'Asia/Seoul',
    greeting: briefing.greeting,
    glance: buildGlance(ordered),
    // 오늘하이가 그대로 읽으면 되는 원고
    script: {
      short: buildScript(headlines.length ? headlines : ordered, { count: 3, withSummary: false }),
      long: buildScript(ordered, { count: 8, withSummary: true }),
    },
    items: ordered,
    stats: briefing.stats,
    engine: briefing.engine,
    web: briefing.webUrl,
  };
}
