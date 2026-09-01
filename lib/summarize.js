// 꾸러미 → 사람이 읽을 요약.
// ANTHROPIC_API_KEY가 있으면 Claude가 다듬고, 없으면 기사 리드 문장을 그대로 쓴다.
// 어느 쪽이든 사이트는 항상 만들어진다.

// SDK는 필요할 때만 불러온다. 설치가 안 돼 있어도 사이트는 리드 문장으로 만들어진다.
import { execFile } from 'node:child_process';
import { truncate, splitSentences, toPolite } from './text.js';

const MODEL = process.env.NEWS_MODEL || 'claude-opus-5';
const CLI_MODEL = process.env.NEWS_CLI_MODEL || 'claude-opus-5';

// 한 번에 너무 많이 시키면 답이 잘릴 수 있어 나눠서 부탁한다.
const CHUNK = 12;

/**
 * 어떤 방식으로 요약할지 고른다.
 *   api  — ANTHROPIC_API_KEY 로 Messages API 호출
 *   cli  — 이 컴퓨터에 설치된 claude 명령을 그대로 쓴다 (키 필요 없음)
 *   lead — 통신사 리드 문장을 다듬어 쓴다 (아무것도 없을 때)
 * NEWS_SUMMARIZER 로 강제 지정할 수 있다.
 */
export function resolveEngine() {
  const forced = process.env.NEWS_SUMMARIZER;
  if (forced) return forced;
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return 'api';
  return 'cli'; // claude 명령이 없으면 실행 단계에서 lead 로 내려간다
}

function briefingSchema(z) {
  return z.object({
    greeting: z
      .string()
      .describe('오늘 아침 인사 한 문장. 밤사이 흐름을 한 줄로 요약하되 과장 없이.'),
    items: z.array(
      z.object({
        id: z.string().describe('입력으로 준 꾸러미 id를 그대로'),
        headline: z.string().describe('12~30자 사이의 담백한 제목'),
        summary: z.string().describe('2문장, 130자 안쪽. 무슨 일이 있었는지만.'),
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
- summary는 **2문장, 130자 안쪽**. 아침에 눈 비비며 읽는 글이라 길면 안 읽는다.
  세 번째 문장이 떠오르면 그건 빼도 되는 문장이다.
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

/** claude 명령을 한 번 부른다. 표준입력으로 프롬프트를 넘긴다. */
function askClaude(prompt, { timeoutMs = 240_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'claude',
      ['-p', '--output-format', 'json', '--model', CLI_MODEL],
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, env: process.env },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr?.trim() || err.message));
        try {
          const envelope = JSON.parse(stdout);
          if (envelope.is_error) return reject(new Error(envelope.result || 'claude 오류'));
          resolve(String(envelope.result ?? ''));
        } catch {
          reject(new Error('claude 응답을 읽지 못했습니다'));
        }
      }
    );
    child.stdin.end(prompt);
  });
}

/** 부탁한 것보다 길게 써 오면 앞 두 문장만 남긴다. */
function trimToTwoSentences(text) {
  const parts = splitSentences(String(text ?? '').trim());
  let out = '';
  for (const part of parts.slice(0, 2)) {
    if (out && (out + ' ' + part).length > 155) break;
    out = out ? `${out} ${part}` : part;
  }
  return out || String(text ?? '').trim();
}

/** 답변에서 JSON 부분만 꺼낸다. 앞뒤로 설명이 붙어 와도 견딘다. */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start < 0) throw new Error('JSON 없음');
  const opener = body[start];
  const closer = opener === '[' ? ']' : '}';
  const end = body.lastIndexOf(closer);
  if (end <= start) throw new Error('JSON 닫힘 없음');
  return JSON.parse(body.slice(start, end + 1));
}

