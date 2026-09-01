#!/usr/bin/env node
// 아침 7시 — 하루치 브리핑을 만들어 web(dist/)과 앱용 JSON(dist/api/)으로 내보낸다.
//
//   node build.mjs                 오늘치 생성
//   node build.mjs --dry           파일을 쓰지 않고 결과만 확인
//   node build.mjs --date=2026-08-30   특정 날짜로 라벨링 (수집은 항상 현재 피드 기준)
//   node build.mjs --out=<dir>      결과물을 다른 폴더로 (기본: dist)
//   node build.mjs --render-only    수집·요약 없이 보관본만으로 페이지를 다시 그린다
//                                   (디자인을 고쳤을 때, 그리고 이미 오늘치가 있을 때)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE, SOURCES, CATEGORIES } from './config.js';
import { fetchAll } from './lib/rss.js';
import { withinWindow, dedupe, clusterArticles, selectByCategory } from './lib/cluster.js';
import { dropNoise } from './lib/noise.js';
import { summarize } from './lib/summarize.js';
import { renderBriefing, renderArchive, renderFeed } from './lib/render.js';
import { buildAppFeed } from './lib/feed-json.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');
const outArg = process.argv.find((a) => a.startsWith('--out='))?.slice(6);
const DIST_DIR = path.resolve(ROOT, outArg || process.env.NEWS_OUT_DIR || 'dist');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const dateArg = argv.find((a) => a.startsWith('--date='))?.slice(7);
const RENDER_ONLY = argv.includes('--render-only');

const log = (msg) => console.log(msg);

// ── 날짜 (KST) ────────────────────────────────────────────────
const KST_OFFSET = 9 * 3_600_000;

function kstParts(date) {
  const k = new Date(date.getTime() + KST_OFFSET);
  return {
    y: k.getUTCFullYear(),
    m: k.getUTCMonth() + 1,
    d: k.getUTCDate(),
    hour: k.getUTCHours(),
    weekday: ['일', '월', '화', '수', '목', '금', '토'][k.getUTCDay()],
  };
}

