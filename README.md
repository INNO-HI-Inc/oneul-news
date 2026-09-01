# 아침 7시

매일 아침 7시에 밤사이 뉴스를 정리해 내보내는 정적 사이트.
사람은 웹에서 읽고, **오늘하이(iOS)는 `api/today.json`을 읽어간다.**

- 웹 → <https://inno-hi-inc.github.io/oneul-news/>
- 앱 → <https://inno-hi-inc.github.io/oneul-news/api/today.json>

```
연합뉴스·동아·경향·한겨레·노컷·전자신문 RSS
      ↓  밤사이(어제 07시~오늘 07시) 기사만
      ↓  인사·부고·시황표 같은 잡음 제거
      ↓  같은 사건끼리 묶기 (여러 신문이 다룬 순으로)
      ↓  분야별로 골라내기
      ↓  요약 (Claude, 없으면 기사 리드 문장)
      ├─ dist/index.html          사람이 읽는 웹
      ├─ dist/api/today.json      오늘하이가 읽어가는 곳
      └─ data/YYYY-MM-DD.json     원본 보관
```

## 돌려보기

```bash
npm install
npm run dry      # 파일 안 쓰고 결과만 보기
npm run build    # dist/ 에 생성
open dist/index.html
```

### 요약은 무엇으로 하나

세 가지 중 되는 것을 알아서 고른다. **어느 쪽이든 실패하면 리드 문장으로 내려가고,
사이트는 언제나 완성된다.**

| 방식 | 조건 | 품질 |
|---|---|---|
| `cli` | 이 컴퓨터에 `claude` 명령이 있으면 (**API 키 불필요**) | 가장 좋음 |
| `api` | `ANTHROPIC_API_KEY` 가 있으면 | 가장 좋음 |
| `lead` | 둘 다 없으면 | 통신사 리드 문장을 존댓말로 다듬어 씀 |

`cli` 는 설치된 Claude Code 를 그대로 부른다(`claude -p`). 12건씩 나눠 부탁하고,
한 묶음이 실패해도 그 묶음만 리드 문장으로 메운다. 31건 기준 약 4분.

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `NEWS_SUMMARIZER` | 자동 | `cli` / `api` / `lead` 로 강제 지정 |
| `NEWS_CLI_MODEL` | `claude-opus-5` | `claude` 명령에 넘길 모델 |
| `ANTHROPIC_API_KEY` | (없음) | 있으면 `api` 방식 |
| `NEWS_MODEL` | `claude-opus-5` | `api` 방식의 모델 |
| `SITE_URL` | `https://inno-hi-inc.github.io/oneul-news` | canonical·사이트맵·RSS의 절대 주소 |

페이지 안의 링크는 전부 상대경로라, 루트에 올리든 `/news/` 아래에 올리든 그대로 돌아간다.

## 매일 아침 7시 자동 발행

요약은 API 키 없이 하고 싶으므로 **두 곳이 나눠 맡는다.**

```
06:40 KST  집 맥 (launchd)     수집 → claude 명령으로 요약 → data/ 를 저장소에 push
                               → 서버 워크플로를 깨움
07:00 KST  GitHub Actions      오늘치 보관본이 있으면  → 그리기만 하고 배포 (--render-only)
                               없으면(맥이 꺼져 있었으면) → 직접 수집해 리드 문장으로 발행
```

맥이 자고 있어도 **7시에는 무조건 새 브리핑이 올라간다.** 요약 품질만 달라진다.

**서버 쪽** — `.github/workflows/news-daily.yml`, `0 22 * * *`(UTC) = 07:00 KST.
Pages 는 Settings → Pages → Source = **GitHub Actions** 여야 한다.

**이 맥 쪽** — `scripts/morning.sh` 를 `~/Library/LaunchAgents/kr.ai.innohi.oneulnews.morning.plist`
가 매일 06:40 에 부른다. 네트워크가 없거나 요약이 리드 문장으로 내려가면 아무것도 올리지 않고
서버 발행에 맡긴다. 로그는 `.morning.log`.

```bash
# 지금 한 번 돌려보기
launchctl kickstart -k gui/$(id -u)/kr.ai.innohi.oneulnews.morning
tail -f .morning.log

# 그만두기
launchctl bootout gui/$(id -u)/kr.ai.innohi.oneulnews.morning
```

---

## 오늘하이 연동 규격

오늘하이는 아침에 **한 번, 한 파일만** 받으면 된다.

```
GET https://inno-hi-inc.github.io/oneul-news/api/today.json
```

| 필드 | 타입 | 쓰는 곳 |
|---|---|---|
| `version` | Int | 규격 버전. 앱은 모르는 버전이면 캐시를 쓴다 |
| `date` | String | `2026-08-31` (KST 기준) |
| `publishedAt` | String | ISO8601. 오늘 날짜가 아니면 아직 갱신 전 |
| `greeting` | String | 브리핑 도입 한 문장 |
| `glance` | String | 잠금화면 알람 카드 한 줄 (28자 이내) |
| `script.short` | String | **30초 브리핑용 낭독 원고** — 머리기사 3건 |
| `script.long` | String | **2~3분 브리핑용 낭독 원고** — 8건 + 요약 |
| `items[]` | Array | 앱 화면의 뉴스 카드 |
| `stats` | Object | 밤사이 기사 수·이야기 수 |
| `engine` | String | `claude` 또는 `lead` |

`script.*`는 **그대로 TTS에 넣으면 되는 문장**이다. `[단독]` 같은 꼬리표, 따옴표,
`%`·`~` 같이 TTS가 어색하게 읽는 기호를 미리 없애 두었다 (앱의 `ttsSafe`와 같은 규칙).

