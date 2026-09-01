// 의존성 없는 RSS 리더. 국내 언론사 피드는 RSS 2.0 + CDATA 조합이라
// 정식 XML 파서 없이도 안전하게 읽힌다.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

function stripTags(s) {
  return decodeEntities(String(s).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const m = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')
  );
  return m ? decodeEntities(m[1]).trim() : '';
}

function firstImage(block) {
  const patterns = [
    /<media:content[^>]*url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]*url=["']([^"']+)["']/i,
    /<enclosure[^>]*url=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i,
    /<image>[\s\S]*?<url>([^<]+)<\/url>/i,
    /src=["'](https?:\/\/[^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i,
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m) return decodeEntities(m[1]).trim();
  }
  return '';
}

function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** RSS/Atom 텍스트 → 기사 배열 */
export function parseFeed(xml, source) {
  const blocks = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
  ].map((m) => m[1]);

  const items = [];
  for (const block of blocks) {
    const title = stripTags(tag(block, 'title'));
    let link = tag(block, 'link');
    if (!link) {
      const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = m ? decodeEntities(m[1]) : '';
    }
    link = link.trim();
    if (!title || !link) continue;

    const summary = stripTags(
      tag(block, 'description') || tag(block, 'summary') || tag(block, 'content:encoded')
    );

    items.push({
      title,
      link,
      summary: summary.slice(0, 600),
      image: firstImage(block),
      author: stripTags(tag(block, 'dc:creator') || tag(block, 'author')),
      publishedAt:
        parseDate(tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated')) ??
        null,
      sourceId: source.id,
      sourceName: source.name,
      feedCategory: source.category,
    });
  }
  return items;
}

/** 피드 하나를 가져온다. 실패해도 예외를 던지지 않고 빈 배열을 준다. */
export async function fetchFeed(source, { timeoutMs = 15000, retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(source.url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const items = parseFeed(xml, source);
      if (!items.length) throw new Error('항목 0개');
      return { ok: true, items, error: null };
    } catch (err) {
      if (attempt === retries) {
        return { ok: false, items: [], error: err.message || String(err) };
      }
      await new Promise((r) => setTimeout(r, 800));
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, items: [], error: 'unreachable' };
}

/** 여러 피드를 동시에(과하지 않게) 가져온다. */
export async function fetchAll(sources, { concurrency = 5, log = () => {} } = {}) {
  const queue = [...sources];
  const articles = [];
  const report = [];

  async function worker() {
    while (queue.length) {
      const source = queue.shift();
      const { ok, items, error } = await fetchFeed(source);
      report.push({ id: source.id, name: source.name, ok, count: items.length, error });
      log(
        ok
          ? `  ✓ ${source.name} (${source.id}) — ${items.length}건`
          : `  ✗ ${source.name} (${source.id}) — 건너뜀: ${error}`
      );
      articles.push(...items);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, worker));
  return { articles, report };
}