function dayKey(date) {
  const { y, m, d } = kstParts(date);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** KST 기준 그날 특정 시각의 UTC Date */
function kstMoment(date, hour) {
  const { y, m, d } = kstParts(date);
  return new Date(Date.UTC(y, m - 1, d, hour) - KST_OFFSET);
}

// ── 빌드 ──────────────────────────────────────────────────────
async function main() {
  const now = new Date();
  const date = dateArg || dayKey(now);
  const { m, d, weekday } = kstParts(now);
  const dateLabel = `${m}월 ${d}일`;

  log(`\n☀️  ${SITE.name} — ${date}(${weekday}) 아침 브리핑을 만듭니다.\n`);

  if (RENDER_ONLY) return renderOnly(date, log);

  // 1. 수집
  log('1. 뉴스를 모읍니다');
  const { articles, report } = await fetchAll(SOURCES, { log });
  const okFeeds = report.filter((r) => r.ok).length;
  log(`   → ${articles.length}건 수집 (피드 ${okFeeds}/${report.length})`);
  if (!articles.length) throw new Error('수집된 기사가 없습니다. 네트워크나 피드 주소를 확인하세요.');

  // 2. 밤사이 기사만 남기기 — 어제 아침 7시부터 지금까지
  const until = now;
  const since = new Date(kstMoment(now, SITE.publishHour).getTime() - 24 * 3_600_000);
  let fresh = withinWindow(articles, { since, until });
  if (fresh.length < 20) {
    // 새벽에 기사가 적거나 피드가 늦으면 창을 48시간으로 넓힌다.
    const wider = new Date(since.getTime() - 24 * 3_600_000);
    fresh = withinWindow(articles, { since: wider, until });
    log(`   · 밤사이 기사가 적어 48시간으로 넓혔습니다`);
  }
  const signal = dropNoise(fresh);
  const unique = dedupe(signal);
  log(
    `2. 밤사이 기사 ${unique.length}건` +
      ` (수집창 ${fresh.length}건 → 인사·부고·시황표 등 ${fresh.length - signal.length}건 제외)`
  );

  // 3. 같은 사건끼리 묶기
  const clusters = clusterArticles(unique);
  const sections = selectByCategory(clusters, CATEGORIES, now.getTime());
  const selected = sections.flatMap((s) =>
    s.clusters.map((c) => ({ ...c, categoryLabel: s.label }))
  );
  log(`3. ${clusters.length}개 이야기로 묶고, 그중 ${selected.length}개를 골랐습니다`);

  // 4. 요약
  log('4. 요약합니다');
  const { greeting, byId, engine } = await summarize(selected, {
    dateLabel,
    articleCount: unique.length,
    log,
  });

  for (const section of sections) {
    section.clusters = section.clusters.map((c) => ({
      ...c,
      item: byId.get(c.id) || { headline: c.title, summary: c.lead.summary, why: '' },
    }));
  }

  const briefing = {
    date,
    dateLabel,
    weekday: `${weekday}요일`,
    publishedAt: now.toISOString(),
    greeting,
    engine,
    webUrl: `${SITE.url}/`,
    window: { since: since.toISOString(), until: until.toISOString() },
    stats: {
      articleCount: unique.length,
      storyCount: selected.length,
      feedOk: okFeeds,
      feedTotal: report.length,
    },
    sections,
  };

  if (DRY) {
    log('\n[--dry] 파일을 쓰지 않고 미리보기만 출력합니다.\n');
    log(`인사: ${greeting}\n`);
    for (const s of sections) {
      log(`── ${s.emoji} ${s.label}`);
      for (const c of s.clusters) {
        log(`   · ${c.item.headline}  [${c.sources.join('/')}]`);
        log(`     ${c.item.summary}`);
      }
    }
    return;
  }

  // 5. 저장 — 다시 그릴 때 필요한 것만 남긴다.
  //    (매일 저장소에 쌓이는 파일이라 원본 기사를 통째로 두면 1년에 수십 MB가 된다)
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, `${date}.json`),
    // 사람이 매일 열어 보는 파일이 아니고 매일 하나씩 쌓이므로 들여쓰기 없이 저장한다.
    JSON.stringify(slim(briefing)) + '\n',
    'utf8'
  );

  const entries = await loadArchiveIndex(date, briefing);
  const idx = entries.findIndex((e) => e.date === date);

  await writeDist(briefing, entries, {
    prev: entries[idx + 1]?.date,
    next: entries[idx - 1]?.date,
  });

  const relPath = path.relative(process.cwd(), DIST_DIR);
  const rel = !relPath || relPath.startsWith('..') ? DIST_DIR : relPath;
  log(`\n✓ 완성했습니다.`);
  log(`   웹  : ${rel}/index.html`);
  log(`   앱  : ${rel}/api/today.json  (오늘하이가 매일 아침 읽어가는 곳)`);
  log(`   보관: ${path.relative(process.cwd(), DATA_DIR)}/${date}.json`);
  log(`   요약: ${engine === 'claude' ? 'Claude' : '기사 리드 문장'}\n`);
}

/**
 * 수집도 요약도 하지 않고, 보관해 둔 하루치만으로 페이지를 다시 그린다.
 * 쓰는 곳 두 군데:
 *   1) 디자인을 바꿨을 때 지난 아침까지 새 모양으로 다시 만들기
 *   2) 이 컴퓨터가 이미 오늘치를 만들어 뒀을 때, 서버는 그리기만 하기
 */
async function renderOnly(date, log) {
  const file = path.join(DATA_DIR, `${date}.json`);
  let briefing;
  try {
    briefing = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    throw new Error(
      `${path.relative(process.cwd(), file)} 이 없습니다. --render-only 는 보관본이 있어야 씁니다.`
    );
  }

  const entries = await loadArchiveIndex(date, briefing);
  const idx = entries.findIndex((e) => e.date === date);
  await writeDist(briefing, entries, {
    prev: entries[idx + 1]?.date,
    next: entries[idx - 1]?.date,
  });

  const relPath = path.relative(process.cwd(), DIST_DIR);
  const rel = !relPath || relPath.startsWith('..') ? DIST_DIR : relPath;
  log(`✓ 보관본으로 다시 그렸습니다 (${entries.length}일치).`);
  log(`   웹  : ${rel}/index.html`);
  log(`   앱  : ${rel}/api/today.json`);
  log(`   요약: ${briefing.engine === 'claude' ? 'Claude' : '기사 리드 문장'} (이미 만들어져 있던 것)\n`);
}

