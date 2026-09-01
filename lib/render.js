// 데이터 → 정적 HTML. 빌드 도구 없이 한 파일 안에서 끝난다.
//
// 디자인 방향: 에디토리얼(신문) 언어. 카드 대신 여백과 실선으로 묶고,
// 큰 제목과 작은 본문의 대비로 위계를 만든다. 색은 잉크 + 골드 하나뿐.
// 아침 7시에 침대에서 폰으로 읽는 사람이 기준이라 본문 크기를 넉넉히 잡았다.

import { SITE } from '../config.js';

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLES = `
:root{
  color-scheme:light dark;
  --paper:#FAF7F2; --paper-2:#F3EEE5;
  --ink:#151310; --ink-2:#4A423A; --ink-3:#857B70;
  --line:#E4DCD0; --line-2:#EFE9DF;
  --gold:#C8880F; --gold-soft:#F0D9A8;
  --sans:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI",Roboto,sans-serif;
  --wrap:64rem; --col:38rem;
  --r:14px;
}
@media (prefers-color-scheme:dark){
  :root{
    --paper:#14120F; --paper-2:#1D1A16;
    --ink:#F2EDE4; --ink-2:#BDB4A7; --ink-3:#8B8175;
    --line:#2E2A24; --line-2:#241F1A;
    --gold:#E3B15A; --gold-soft:#4A3A18;
  }
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{
  margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  font-size:17px;line-height:1.7;letter-spacing:-.011em;
  word-break:keep-all;overflow-wrap:anywhere;
  -webkit-font-smoothing:antialiased;
}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
h1,h2,h3{margin:0;font-weight:700;letter-spacing:-.035em;line-height:1.28}
.wrap{max-width:var(--wrap);margin:0 auto;padding:0 1.5rem}
.skip{position:absolute;left:-9999px}
.skip:focus{position:fixed;left:1rem;top:1rem;background:var(--paper);color:var(--ink);
  padding:.7rem 1.1rem;border:1px solid var(--ink);border-radius:var(--r);z-index:99}
:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:4px}

/* ── 제호 ─────────────────────────────── */
.masthead{padding:2.6rem 0 0}
.brand{display:flex;align-items:center;gap:.6rem}
.brand svg{width:30px;height:30px;flex:none}
.brand h1{font-size:1.6rem;font-weight:800;letter-spacing:-.055em}
.dateline{
  display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .9rem;
  margin:1.5rem 0 0;padding-bottom:1rem;
  font-size:.8rem;color:var(--ink-3);font-variant-numeric:tabular-nums;
}
.dateline .today{color:var(--ink);font-weight:600;font-size:.92rem;letter-spacing:-.02em}
.dateline .sep{width:3px;height:3px;border-radius:50%;background:var(--line);align-self:center}

/* ── 오늘 한 줄 ────────────────────────── */
.opener{
  border-top:1.5px solid var(--ink);padding:2.2rem 0 2.6rem;
}
.opener p{
  margin:0;max-width:34ch;
  font-size:clamp(1.7rem,6.2vw,2.6rem);font-weight:700;
  letter-spacing:-.045em;line-height:1.32;
}
.opener .mark{
  display:block;width:2.2rem;height:3px;background:var(--gold);
  margin:0 0 1.5rem;border-radius:2px;
}

/* ── 분야 이동 (스티키) ─────────────────── */
.rail{
  position:sticky;top:0;z-index:20;
  background:color-mix(in srgb,var(--paper) 88%,transparent);
  backdrop-filter:saturate(180%) blur(12px);
  -webkit-backdrop-filter:saturate(180%) blur(12px);
  border-bottom:1px solid var(--line-2);
}
.rail ul{
  display:flex;gap:.15rem;margin:0;padding:.55rem 1.5rem;list-style:none;
  max-width:var(--wrap);margin:0 auto;
  overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity;
}
.rail ul::-webkit-scrollbar{display:none}
.rail li{scroll-snap-align:start}
.rail a{
  display:block;white-space:nowrap;padding:.42rem .72rem;border-radius:999px;
  font-size:.85rem;font-weight:600;color:var(--ink-2);
  transition:background .18s ease,color .18s ease;
}
.rail a:hover{background:var(--paper-2);color:var(--ink)}

/* ── 머리기사 ─────────────────────────── */
.top{padding:2.6rem 0 1rem}
.top-lead{display:grid;gap:1.15rem;margin-bottom:2.4rem}
.top-lead .shot{
  border-radius:var(--r);overflow:hidden;background:var(--paper-2);aspect-ratio:16/9;
}
.top-lead .shot img{width:100%;height:100%;object-fit:cover}
.top-lead h3{font-size:clamp(1.5rem,5vw,2rem);letter-spacing:-.045em;line-height:1.26}
.top-lead p{margin:.7rem 0 0;font-size:1.02rem;color:var(--ink-2);max-width:60ch}

.top-rest{display:grid;gap:0}
.top-rest article{
  display:grid;grid-template-columns:1fr;gap:.4rem;
  padding:1.4rem 0;border-top:1px solid var(--line-2);
}
.top-rest h3{font-size:1.14rem;line-height:1.42}
.top-rest p{margin:0;font-size:.95rem;color:var(--ink-2);max-width:60ch}

/* ── 분야별 ───────────────────────────── */
.cat{padding:2.8rem 0 .6rem;scroll-margin-top:4rem}
.cat-head{display:flex;align-items:center;gap:.85rem;margin-bottom:.4rem}
.cat-head h2{font-size:1.02rem;font-weight:700;letter-spacing:-.02em;white-space:nowrap}
.cat-head .line{flex:1;height:1px;background:var(--line)}
.cat-head .count{font-size:.78rem;color:var(--ink-3);font-variant-numeric:tabular-nums}

.story{
  display:grid;grid-template-columns:1fr;gap:.45rem;
  padding:1.5rem 0;border-top:1px solid var(--line-2);
}
.story h3{font-size:1.1rem;line-height:1.45}
.story p{margin:0;font-size:.95rem;color:var(--ink-2);max-width:62ch}

/* 제목 밑줄이 왼쪽에서 차오른다 */
.hd{
  background-image:linear-gradient(var(--gold),var(--gold));
  background-size:0% 1.5px;background-position:0 100%;background-repeat:no-repeat;
  transition:background-size .28s cubic-bezier(.16,1,.3,1);
  padding-bottom:1px;
}
a:hover .hd,a:focus-visible .hd{background-size:100% 1.5px}

.why{
  margin:.6rem 0 0;padding:.55rem .8rem;border-radius:10px;
  background:var(--paper-2);font-size:.88rem;color:var(--ink-2);max-width:60ch;
}
.why b{color:var(--gold);font-weight:700}

.meta{
  display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .5rem;
  margin-top:.7rem;font-size:.76rem;color:var(--ink-3);font-variant-numeric:tabular-nums;
}
.meta .press{font-weight:600;color:var(--ink-2)}
.meta .many{color:var(--gold);font-weight:700;margin-left:.35rem;
  padding:.05rem .45rem;border:1px solid var(--gold);border-radius:999px;font-size:.72rem}
.meta .dot{width:2px;height:2px;border-radius:50%;background:var(--line);flex:none}

.more{margin-top:.55rem;font-size:.82rem}
.more summary{
  cursor:pointer;list-style:none;color:var(--ink-3);
  display:inline-flex;align-items:center;gap:.3rem;
}
.more summary::-webkit-details-marker{display:none}
.more summary::after{content:"+";color:var(--gold);font-weight:700}
.more[open] summary::after{content:"−"}
.more ul{margin:.6rem 0 0;padding:0;list-style:none;display:grid;gap:.4rem}
.more li{padding-left:.85rem;position:relative;color:var(--ink-2);line-height:1.55}
.more li::before{content:"";position:absolute;left:0;top:.62em;width:4px;height:1px;background:var(--line)}

/* ── 지난 아침 ────────────────────────── */
.arc{display:grid;gap:0;margin:2rem 0 0}
.arc a{
  display:flex;justify-content:space-between;align-items:baseline;gap:1rem;
  padding:1.15rem .25rem;border-top:1px solid var(--line-2);
  transition:padding-left .2s ease;
}
.arc a:hover{padding-left:.7rem}
.arc .d{font-weight:600;letter-spacing:-.02em}
.arc .n{font-size:.82rem;color:var(--ink-3);font-variant-numeric:tabular-nums}
.empty{color:var(--ink-3);padding:3rem 0;text-align:center}

/* ── 꼬리 ─────────────────────────────── */
footer{margin-top:4rem;border-top:1.5px solid var(--ink);padding:2rem 0 4rem;
  font-size:.82rem;line-height:1.75;color:var(--ink-3)}
footer nav{display:flex;gap:1.2rem;margin-bottom:1.2rem;font-weight:600}
footer nav a{color:var(--ink)}
footer nav a:hover{color:var(--gold)}
footer p{margin:.35rem 0;max-width:58ch}

/* ── 넓은 화면 ────────────────────────── */
@media (min-width:48rem){
  body{font-size:17.5px}
  .masthead{padding-top:3.4rem}
  .brand svg{width:34px;height:34px}
  .brand h1{font-size:1.8rem}
  .top-lead{grid-template-columns:1.15fr 1fr;gap:1.8rem;align-items:center}
  .top-rest{grid-template-columns:1fr 1fr;column-gap:2.4rem}
  .top-rest article:nth-child(-n+2){border-top-color:var(--line)}
  .story{grid-template-columns:1fr;max-width:var(--col)}
  .cat-inner{display:grid;grid-template-columns:1fr 1fr;column-gap:2.4rem}
  .story{max-width:none}
}

/* ── 움직임 ───────────────────────────── */
/* 읽는 순서대로 문단이 올라온다. 스크롤 이벤트를 듣지 않고 CSS 타임라인만 쓴다. */
@media (prefers-reduced-motion:no-preference){
  @supports (animation-timeline:view()){
    .reveal{
      animation:rise linear both;
      animation-timeline:view();
      animation-range:entry 0% entry 42%;
    }
    @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  }
}

@media print{
  body{background:#fff;color:#000;font-size:11pt}
  .rail,.more,footer nav{display:none}
  .story,.top-rest article{break-inside:avoid}
}
`;