`items[]` 한 건:

```json
{
  "id": "7hxsha",
  "category": "headline",
  "categoryLabel": "오늘의 머리기사",
  "headline": "조국혁신당 김형연, 이해민 비례대표 의석 승계",
  "summary": "조국혁신당 김형연 최고위원이 …",
  "why": "",
  "link": "https://www.donga.com/news/…",
  "press": "동아일보",
  "sources": ["동아일보", "연합뉴스"],
  "sourceCount": 2,
  "image": "https://dimg.donga.com/…",
  "publishedAt": "2026-08-31T09:24:55.000Z",
  "isHeadline": true
}
```

`sourceCount`가 클수록 여러 신문이 함께 다룬 큰 사건이다. 카드에 배지로 쓰면 좋다.

### 나머지 엔드포인트

| 주소 | 내용 |
|---|---|
| `api/today.json` | 오늘치 (앱이 매일 아침 읽는 곳) |
| `api/2026-08-31.json` | 특정 날짜치 |
| `api/index.json` | `{ latest, days[] }` — 어떤 날짜가 있는지 |
| `feed.xml` | RSS |

### 앱 쪽 붙이기 (예시)

```swift
struct OneulNewsFeed: Decodable {
    struct Script: Decodable { let short: String; let long: String }
    struct Item: Decodable {
        let id: String, headline: String, summary: String, why: String
        let link: String, press: String
        let sources: [String], sourceCount: Int
        let image: String?, category: String, isHeadline: Bool
    }
    let version: Int, date: String, greeting: String, glance: String
    let script: Script
    let items: [Item]
}

enum OneulNews {
    static let endpoint = URL(string: "https://inno-hi-inc.github.io/oneul-news/api/today.json")!

    /// 아침 브리핑용 뉴스를 받아온다. 실패하면 nil — 호출한 쪽에서 캐시를 쓴다.
    static func fetch() async -> OneulNewsFeed? {
        var req = URLRequest(url: endpoint)
        req.timeoutInterval = 8
        req.cachePolicy = .reloadRevalidatingCacheData   // ETag 활용
        guard let (data, res) = try? await URLSession.shared.data(for: req),
              (res as? HTTPURLResponse)?.statusCode == 200,
              let feed = try? JSONDecoder().decode(OneulNewsFeed.self, from: data),
              feed.version == 1
        else { return nil }
        return feed
    }
}

// 원고는 그대로 읽으면 된다.
// let text = brief.length == .short ? feed.script.short : feed.script.long
```

주의할 점 두 가지:

1. **발행 전에 읽을 수 있다.** 알람이 7시 이전이면 아직 어제치가 올라가 있다.
   `date`를 오늘(KST)과 비교해서, 다르면 "아직 오늘 뉴스가 준비되지 않았어요"로 넘어가거나
   전날치를 쓰면 된다.
2. **네트워크가 없을 수 있다.** 받은 JSON은 그대로 저장해 두고, 실패하면 마지막 것을 쓴다.
   `BriefingCache`와 같은 자리에 두면 된다.

---

## 이 저장소가 따로 있는 이유

오늘하이 앱 소스(`INNO-HI-Inc/oneul-hi`)는 비공개다. 그런데 앱이 아침마다 읽어갈 주소는
공개돼 있어야 하고, GitHub Pages 는 비공개 저장소에서 못 쓴다.
그래서 **뉴스 파이프라인과 발행물만** 이 공개 저장소로 떼어 냈다. 앱 소스는 그대로 비공개다.

## 구조

| 파일 | 하는 일 |
|---|---|
| `config.js` | 피드 목록, 분야, 분류 키워드 |
| `lib/rss.js` | RSS 읽기 (의존성 없음, 죽은 피드는 건너뜀) |
| `lib/text.js` | 한국어 제목 정리·조사 제거·유사도 |
| `lib/noise.js` | 인사·부고·시황표 같은 항목 걸러내기 |
| `lib/cluster.js` | 같은 사건끼리 묶고 분야·중요도 매기기 |
| `lib/summarize.js` | Claude 요약 + 리드 문장 대체 |
| `lib/render.js` | HTML·RSS 만들기 |
| `lib/feed-json.js` | 오늘하이용 JSON·낭독 원고 |
| `build.mjs` | 전체 순서 (`--dry` / `--render-only` / `--out=`) |
| `scripts/morning.sh` | 이 맥이 매일 아침 부르는 실행 파일 |

## 보관 파일

`data/YYYY-MM-DD.json`은 하루에 하나씩 쌓인다 (약 60KB/일 — 1년에 22MB 남짓).
지난 아침 페이지를 **다시 그릴 수 있게** 남겨 두는 원본이라, 디자인을 바꾸면 과거 페이지도
같이 새 디자인으로 다시 만들어진다. 너무 무거워지면 오래된 파일부터 지우면 되고,
지운 날짜는 목록과 페이지에서 함께 사라진다.

## 피드 추가·교체

`config.js`의 `SOURCES`에 한 줄 넣으면 끝이다.

```js
{ id: 'seoul', name: '서울신문', url: '…/rss.xml', category: 'auto' },
```

`category`를 `'auto'`로 두면 제목·요약 키워드로 분야를 정한다.
종합면 피드는 `'auto'`가 맞다 (전자신문 Section901처럼 IT 전용이 아닌 경우가 많다).
죽은 피드는 빌드 로그에 `✗`로 남고 나머지로 계속 진행한다.

## 저작권

제목과 리드 문장만 각 언론사 공개 RSS에서 가져오고, 모든 항목은 원문으로 링크한다.
본문을 복제하지 않는다. 요약은 자동 생성물이라는 안내를 푸터에 항상 표시한다.
