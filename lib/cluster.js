// 기사 목록 → "같은 사건끼리 묶은 꾸러미" 목록.
// 여러 신문이 함께 다룬 사건일수록 위로 올라간다.

import { AUTO_RULES } from '../config.js';
import { cleanTitle, cleanSummary, tokenize, similarity } from './text.js';

const SIMILARITY_THRESHOLD = 0.38;

/** 제목·요약의 키워드로 분야를 추정한다. */
function guessByKeywords(article) {
  const haystack = `${article.title} ${article.summary}`;
  let best = { id: null, hits: 0 };
  for (const [id, keywords] of AUTO_RULES) {
    let hits = 0;
    for (const k of keywords) if (haystack.includes(k)) hits++;
    if (hits > best.hits) best = { id, hits };
  }
  return best;
}

/**
 * 꾸러미의 분야는 기사 하나가 아니라 전체 투표로 정한다.
 * 기사 하나만 보고 정하면 "전자신문이 실은 사회면 기사"가 IT로 새는 일이 생긴다.
 *  - 분야가 정해진 피드에서 온 기사: 2표
 *  - 키워드로 추정한 분야: 맞은 키워드 수만큼 (최대 2표)
 */
function voteCategory(articles) {
  const votes = new Map();
  const add = (id, n) => id && votes.set(id, (votes.get(id) || 0) + n);

  for (const a of articles) {
    if (a.feedCategory && a.feedCategory !== 'auto') add(a.feedCategory, 2);
    const guess = guessByKeywords(a);
    if (guess.id) add(guess.id, Math.min(guess.hits, 2));
  }

  let best = { id: 'society', n: 0 };
  for (const [id, n] of votes) if (n > best.n) best = { id, n };
  return best.id;
}

/** 밤사이(어제 아침 7시 ~ 오늘 아침 7시) 기사만 남긴다. */
export function withinWindow(articles, { since, until }) {
  return articles.filter((a) => {
    if (!a.publishedAt) return false;
    const t = new Date(a.publishedAt).getTime();
    return t >= since.getTime() && t <= until.getTime();
  });
}