const SUN = `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
<g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" opacity=".9">
<path d="M32 4v7M32 53v7M4 32h7M53 32h7M12.2 12.2l5 5M46.8 46.8l5 5M51.8 12.2l-5 5M17.2 46.8l-5 5"/>
</g>
<circle cx="32" cy="32" r="14.5" fill="currentColor"/>
</svg>`;

function page({ title, description, canonical, body, base = '' }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#FAF7F2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14120F" media="(prefers-color-scheme: dark)">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="${base}feed.xml">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='24' fill='%23C8880F'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>${STYLES}</style>
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
${body}
</body>
</html>`;
}

function masthead(lines) {
  return `<header class="masthead"><div class="wrap">
  <a class="brand" href="index.html" style="color:var(--gold)">
    ${SUN}<h1 style="color:var(--ink)">${esc(SITE.name)}</h1>
  </a>
  <div class="dateline">${lines}</div>
</div></header>`;
}

function footer(extra = '', base = '') {
  return `<footer><div class="wrap">
  <nav><a href="${base}index.html">오늘</a><a href="${base}archive.html">지난 아침</a><a href="${base}feed.xml">RSS</a></nav>
  ${extra}
  <p>제목과 첫 문장은 각 언론사가 공개한 RSS에서 가져왔습니다. 본문 저작권은 해당 언론사에 있고, 제목을 누르면 원문으로 갑니다.</p>
  <p>요약은 자동으로 만들어집니다. 중요한 판단을 앞두고 있다면 원문을 함께 확인해 주세요.</p>
  <p>${new Date().getFullYear()} ${esc(SITE.author)} · 매일 아침 7시 발행</p>
</div></footer>`;
}

function timeLabel(iso) {
  const kst = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
}

function meta(cluster) {
  // 구분점은 한 줄에 하나만. 여러 곳이 다뤘다는 표시는 색으로 따로 세운다.
  const badge =
    cluster.sourceCount >= 3
      ? `<span class="many">${cluster.sourceCount}곳이 함께 다룸</span>`
      : '';
  return `<div class="meta">
    <span class="press">${esc(cluster.lead.sourceName)}</span>
    <span class="dot"></span>
    <span>${esc(timeLabel(cluster.publishedAt))}</span>
    ${badge}
  </div>`;
}

function related(cluster) {
  const others = cluster.articles.slice(1, 5);
  if (!others.length) return '';
  const items = others
    .map(
      (a) =>
        `<li><a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(
          a.title
        )}</a> <span style="color:var(--ink-3)">${esc(a.sourceName)}</span></li>`
    )
    .join('');
  return `<details class="more"><summary>다른 곳은 이렇게 썼어요 ${others.length}건</summary><ul>${items}</ul></details>`;
}

function whyLine(item) {
  return item.why ? `<p class="why"><b>그래서</b> ${esc(item.why)}</p>` : '';
}

function leadStory(c) {
  const shot = c.image
    ? `<div class="shot"><img src="${esc(c.image)}" alt="" fetchpriority="high"
        referrerpolicy="no-referrer" onerror="this.closest('.shot').remove()"></div>`
    : '';
  return `<article class="top-lead">
  ${shot}
  <div>
    <a href="${esc(c.lead.link)}" target="_blank" rel="noopener noreferrer">
      <h3><span class="hd">${esc(c.item.headline || c.title)}</span></h3>
    </a>
    <p>${esc(c.item.summary)}</p>
    ${whyLine(c.item)}
    ${meta(c)}
    ${related(c)}
  </div>
