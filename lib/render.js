// 데이터 → 정적 HTML. 빌드 도구 없이 한 파일 안에서 끝난다.

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
  --bg:#FFF8EA; --paper:#FFFDF7; --ink:#2B2218; --ink-soft:#6B5B48;
  --gold:#FFC85A; --gold-deep:#E8A938; --apricot:#FFB17A; --rose:#F6A5B0;
  --line:#EADFC9; --line-soft:#F2E9D8;
  --serif:"Gowun Batang","Nanum Myeongjo",Pretendard,-apple-system,serif;
  --sans:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI",Roboto,sans-serif;
  --wrap:44rem;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
  font-size:17px;line-height:1.72;letter-spacing:-.01em;
  word-break:keep-all;overflow-wrap:anywhere;
}
a{color:inherit}
img{max-width:100%;display:block}
.wrap{max-width:var(--wrap);margin:0 auto;padding:0 1.25rem}
.skip{position:absolute;left:-9999px}
.skip:focus{left:1rem;top:1rem;position:fixed;background:var(--paper);padding:.6rem 1rem;border-radius:.6rem;z-index:9}

/* 제호 */
.masthead{padding:3.25rem 0 1.5rem;text-align:center}
.sun{width:60px;height:60px;margin:0 auto .9rem}
.masthead h1{
  font-family:var(--serif);font-size:clamp(2.6rem,11vw,3.6rem);font-weight:700;
  margin:0;letter-spacing:.02em;line-height:1.1;
}
.masthead h1 a{text-decoration:none}
.masthead .tagline{margin:.7rem 0 0;color:var(--ink-soft);font-size:.95rem}
.rule{height:0;border:0;border-top:2px solid var(--ink);opacity:.85;margin:1.4rem 0 .4rem}
.rule.thin{border-top:1px solid var(--line);opacity:1;margin:1rem 0}
.dateline{
  display:flex;flex-wrap:wrap;gap:.4rem 1rem;justify-content:center;
  font-size:.82rem;color:var(--ink-soft);letter-spacing:.02em;padding-bottom:.3rem;
}
.dateline b{font-weight:600;color:var(--ink)}

/* 인사 */
.greeting{
  background:var(--paper);border:1px solid var(--line);border-radius:1.1rem;
  padding:1.35rem 1.4rem;margin:1.75rem 0 2.5rem;
  box-shadow:0 1px 0 #fff inset,0 10px 24px -20px rgba(90,60,20,.5);
  position:relative;
}
.greeting::before{
  content:"";position:absolute;left:1.4rem;top:-1px;width:3.2rem;height:3px;
  background:linear-gradient(90deg,var(--gold),var(--apricot));border-radius:2px;
}
.greeting p{margin:0;font-family:var(--serif);font-size:1.12rem;line-height:1.75}

/* 섹션 */
section{margin:0 0 2.9rem}
.sec-head{display:flex;align-items:baseline;gap:.55rem;margin:0 0 1.1rem}
.sec-head h2{font-size:1.06rem;font-weight:700;margin:0;letter-spacing:-.02em}
.sec-head .em{font-size:1.05rem;line-height:1}
.sec-head .bar{flex:1;height:1px;background:var(--line);margin-left:.25rem}

