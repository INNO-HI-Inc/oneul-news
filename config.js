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
  ['politics', ['대통령', '국회', '여당', '야당', '국민의힘', '더불어민주당', '장관', '청와대', '대통령실', '총리', '선거', '의원', '외교부', '통일부', '북한', '개헌', '탄핵', '국정감사']],
  ['economy', ['증시', '코스피', '코스닥', '환율', '금리', '한국은행', '물가', '부동산', '집값', '분양', '수출', '반도체', '삼성전자', 'SK하이닉스', '현대차', '기업', '주가', '실적', '투자', '기획재정부', '세금', '연봉', '고용', '취업', '무역', '관세']],
  ['tech', ['AI', '인공지능', '반도체', '로봇', '우주', '위성', '과학', '연구진', '논문', '백신', '치료제', '임상', '통신', '5G', '6G', '플랫폼', '네이버', '카카오', '구글', '애플', '엔비디아', '오픈AI', '데이터센터', '해킹', '보안']],
  ['world', ['미국', '중국', '일본', '러시아', '우크라이나', '유럽', '트럼프', '시진핑', '푸틴', '유엔', 'EU', '중동', '이스라엘', '가자', '대만', '인도', '베트남', '외신']],
  ['sports', ['프로야구', 'KBO', '손흥민', '이강인', '축구', '야구', '골프', '올림픽', '월드컵', 'K리그', 'MLB', '농구', '배구', '감독', '선수', '우승', '결승']],
  ['life', ['영화', '드라마', '배우', '가수', '아이돌', 'BTS', '공연', '전시', '넷플릭스', '음원', '앨범', '박스오피스', '축제', '요리', '여행', '건강', '날씨']],
  ['society', ['경찰', '검찰', '법원', '재판', '구속', '사고', '화재', '지진', '태풍', '폭우', '교육', '학교', '병원', '의료', '노조', '파업', '시위', '지하철', '아파트', '시민']],
];