</article>`;
}

function story(c, cls = 'story') {
  return `<article class="${cls} reveal">
  <a href="${esc(c.lead.link)}" target="_blank" rel="noopener noreferrer">
    <h3><span class="hd">${esc(c.item.headline || c.title)}</span></h3>
  </a>
  <p>${esc(c.item.summary)}</p>
  ${whyLine(c.item)}
  ${meta(c)}
  ${related(c)}
</article>`;
}

/** 하루치 브리핑 페이지 */
export function renderBriefing(briefing, { isToday, prev, next } = {}) {
  const { date, dateLabel, weekday, greeting, sections, stats } = briefing;
  const base = isToday ? '' : '../';

  const headline = sections.find((s) => s.id === 'headline');
  const rest = sections.filter((s) => s.id !== 'headline');

  const dateline = [
    `<span class="today">${esc(dateLabel)} ${esc(weekday)}</span>`,
    `<span class="sep"></span>`,
    `<span>밤사이 기사 ${stats.articleCount}건을 읽고 ${stats.storyCount}개로 추렸습니다</span>`,
  ].join('');

  const rail = rest.length
    ? `<nav class="rail" aria-label="분야 이동"><ul>${rest
        .map((s) => `<li><a href="#${esc(s.id)}">${esc(s.label)}</a></li>`)
        .join('')}</ul></nav>`
    : '';

  const top = headline?.clusters.length
    ? `<section class="top"><div class="wrap">
    ${leadStory(headline.clusters[0])}
    <div class="top-rest">${headline.clusters.slice(1).map((c) => story(c, 'reveal')).join('')}</div>
  </div></section>`
    : '';

  const body = rest
    .map(
      (s) => `<section class="cat" id="${esc(s.id)}"><div class="wrap">
  <div class="cat-head"><h2>${esc(s.label)}</h2><span class="line"></span><span class="count">${
    s.clusters.length
  }</span></div>
  <div class="cat-inner">${s.clusters.map((c) => story(c)).join('')}</div>