/* 머리기사 */
.lead-list{display:grid;gap:1.1rem}
.lead-card{
  background:var(--paper);border:1px solid var(--line);border-radius:1.1rem;
  overflow:hidden;transition:transform .18s ease,box-shadow .18s ease;
}
.lead-card:hover{transform:translateY(-2px);box-shadow:0 16px 30px -24px rgba(90,60,20,.65)}
.lead-card .thumb{aspect-ratio:16/9;background:var(--line-soft);overflow:hidden}
.lead-card .thumb img{width:100%;height:100%;object-fit:cover}
.lead-card .body{padding:1.15rem 1.25rem 1.25rem}
.lead-card h3{
  font-family:var(--serif);font-size:1.32rem;line-height:1.42;margin:0 0 .55rem;font-weight:700;
}
.lead-card h3 a{text-decoration:none;background-image:linear-gradient(transparent 62%,rgba(255,200,90,.55) 62%);background-size:0 100%;background-repeat:no-repeat;transition:background-size .3s ease}
.lead-card h3 a:hover{background-size:100% 100%}
.lead-card p{margin:0;color:#4A3D2E}

/* 일반 기사 */
.item-list{display:grid;gap:1.35rem;counter-reset:it}
.item{display:grid;grid-template-columns:1.65rem 1fr;gap:.2rem .7rem}
.item::before{
  counter-increment:it;content:counter(it,decimal-leading-zero);
  font-size:.78rem;font-weight:700;color:var(--gold-deep);
  font-variant-numeric:tabular-nums;padding-top:.42rem;
}
.item h3{font-size:1.06rem;line-height:1.5;margin:0 0 .3rem;font-weight:700;letter-spacing:-.02em}
.item h3 a{text-decoration:none;border-bottom:1.5px solid transparent;transition:border-color .15s}
.item h3 a:hover{border-bottom-color:var(--gold-deep)}
.item p{margin:0;color:#4A3D2E;font-size:.965rem}
.item .meta,.lead-card .meta{margin-top:.5rem}

.why{
  margin-top:.55rem;padding-left:.7rem;border-left:2.5px solid var(--gold);
  font-size:.9rem;color:var(--ink-soft);
}
.why b{font-weight:600;color:var(--gold-deep)}

.meta{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;font-size:.76rem;color:var(--ink-soft)}
.chip{
  border:1px solid var(--line);background:#fff;border-radius:999px;
  padding:.12rem .55rem;white-space:nowrap;
}
.chip.hot{border-color:var(--gold);background:#FFF6E0;color:#8A6414;font-weight:600}
.more{margin-top:.5rem;font-size:.82rem}
.more summary{cursor:pointer;color:var(--ink-soft);list-style:none}
.more summary::-webkit-details-marker{display:none}
.more summary::before{content:"＋ ";color:var(--gold-deep)}
.more[open] summary::before{content:"－ "}
.more ul{margin:.5rem 0 0;padding-left:1rem}
.more li{margin:.22rem 0}
.more a{color:var(--ink-soft)}

/* 아카이브 */
.arc-list{list-style:none;margin:0;padding:0;display:grid;gap:.55rem}
.arc-list a{
  display:flex;justify-content:space-between;gap:1rem;text-decoration:none;
  background:var(--paper);border:1px solid var(--line);border-radius:.85rem;padding:.85rem 1.05rem;
}
.arc-list a:hover{border-color:var(--gold)}
.arc-list .n{color:var(--ink-soft);font-size:.82rem;white-space:nowrap}
.empty{color:var(--ink-soft);text-align:center;padding:2.5rem 0}

footer{
  border-top:1px solid var(--line);margin-top:3rem;padding:2rem 0 3.5rem;
  font-size:.82rem;color:var(--ink-soft);line-height:1.7;
}
footer p{margin:.4rem 0}
footer a{color:var(--gold-deep)}
.foot-nav{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:.9rem;font-weight:600}
.foot-nav a{text-decoration:none;color:var(--ink)}

@media (min-width:40rem){
  body{font-size:17.5px}
  .lead-list{gap:1.3rem}
  .lead-card.first{display:grid;grid-template-columns:1fr}
}
@media print{
  body{background:#fff}
  .lead-card,.greeting{border-color:#ddd;box-shadow:none}
  .more,.foot-nav{display:none}
}
`;

const SUN_SVG = `<svg class="sun" viewBox="0 0 64 64" role="img" aria-label="해">
<g fill="none" stroke="#E8A938" stroke-width="2.6" stroke-linecap="round">
<path d="M32 5v6M32 53v6M5 32h6M53 32h6M12.8 12.8l4.2 4.2M47 47l4.2 4.2M51.2 12.8L47 17M17 47l-4.2 4.2"/>
</g>
<circle cx="32" cy="32" r="15" fill="#FFC85A"/>
<circle cx="26.5" cy="29.5" r="1.9" fill="#2B2218"/>
<circle cx="37.5" cy="29.5" r="1.9" fill="#2B2218"/>
<path d="M27 37c1.6 1.9 3.2 2.8 5 2.8s3.4-.9 5-2.8" stroke="#2B2218" stroke-width="2.2" fill="none" stroke-linecap="round"/>
</svg>`;

function page({ title, description, canonical, body, base = '', bodyClass = '' }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#FFF8EA">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="${base}feed.xml">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='26' fill='%23FFC85A'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&amp;display=swap">
<style>${STYLES}</style>
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">본문으로 건너뛰기</a>
${body}
</body>
</html>`;
}

function masthead(subline, base = '') {
  return `<header class="masthead">
  <div class="wrap">
    ${SUN_SVG}
    <h1><a href="${base}index.html">${esc(SITE.name)}</a></h1>
    <p class="tagline">${esc(SITE.tagline)}</p>
    <hr class="rule">
    <div class="dateline">${subline}</div>
    <hr class="rule thin">
  </div>
</header>`;
}

function footer(extra = '', base = '') {
  const year = new Date().getFullYear();
  return `<footer><div class="wrap">
  <nav class="foot-nav"><a href="${base}index.html">오늘 브리핑</a><a href="${base}archive.html">지난 아침</a><a href="${base}feed.xml">RSS</a></nav>
  ${extra}
  <p>기사 제목과 첫 문장은 각 언론사 공개 RSS에서 가져왔고, 본문 저작권은 해당 언론사에 있습니다. 제목을 누르면 원문으로 갑니다.</p>
  <p>요약은 자동으로 만들어집니다. 중요한 결정을 앞두고 있다면 원문을 함께 확인해 주세요.</p>
  <p>© ${year} ${esc(SITE.author)} · 매일 아침 7시 발행</p>
</div></footer>`;
}

function sourceChips(cluster) {
  const chips = [];
  if (cluster.sourceCount >= 3) {
    chips.push(`<span class="chip hot">${cluster.sourceCount}곳이 함께 다룸</span>`);
  }
  for (const s of cluster.sources.slice(0, 3)) chips.push(`<span class="chip">${esc(s)}</span>`);
  chips.push(`<span>${esc(timeLabel(cluster.publishedAt))}</span>`);
  return `<div class="meta">${chips.join('')}</div>`;
}

function timeLabel(iso) {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 3_600_000);
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function relatedBlock(cluster) {
  const others = cluster.articles.slice(1, 5);
  if (others.length < 1) return '';
  const items = others
    .map(
      (a) =>
        `<li><a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(
          a.title
        )}</a> <span class="chip">${esc(a.sourceName)}</span></li>`
    )
    .join('');
  return `<details class="more"><summary>관련 기사 ${others.length}건</summary><ul>${items}</ul></details>`;
}

function leadCard(cluster, item, index) {
  const img = cluster.image
    ? `<div class="thumb"><img src="${esc(cluster.image)}" alt="" loading="${
        index === 0 ? 'eager' : 'lazy'
      }" referrerpolicy="no-referrer" onerror="this.closest('.thumb').remove()"></div>`
    : '';
  return `<article class="lead-card${index === 0 ? ' first' : ''}">
  ${img}
  <div class="body">
    <h3><a href="${esc(cluster.lead.link)}" target="_blank" rel="noopener noreferrer">${esc(
      item.headline || cluster.title
    )}</a></h3>
    <p>${esc(item.summary)}</p>
    ${item.why ? `<p class="why"><b>그래서</b> ${esc(item.why)}</p>` : ''}
    ${sourceChips(cluster)}
    ${relatedBlock(cluster)}
  </div>
</article>`;
}

function listItem(cluster, item) {
  return `<article class="item">
  <div>
    <h3><a href="${esc(cluster.lead.link)}" target="_blank" rel="noopener noreferrer">${esc(
      item.headline || cluster.title
    )}</a></h3>
    <p>${esc(item.summary)}</p>
    ${item.why ? `<p class="why"><b>그래서</b> ${esc(item.why)}</p>` : ''}
    ${sourceChips(cluster)}
    ${relatedBlock(cluster)}
  </div>
</article>`;
}

/** 하루치 브리핑 페이지 */
export function renderBriefing(briefing, { isToday, prev, next } = {}) {
  const { date, dateLabel, weekday, greeting, sections, stats } = briefing;
  // 지난 아침 페이지는 archive/ 안에 있으므로 한 단계 위를 가리킨다.
  const base = isToday ? '' : '../';

  const nav = [
    prev ? `<a href="${base}archive/${prev}.html">← ${prev}</a>` : '',
    next ? `<a href="${base}archive/${next}.html">${next} →</a>` : '',
    !isToday ? `<a href="${base}index.html">오늘 브리핑으로</a>` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const subline = `<span><b>${esc(dateLabel)}</b> ${esc(weekday)}</span>
    <span>밤사이 기사 ${stats.articleCount}건</span>
    <span>이야기 ${stats.storyCount}개</span>`;

  const body = sections
    .map((sec) => {
      const inner = sec.clusters
        .map((c, i) => (sec.id === 'headline' ? leadCard(c, c.item, i) : listItem(c, c.item)))
        .join('\n');
      return `<section id="${esc(sec.id)}">
  <div class="sec-head"><span class="em" aria-hidden="true">${sec.emoji}</span><h2>${esc(
        sec.label
      )}</h2><span class="bar"></span></div>
  <div class="${sec.id === 'headline' ? 'lead-list' : 'item-list'}">${inner}</div>
</section>`;
    })
    .join('\n');

  return page({
    title: isToday
      ? `${SITE.name} — ${dateLabel} 아침 브리핑`
      : `${dateLabel} 아침 브리핑 — ${SITE.name}`,
    description: `${dateLabel} ${SITE.description}`,
    base,
    canonical: isToday ? `${SITE.url}/` : `${SITE.url}/archive/${date}.html`,
    body: `${masthead(subline, base)}
<main id="main"><div class="wrap">
  <div class="greeting"><p>${esc(greeting)}</p></div>
  ${body || '<p class="empty">오늘은 모아온 기사가 없어요. 잠시 뒤 다시 들러 주세요.</p>'}
</div></main>
${footer(nav ? `<p>${nav}</p>` : '', base)}`,
  });
}

/** 지난 아침 목록 */
export function renderArchive(entries) {
  const list = entries.length
    ? `<ul class="arc-list">${entries
        .map(
          (e) =>
            `<li><a href="archive/${esc(e.date)}.html"><span><b>${esc(
              e.dateLabel
            )}</b> ${esc(e.weekday)}</span><span class="n">이야기 ${e.storyCount}개</span></a></li>`
        )
        .join('')}</ul>`
    : '<p class="empty">아직 쌓인 아침이 없어요.</p>';

  return page({
    title: `지난 아침 — ${SITE.name}`,
    description: `${SITE.name}이 지금까지 정리한 아침 브리핑 모음.`,
    canonical: `${SITE.url}/archive.html`,
    body: `${masthead('<span>지난 아침 모음</span>')}
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