/** 같은 기사(같은 링크·거의 같은 제목)를 하나로 줄인다. */
export function dedupe(articles) {
  const byLink = new Map();
  for (const a of articles) {
    const key = String(a.link).split(/[?#]/)[0];
    const prev = byLink.get(key);
    if (!prev || new Date(a.publishedAt) > new Date(prev.publishedAt)) byLink.set(key, a);
  }
  return [...byLink.values()];
}

/**
 * 기사들을 사건 단위로 묶는다.
 * 최신 기사부터 훑으면서, 이미 만든 꾸러미와 충분히 닮았으면 합치고 아니면 새로 만든다.
 */
export function clusterArticles(articles) {
  const prepared = articles
    .map((a) => ({
      ...a,
      title: cleanTitle(a.title),
      summary: cleanSummary(a.summary),
      tokens: tokenize(`${cleanTitle(a.title)} ${cleanSummary(a.summary).slice(0, 120)}`),
    }))
    .filter((a) => a.title.length >= 6 && a.tokens.size >= 3)
    .sort((x, y) => new Date(y.publishedAt) - new Date(x.publishedAt));

  const clusters = [];
  for (const article of prepared) {
    let target = null;
    let bestScore = SIMILARITY_THRESHOLD;
    for (const c of clusters) {
      const score = similarity(article.tokens, c.tokens);
      if (score > bestScore) {
        bestScore = score;
        target = c;
      }
    }
    if (target) {
      target.articles.push(article);
      for (const t of article.tokens) target.tokens.add(t);
    } else {
      clusters.push({ tokens: new Set(article.tokens), articles: [article] });
    }
  }

  return clusters.map(finalizeCluster);
}

function finalizeCluster(cluster) {
  const articles = cluster.articles.sort(
    (x, y) => new Date(y.publishedAt) - new Date(x.publishedAt)
  );

  // 대표 기사 = 요약문이 있고 사진이 있는 기사를 우선한다.
  const lead =
    articles.find((a) => a.summary.length > 40 && a.image) ||
    articles.find((a) => a.summary.length > 40) ||
    articles[0];

  // 화면에 걸 제목은 가장 깔끔한 것으로 (잘린 제목·너무 길거나 짧은 제목은 뒤로).
  const display = [...articles].sort((a, b) => titleScore(b) - titleScore(a))[0];

  const sources = [...new Set(articles.map((a) => a.sourceName))];
  const latest = new Date(articles[0].publishedAt);

  return {
    id: hash(lead.link),
    category: voteCategory(articles),
    title: display.title,
    lead,
    articles,
    sources,
    sourceCount: sources.length,
    articleCount: articles.length,
    image: articles.find((a) => a.image)?.image || '',
    publishedAt: latest.toISOString(),
    keywords: [...cluster.tokens].slice(0, 12),
  };
}

/**
 * 중요도 점수.
 *  - 서로 다른 신문사가 다뤘을수록 크게 가산 (진짜 큰 사건의 신호)
 *  - 기사 수, 그리고 새벽에 나온 기사일수록 살짝 가산
 */
/** 제목이 얼마나 '걸 만한가' — 잘리지 않고, 길이가 알맞고, 통신사 문장이면 높다. */
function titleScore(article) {
  const t = article.title;
  let score = 0;
  if (!/[…]$/.test(t)) score += 3;
  if (t.length >= 14 && t.length <= 44) score += 3;
  else if (t.length <= 52) score += 1;
  if (!/["'“”‘’]/.test(t)) score += 1;
  if (article.sourceName === '연합뉴스') score += 1;
  if (article.summary.length > 60) score += 1;
  return score;
}

export function scoreCluster(cluster, now) {
  const ageHours = Math.max(0, (now - new Date(cluster.publishedAt)) / 3_600_000);
  const freshness = Math.max(0, 1 - ageHours / 30);
  return (
    cluster.sourceCount * 3 +
    Math.min(cluster.articleCount, 6) * 1.2 +
    freshness * 2.5 +
    (cluster.lead.summary.length > 60 ? 0.8 : 0)
  );
}

/** 카테고리별로 상위 N개를 고르고, 그 위에 머리기사를 따로 뽑는다. */
export function selectByCategory(clusters, categories, now = Date.now()) {
  const scored = clusters
    .filter(hasEnoughSubstance)
    .map((c) => ({ ...c, score: scoreCluster(c, now) }))
    .sort((a, b) => b.score - a.score);

  const headlineSpec = categories.find((c) => c.id === 'headline');
  const used = new Set();
  const sections = [];

  if (headlineSpec) {
    // 머리기사는 한 분야에 쏠리지 않게 카테고리당 최대 2건까지만.
    const perCategory = new Map();
    const headlines = [];
    for (const c of scored) {
      if (headlines.length >= headlineSpec.max) break;
      const n = perCategory.get(c.category) || 0;
      if (n >= 2) continue;
      if (c.sourceCount < 1) continue;
      perCategory.set(c.category, n + 1);
      headlines.push(c);
      used.add(c.id);
    }
    sections.push({ ...headlineSpec, clusters: headlines });
  }

  for (const spec of categories) {
    if (spec.id === 'headline') continue;
    const picked = scored.filter((c) => c.category === spec.id && !used.has(c.id)).slice(0, spec.max);
    picked.forEach((c) => used.add(c.id));
    if (picked.length) sections.push({ ...spec, clusters: picked });
  }

  return sections;
}

/**
 * 요약할 내용이 있는 꾸러미인가.
 * 리드 문장이 거의 없는 단신은 한 곳만 다뤘다면 브리핑에서 뺀다 —
 * 제목만 다시 읽어 주는 브리핑은 아무 도움이 안 된다.
 */
function hasEnoughSubstance(cluster) {
  const leadLength = cluster.lead.summary.replace(/\s+/g, '').length;
  if (cluster.sourceCount >= 2) return leadLength >= 15;
  return leadLength >= 35;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