/** 보관용으로 줄인 하루치 — 지난 아침 페이지를 다시 그리는 데 필요한 만큼만. */
function slim(briefing) {
  return {
    ...briefing,
    sections: briefing.sections.map((s) => ({
      id: s.id,
      label: s.label,
      emoji: s.emoji,
      clusters: s.clusters.map((c) => ({
        id: c.id,
        category: c.category,
        title: c.title,
        item: c.item,
        sources: c.sources,
        sourceCount: c.sourceCount,
        articleCount: c.articleCount,
        image: c.image || '',
        publishedAt: c.publishedAt,
        lead: {
          title: c.lead.title,
          link: c.lead.link,
          summary: c.lead.summary,
          sourceName: c.lead.sourceName,
        },
        // 관련 기사는 화면에 4건까지만 나온다.
        articles: c.articles.slice(0, 5).map((a) => ({
          title: a.title,
          link: a.link,
          sourceName: a.sourceName,
          publishedAt: a.publishedAt,
        })),
      })),
    })),
  };
}

/** data/*.json 전체를 훑어 최신순 목록을 만든다. */
async function loadArchiveIndex(todayDate, todayBriefing) {
  const files = (await fs.readdir(DATA_DIR)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  const entries = [];
  for (const file of files) {
    const date = file.replace('.json', '');
    if (date === todayDate) {
      entries.push(summaryEntry(todayBriefing));
      continue;
    }
    try {
      const raw = JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf8'));
      entries.push(summaryEntry(raw));
    } catch {
      /* 깨진 파일은 건너뛴다 */
    }
  }
  return entries.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function summaryEntry(b) {
  return {
    date: b.date,
    dateLabel: b.dateLabel,
    weekday: b.weekday,
    greeting: b.greeting,
    publishedAt: b.publishedAt,
    storyCount: b.stats?.storyCount ?? 0,
  };
}

async function writeDist(briefing, entries, nav) {
  await fs.mkdir(path.join(DIST_DIR, 'archive'), { recursive: true });
  await fs.mkdir(path.join(DIST_DIR, 'api'), { recursive: true });

  const write = (rel, content) => fs.writeFile(path.join(DIST_DIR, rel), content, 'utf8');

  // 사람이 보는 웹
  await write('index.html', renderBriefing(briefing, { isToday: true, ...nav }));
  await write(`archive/${briefing.date}.html`, renderBriefing(briefing, { isToday: false, ...nav }));
  await write('archive.html', renderArchive(entries));
  await write('feed.xml', renderFeed(entries));

  // 지난 날짜 페이지도 다시 만들어 둔다 (dist는 매번 새로 배포되므로)
  for (const entry of entries) {
    if (entry.date === briefing.date) continue;
    const file = path.join(DATA_DIR, `${entry.date}.json`);
    try {
      const past = JSON.parse(await fs.readFile(file, 'utf8'));
      const i = entries.findIndex((e) => e.date === entry.date);
      await write(
        `archive/${entry.date}.html`,
        renderBriefing(past, {
          isToday: false,
          prev: entries[i + 1]?.date,
          next: entries[i - 1]?.date,
        })
      );
    } catch {
      /* 건너뛴다 */
    }
  }

  // 오늘하이가 읽어가는 곳
  const appFeed = buildAppFeed(briefing);
  const json = JSON.stringify(appFeed, null, 2) + '\n';
  await write('api/today.json', json);
  await write(`api/${briefing.date}.json`, json);
  await write(
    'api/index.json',
    JSON.stringify(
      { version: appFeed.version, latest: briefing.date, days: entries.map((e) => e.date) },
      null,
      2
    ) + '\n'
  );

  // robots.txt는 사이트 루트에서만 읽힌다. /news/ 같은 하위 경로에 배포할 때는
  // 만들어 봐야 아무도 읽지 않으므로, 루트 배포일 때만 쓴다.
  if (new URL(SITE.url).pathname.replace(/\/+$/, '') === '') {
    await write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
  }
  await write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE.url}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE.url}/archive.html</loc><changefreq>daily</changefreq></url>
${entries.map((e) => `  <url><loc>${SITE.url}/archive/${e.date}.html</loc></url>`).join('\n')}
</urlset>
`
  );
}

main().catch((err) => {
  console.error(`\n✗ 실패: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