</div></section>`
    )
    .join('\n');

  const nav = [
    prev ? `<a href="${base}archive/${prev}.html">${prev}</a>` : '',
    next ? `<a href="${base}archive/${next}.html">${next}</a>` : '',
    !isToday ? `<a href="${base}index.html">오늘 브리핑</a>` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return page({
    base,
    title: isToday
      ? `${SITE.name} · ${dateLabel} 아침 브리핑`
      : `${dateLabel} 아침 브리핑 · ${SITE.name}`,
    description: `${dateLabel} ${SITE.description}`,
    canonical: isToday ? `${SITE.url}/` : `${SITE.url}/archive/${date}.html`,
    body: `${masthead(dateline)}
<div class="wrap"><section class="opener"><span class="mark"></span><p>${esc(greeting)}</p></section></div>
${rail}
<main id="main">
  ${top}
  ${body || '<div class="wrap"><p class="empty">오늘은 모아온 기사가 없어요. 잠시 뒤에 다시 들러 주세요.</p></div>'}
</main>
${footer(nav ? `<p>${nav}</p>` : '', base)}`,
  });
}

/** 지난 아침 목록 */
export function renderArchive(entries) {
  const list = entries.length
    ? `<div class="arc">${entries
        .map(
          (e) =>
            `<a href="archive/${esc(e.date)}.html"><span class="d">${esc(e.dateLabel)} ${esc(
              e.weekday
            )}</span><span class="n">${e.storyCount}개</span></a>`
        )
        .join('')}</div>`
    : '<p class="empty">아직 쌓인 아침이 없어요.</p>';

  return page({
    title: `지난 아침 · ${SITE.name}`,
    description: `${SITE.name}이 지금까지 정리한 아침 브리핑 모음.`,
    canonical: `${SITE.url}/archive.html`,
    body: `${masthead('<span class="today">지난 아침</span>')}
<main id="main"><div class="wrap">${list}</div></main>
${footer()}`,
  });
}

/** RSS */
export function renderFeed(entries) {
  const items = entries
    .slice(0, 30)
    .map((e) => {
      const link = `${SITE.url}/archive/${e.date}.html`;
      return `  <item>
    <title>${esc(`${e.dateLabel} 아침 브리핑`)}</title>
    <link>${esc(link)}</link>
    <guid isPermaLink="true">${esc(link)}</guid>
    <pubDate>${new Date(e.publishedAt).toUTCString()}</pubDate>
    <description>${esc(e.greeting)}</description>
  </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(SITE.name)}</title>
  <link>${esc(SITE.url)}/</link>
  <description>${esc(SITE.description)}</description>
  <language>ko</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel></rss>`;
}