/** 이 컴퓨터의 claude 명령으로 요약한다. API 키가 필요 없다. */
async function summarizeWithCli(clusters, dateLabel, log) {
  const byId = new Map();
  const chunks = [];
  for (let i = 0; i < clusters.length; i += CHUNK) chunks.push(clusters.slice(i, i + CHUNK));

  let done = 0;
  for (const [index, chunk] of chunks.entries()) {
    const prompt = `${SYSTEM}

${buildPrompt(chunk, dateLabel)}

위 꾸러미 각각에 대해 아래 모양의 JSON 배열만 출력해. 설명도, 코드펜스도 붙이지 마.
[{"id":"꾸러미 id 그대로","headline":"12~30자 제목","summary":"2문장 130자 안쪽","why":"한 문장 또는 빈 문자열"}]`;

    try {
      const answer = await askClaude(prompt);
      const items = extractJson(answer);
      if (!Array.isArray(items)) throw new Error('배열이 아님');
      for (const item of items) {
        if (!item || typeof item.id !== 'string') continue;
        byId.set(item.id, { ...item, summary: trimToTwoSentences(item.summary) });
      }
      done += chunk.length;
      log(`  · ${index + 1}/${chunks.length}묶음 요약 완료 (${byId.size}건)`);
    } catch (err) {
      log(`  ! ${index + 1}/${chunks.length}묶음 실패 → 이 묶음은 리드 문장으로: ${err.message}`);
    }
  }

  if (!byId.size) throw new Error('한 묶음도 요약하지 못했습니다');

  // 인사말은 짧아서 한 번 더 부탁해도 부담이 없다.
  let greeting = '';
  try {
    const heads = clusters
      .slice(0, 6)
      .map((c) => `- ${byId.get(c.id)?.headline || c.title}`)
      .join('\n');
    const answer = await askClaude(
      `${dateLabel} 아침 뉴스 브리핑의 첫 인사를 한 문장으로 써.
밤사이 흐름을 담되 과장하지 말고, "${dateLabel} 아침입니다."로 시작해. 문장만 출력해.

오늘의 주요 소식:
${heads}`,
      { timeoutMs: 120_000 }
    );
    greeting = answer.trim().split('\n')[0].replace(/^["'\`]|["'\`]$/g, '');
  } catch {
    /* 인사말은 없어도 그만 — 아래에서 기본 문장으로 채운다 */
  }

  return { greeting, byId, filled: done };
}

/**
 * @returns {{ greeting: string, byId: Map<string, object>, engine: string }}
 */
export async function summarize(clusters, { dateLabel, articleCount = 0, log = () => {} } = {}) {
  const leadOnly = (note) => {
    if (note) log(note);
    return {
      greeting: fallbackGreeting(clusters, dateLabel, articleCount),
      byId: new Map(clusters.map((c) => [c.id, fallbackItem(c)])),
      engine: 'lead',
    };
  };

  if (!clusters.length) return leadOnly();

  const engine = resolveEngine();
  if (engine === 'lead') return leadOnly('  · 리드 문장으로 요약합니다 (NEWS_SUMMARIZER=lead).');

  // 어떤 방식이든 실패하면 리드 문장으로 내려간다. 사이트는 언제나 나와야 한다.
  const finish = (greeting, byId, label) => {
    let filled = 0;
    for (const c of clusters) {
      if (!byId.has(c.id)) {
        byId.set(c.id, fallbackItem(c));
        filled++;
      }
    }
    log(
      `  · ${label} ${byId.size - filled}건 요약` +
        (filled ? ` (${filled}건은 리드 문장으로 보충)` : '')
    );
    return {
      greeting: greeting || fallbackGreeting(clusters, dateLabel, articleCount),
      byId,
      engine: 'claude',
    };
  };

  if (engine === 'cli') {
    try {
      log(`  · 이 컴퓨터의 claude 명령으로 요약합니다 (${CLI_MODEL}, API 키 없이)`);
      const { greeting, byId } = await summarizeWithCli(clusters, dateLabel, log);
      return finish(greeting, byId, 'claude 명령으로');
    } catch (err) {
      return leadOnly(`  ! claude 명령을 쓰지 못했습니다 → 리드 문장으로: ${err.message}`);
    }
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
    return finish(parsed.greeting, byId, `${MODEL}로`);
  } catch (err) {
    return leadOnly(`  ! 요약 실패 → 리드 문장으로 대체합니다: ${err.message}`);
  }
}
