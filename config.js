// 아침 7시 — 사이트/수집 설정
// 피드를 추가하려면 SOURCES에 { id, name, url, category } 한 줄만 넣으면 된다.
// 죽은 피드는 수집 단계에서 조용히 건너뛴다 (build 로그에 남음).

export const SITE = {
  name: '아침 7시',
  tagline: '밤사이 세상 이야기를, 매일 아침 7시에 정리해 드려요.',
  description:
    '매일 아침 7시, 밤사이 쏟아진 뉴스를 주제별로 묶어 한눈에 읽히게 정리하는 뉴스 브리핑.',
  // 절대 주소(canonical·사이트맵·RSS)에만 쓴다. 페이지 안의 링크는 모두 상대경로라
  // 루트에 올리든 /news/ 아래에 올리든 그대로 동작한다.
  url: (process.env.SITE_URL || 'https://inno-hi-inc.github.io/oneul-news').replace(/\/+$/, ''),
  locale: 'ko_KR',
  timezone: 'Asia/Seoul',
  publishHour: 7, // 매일 아침 7시 기준으로 "밤사이"를 자른다
  author: '오늘하이',
};

// 화면에 보여줄 카테고리 순서와 라벨
export const CATEGORIES = [
  { id: 'headline', label: '오늘의 머리기사', emoji: '☀️', max: 5 },
  { id: 'politics', label: '정치', emoji: '🏛', max: 4 },
  { id: 'economy', label: '경제·산업', emoji: '📈', max: 5 },
  { id: 'society', label: '사회', emoji: '🏙', max: 4 },
  { id: 'world', label: '세계', emoji: '🌏', max: 4 },
  { id: 'tech', label: 'IT·과학', emoji: '🔬', max: 3 },
  { id: 'life', label: '문화·생활', emoji: '🎬', max: 3 },
  { id: 'sports', label: '스포츠', emoji: '⚽️', max: 3 },
];

export const SOURCES = [
  // 연합뉴스 — 국가 기간통신사. 카테고리 피드가 요약문(리드 문장)과 사진을 함께 준다.
  { id: 'yna-politics', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/politics.xml', category: 'politics' },
  { id: 'yna-economy', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/economy.xml', category: 'economy' },
  { id: 'yna-industry', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/industry.xml', category: 'economy' },
  { id: 'yna-society', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/society.xml', category: 'society' },
  { id: 'yna-intl', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/international.xml', category: 'world' },
  { id: 'yna-nk', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/northkorea.xml', category: 'politics' },
  { id: 'yna-culture', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/culture.xml', category: 'life' },
  { id: 'yna-ent', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/entertainment.xml', category: 'life' },
  { id: 'yna-sports', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/sports.xml', category: 'sports' },
  { id: 'yna-health', name: '연합뉴스', url: 'https://www.yna.co.kr/rss/health.xml', category: 'auto' },

  // 다른 신문사 — 같은 사건을 몇 군데가 함께 다뤘는지 세기 위한 교차 확인용.
  { id: 'donga', name: '동아일보', url: 'https://rss.donga.com/total.xml', category: 'auto' },
  { id: 'khan', name: '경향신문', url: 'https://www.khan.co.kr/rss/rssdata/total_news.xml', category: 'auto' },
  { id: 'hani', name: '한겨레', url: 'https://www.hani.co.kr/rss', category: 'auto' },
  { id: 'nocut', name: '노컷뉴스', url: 'https://rss.nocutnews.co.kr/nocutnews.xml', category: 'auto' },
  // 전자신문 Section901은 IT 전용이 아니라 종합면이라 키워드로 분류한다.
  { id: 'etnews', name: '전자신문', url: 'https://rss.etnews.com/Section901.xml', category: 'auto' },
];

// category: 'auto' 인 피드는 제목/요약 키워드로 분류한다.
export const AUTO_RULES = [
  // 여기 있는 낱말은 **그 분야에서만** 쓰이는 것이어야 한다.
  // '통신'(AP통신·전기통신금융사기), '기업', '선수' 같은 두루 쓰이는 말을 넣으면
  // 엉뚱한 기사가 딸려 온다 — 실제로 보이스피싱 판결이 IT면으로 샜었다.
  ['politics', ['대통령', '대통령실', '국회', '여당', '야당', '국민의힘', '더불어민주당', '조국혁신당',
    '개혁신당', '장관 후보자', '국무회의', '총리', '개각', '인사청문', '선거', '의원', '외교부', '통일부',
    '북한', '김정은', '국정원', '개헌', '탄핵', '국정감사', '당대표', '원내대표', '정부조직', '특검']],

  ['economy', ['증시', '코스피', '코스닥', '환율', '기준금리', '한국은행', '소비자물가', '부동산', '집값',
    '분양', '수출', '무역수지', '관세', '기획재정부', '예산안', '종부세', '세제개편', '고용률', '실업률',
    '자사주', '공정거래위원회', '공정위', '인수합병', '상장', '실적', '영업이익', '순이익', '수주', '공시',
    '삼성전자', 'SK하이닉스', '현대차', '롯데', '한화', '포스코', '금융위']],

  ['tech', ['인공지능', 'AI 반도체', '반도체', '엔비디아', '미디어텍', '파운드리', '팹리스', 'MLCC',
    '데이터센터', '클라우드', '챗GPT', '오픈AI', '네이버', '카카오', '구글', '애플', '로봇', '자율주행',
    '우주', '위성', '발사체', '연구진', '논문', '학회', '백신', '치료제', '임상시험', '신약',
    '이동통신', '통신사', '5G', '6G', '해킹', '사이버', '개인정보 유출', '스타트업']],

  ['world', ['백악관', '트럼프', '시진핑', '푸틴', '젤렌스키', '유엔', '나토', 'EU', '유럽연합',
    '워싱턴', '베이징', '도쿄', '모스크바', '우크라이나', '이스라엘', '가자지구', '이란', '호르무즈',
    '현지시간', '외신', '특파원', '국제사회', '정상회담', '무역전쟁']],

  ['society', ['경찰', '검찰', '대검', '지검', '법원', '지법', '고법', '대법원', '재판부', '선고',
    '징역', '기소', '구속', '영장', '혐의', '피해자', '보이스피싱', '사기', '살해', '폭행', '학대',
    '사고', '화재', '지진', '태풍', '호우', '폭염', '한파', '교육부', '학교', '병원', '의료', '전공의',
    '노조', '파업', '집회', '아파트', '지하철', '소방']],

  ['sports', ['프로야구', 'KBO', 'MLB', '프로축구', 'K리그', '손흥민', '이강인', '국가대표팀',
    '월드컵', '올림픽', '아시안게임', 'PGA', 'LPGA', 'KLPGA', '프로농구', '프로배구', 'EPL',
    '결승전', '홈런', '득점', '우승', '준우승', '금메달', '은메달', '동메달', '감독 선임']],

  ['life', ['영화', '드라마', '배우', '가수', '아이돌', '앨범', '음원', '빌보드', '멜론', '넷플릭스',
    '박스오피스', '공연', '전시회', '뮤지컬', '축제', '문화재', '국가유산', '여행', '관광', '맛집',
    '레시피', '추석', '설날', '명절']],
];
