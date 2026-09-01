// 꾸러미 → 사람이 읽을 요약.
// ANTHROPIC_API_KEY가 있으면 Claude가 다듬고, 없으면 기사 리드 문장을 그대로 쓴다.
// 어느 쪽이든 사이트는 항상 만들어진다.

// SDK는 필요할 때만 불러온다. 설치가 안 돼 있어도 사이트는 리드 문장으로 만들어진다.
import { truncate, splitSentences, toPolite } from './text.js';

const MODEL = process.env.NEWS_MODEL || 'claude-opus-5';

function briefingSchema(z) {
  return z.object({
    greeting: z
      .string()
      .describe('오늘 아침 인사 한 문장. 밤사이 흐름을 한 줄로 요약하되 과장 없이.'),
    items: z.array(
      z.object({
        id: z.string().describe('입력으로 준 꾸러미 id를 그대로'),
        headline: z.string().describe('12~30자 사이의 담백한 제목'),
        summary: z.string().describe('2~3문장. 무슨 일이 있었는지만.'),
        why: z.string().describe('이 소식이 오늘 나에게 무슨 뜻인지 한 문장. 없으면 빈 문자열.'),
      })
    ),
  });
}

const SYSTEM = `너는 매일 아침 7시에 발행되는 한국어 뉴스 브리핑의 편집자다.

지켜야 할 것:
- 주어진 제목과 리드 문장 안에 있는 사실만 쓴다. 배경지식으로 사실을 보태지 않는다.
- 숫자, 이름, 날짜는 주어진 그대로 옮긴다. 확실하지 않으면 아예 쓰지 않는다.
- 자료가 얇으면 짧게 쓴다. 분량을 채우려고 늘리지 않는다.
- 추측, 전망, 논평, 감정적 수식어("충격", "경악", "논란 폭발")를 쓰지 않는다.
- 정치적으로 어느 한쪽 편을 들지 않는다. 사실만 나란히 놓는다.

문장:
- 아침에 눈 비비며 읽는 사람을 생각한다. 짧고 쉬운 문장, 어려운 한자어 대신 쉬운 말.
- 담백하되 차갑지 않게. "~했습니다" 체.
- "why"는 그래서 오늘 뭐가 달라지는지만 한 문장. 억지로 만들지 말고, 없으면 빈 문자열.`;

function buildPrompt(clusters, dateLabel) {
  const lines = clusters.map((c) => {
    const related = c.articles
      .slice(0, 4)
      .map((a) => `    · [${a.sourceName}] ${a.title}`)
      .join('\n');
    return [
      `[${c.id}] (${c.categoryLabel})`,
      `  제목: ${c.title}`,
      `  리드: ${truncate(c.lead.summary || '(리드 문장 없음)', 260)}`,
      `  다룬 곳: ${c.sources.join(', ')} (${c.articleCount}건)`,
      related && `  관련 기사:\n${related}`,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return `${dateLabel} 아침 브리핑을 만든다. 아래는 밤사이 모인 뉴스 꾸러미다.

각 꾸러미마다 headline / summary / why 를 쓰고, 맨 위에 오늘 아침 인사 한 문장(greeting)을 쓴다.
items는 아래 꾸러미 전부를 같은 순서로 포함해야 하고, id는 대괄호 안의 값을 그대로 옮긴다.

${lines.join('\n\n')}`;
}

/**
 * Claude 없이 쓰는 요약 — 통신사 리드 문장이 이미 요약이라 그대로 쓸 만하다.
 * 꾸러미 안에서 가장 온전한 리드를 고른다. RSS가 문장을 "…"로 잘라 보내는 경우가 잦아서,
 * 잘리지 않고 문장이 끝난 리드를 우선한다.
 */
function bestLead(cluster) {
  const scored = cluster.articles
    .map((a) => {
      const text = (a.summary || '').trim();
      // 속보 기사는 본문이 "(" 한 글자로 오기도 한다. 짧은 건 아예 후보에서 뺀다.
      if (text.length < 30) return null;
      let score = Math.min(text.length, 200) / 200;
      if (!/[…]$/.test(text)) score += 1.2; // 잘리지 않은 문장
      if (/[.!?]$/.test(text)) score += 0.5;
      if (text.length >= 45) score += 0.4;
      return { text, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.text || '';
}

function fallbackItem(cluster) {
  const lead = bestLead(cluster);
  const sentences = splitSentences(lead);

  // 두 문장까지, 140자 안쪽으로. 아침에 읽는 글이라 길면 안 읽는다.
  let text = '';
  for (const s of sentences.slice(0, 2)) {
    if (text && (text + ' ' + s).length > 145) break;
    text = text ? `${text} ${s}` : s;
  }

  return {
    id: cluster.id,
    headline: truncate(cluster.title, 42),
    summary: toPolite(truncate(text || cluster.title, 150)),
    why: '',
  };
}

function fallbackGreeting(clusters, dateLabel, articleCount) {
  if (!clusters.length) return `${dateLabel} 아침입니다. 오늘은 전해 드릴 소식을 모으지 못했어요.`;
  // 머리기사 제목을 그대로 인용하면 바로 아래 기사와 겹쳐 보인다. 숫자로만 말한다.
  return `${dateLabel} 아침입니다. 밤사이 들어온 기사 ${articleCount}건을 읽고, 오늘 알아 두면 좋을 ${clusters.length}개를 골랐습니다.`;
}

/**
 * @returns {{ greeting: string, byId: Map<string, object>, engine: 'claude'|'lead' }}
 */
export async function summarize(clusters, { dateLabel, articleCount = 0, log = () => {} } = {}) {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

  if (!hasKey || !clusters.length) {
    if (!hasKey) log('  · ANTHROPIC_API_KEY 없음 → 기사 리드 문장으로 요약합니다.');
    return {
      greeting: fallbackGreeting(clusters, dateLabel, articleCount),
      byId: new Map(clusters.map((c) => [c.id, fallbackItem(c)])),
      engine: 'lead',
    };
  }

  try {
    const [{ default: Anthropic }, { z }, { zodOutputFormat }] = await Promise.all([
      import('@anthropic-ai/sdk'),
      import('zod'),
      import('@anthropic-ai/sdk/helpers/zod'),
    ]);
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: 'medium', format: zodOutputFormat(briefingSchema(z)) },
      messages: [{ role: 'user', content: buildPrompt(clusters, dateLabel) }],
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error('구조화 응답 파싱 실패');

    const byId = new Map();
    for (const item of parsed.items) byId.set(item.id, item);
    // 모델이 빠뜨린 꾸러미는 리드 문장으로 메운다.
    let filled = 0;
    for (const c of clusters) {
      if (!byId.has(c.id)) {
        byId.set(c.id, fallbackItem(c));
        filled++;
      }
    }
    log(
      `  · ${MODEL}로 ${parsed.items.length}건 요약` +
        (filled ? ` (${filled}건은 리드 문장으로 보충)` : '')
    );
    return { greeting: parsed.greeting, byId, engine: 'claude' };
  } catch (err) {
    log(`  ! 요약 실패 → 리드 문장으로 대체합니다: ${err.message}`);
    return {
      greeting: fallbackGreeting(clusters, dateLabel, articleCount),
      byId: new Map(clusters.map((c) => [c.id, fallbackItem(c)])),
      engine: 'lead',
    };
  }
}
