// ─────────────────────────────────────────────────────────────
//  여기만 고치면 퀘스트 자동 생성 규칙 / 시간 / 집사 대사를 바꿀 수 있어요.
//  days: 0=일 1=월 2=화 3=수 4=목 5=금 6=토
// ─────────────────────────────────────────────────────────────

export const CATS = [
  { id: 'laundry', emoji: '🧺', name: '세탁소' },
  { id: 'architect', emoji: '🏢', name: '건축사' },
  { id: 'church', emoji: '⛪', name: '교회' },
  { id: 'tutor', emoji: '📚', name: '과외' },
  { id: 'youtube', emoji: '🎬', name: '유튜브' },
  { id: 'house', emoji: '🏠', name: '집안일' },
];
export const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));

/** 집안일만 남자친구와 공유(shared), 나머지는 개인(private) */
export const scopeOf = (cat) => (cat === 'house' ? 'home' : 'me');

export const REWARD = { xp: 10, gold: 5 };

const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL = [0, 1, 2, 3, 4, 5, 6];

export const TEMPLATES = [
  // 🧺 신데렐라세탁
  { id: 'ln_pick', cat: 'laundry', title: '세탁물 수거', memo: '신데렐라세탁', time: '10:00', days: [1, 2, 3, 4, 5, 6] },
  { id: 'ln_ship', cat: 'laundry', title: '세탁물 배송', memo: '신데렐라세탁', time: '16:00', days: [1, 2, 3, 4, 5, 6] },
  { id: 'ln_bill', cat: 'laundry', title: '주간 정산', memo: '신데렐라세탁', time: '20:00', days: [6] },

  // 🏢 건축사 사무소
  { id: 'ar_bid', cat: 'architect', title: '입찰 공고 확인', memo: '', time: '09:30', days: WEEKDAYS },
  { id: 'ar_mkt', cat: 'architect', title: '마케팅 업무 체크', memo: '', time: '14:00', days: WEEKDAYS },

  // ⛪ 교회 (화: 주일예배 복기 / 금: 수요예배 복기)
  { id: 'ch_sun', cat: 'church', title: '주일예배 복기 보고', memo: '교관님께', time: '12:00', days: [2] },
  { id: 'ch_wed', cat: 'church', title: '수요예배 복기 보고', memo: '교관님께', time: '12:00', days: [5] },

  // 📚 과외 (토·일)
  { id: 'tu_wj', cat: 'tutor', title: '김우진 과외', memo: '오전', time: '10:00', days: [6, 0] },
  { id: 'tu_dy', cat: 'tutor', title: '정도윤 과외', memo: '저녁', time: '19:00', days: [6, 0] },

  // 🎬 깡순이의 깡촌생활
  { id: 'yt_plan', cat: 'youtube', title: '주간 영상 기획', memo: '깡순이의 깡촌생활', time: '', days: [1] },
  { id: 'yt_up', cat: 'youtube', title: '영상 업로드 체크', memo: '깡순이의 깡촌생활', time: '', days: [4] },

  // 🏠 집안일 (남자친구와 공유)
  { id: 'hs_wash', cat: 'house', title: '세탁기 돌리기', memo: '', time: '19:00', days: WEEKDAYS },
  { id: 'hs_dry', cat: 'house', title: '건조기로 옮기기', memo: '', time: '21:00', days: WEEKDAYS },
  { id: 'hs_dish', cat: 'house', title: '설거지', memo: '', time: '21:30', days: ALL },
];

export function templatesFor(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return TEMPLATES.filter((t) => t.days.includes(dow));
}

export function todayKey(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// ── 레벨 ────────────────────────────────────────────────────
const levelNeed = (lv) => 40 + lv * 10; // Lv.1→2: 50xp(퀘스트 5개), 이후 점점 늘어남
export function levelInfo(totalXp) {
  let lv = 1;
  let rest = Math.max(0, totalXp || 0);
  let need = levelNeed(lv);
  while (rest >= need) {
    rest -= need;
    lv += 1;
    need = levelNeed(lv);
  }
  return { lv, cur: rest, need, pct: Math.round((rest / need) * 100) };
}

// ── 집사 대사 ───────────────────────────────────────────────
export const CHEERS = [
  '공주님, 오늘도 우아하게 한 걸음씩 가시지요.',
  '이 집사가 곁에서 지켜보고 있습니다, 공주님.',
  '작은 퀘스트도 모이면 왕국이 됩니다. 힘내세요!',
  '공주님의 금고가 두둑해지고 있습니다. 훌륭하세요!',
  '차 한 잔 드시고, 다음 퀘스트로 가 볼까요?',
];

export const DONE_LINES = [
  '역시 공주님! 깔끔하게 처리하셨군요 ✨',
  '훌륭합니다, 공주님! 골드가 쌓입니다 💰',
  '이 집사, 감동했습니다… 다음 퀘스트도 부탁드려요!',
];

export function getButlerLine(now, quests, tick = 0) {
  const h = now.getHours();
  const dow = now.getDay();
  const weekend = dow === 0 || dow === 6;
  const find = (tpl) => quests.find((q) => q.tpl === tpl);
  const pending = (tpl) => {
    const q = find(tpl);
    return !!q && !q.done;
  };
  const left = quests.filter((q) => !q.done).length;

  // 탭하면 응원 문구가 순환
  if (tick > 0) return CHEERS[(tick - 1) % CHEERS.length] + (left ? ` (남은 퀘스트 ${left}개)` : '');

  if ((dow === 2 || dow === 5) && h < 12 && (pending('ch_sun') || pending('ch_wed'))) {
    return '공주님! 12시 전까지 교관님께 교회 복기 보고 올리실 시간입니다!';
  }
  if ((dow === 2 || dow === 5) && h >= 12 && h < 18 && (pending('ch_sun') || pending('ch_wed'))) {
    return '공주님… 교회 복기 보고가 아직입니다. 지금이라도 올려 주세요!';
  }
  if (weekend && h < 14 && pending('tu_wj')) return '김우진 학생 과외 수업 시간입니다!';
  if (weekend && h >= 14 && h < 22 && pending('tu_dy')) return '정도윤 학생 과외 수업 준비하실 시간입니다!';
  if (!weekend && h >= 18) {
    if (find('hs_wash')?.done && pending('hs_dry')) return '세탁기 끝났다면 건조기로 옮기셔야 해요!';
    if (pending('hs_wash')) return '공주님, 오늘 빨래는 돌리셨나요? 세탁기부터 부탁드립니다!';
    if (pending('hs_dry')) return '세탁기 끝났다면 건조기로 옮기셔야 해요!';
  }
  if (!weekend && h >= 9 && h < 12 && pending('ar_bid')) return '입찰 공고 확인부터 하시지요, 공주님!';

  if (quests.length > 0 && left === 0) return '오늘의 퀘스트를 모두 완료하셨습니다! 푹 쉬세요, 공주님 ✨';

  const tail = left ? ` 남은 퀘스트는 ${left}개입니다.` : '';
  if (h < 5) return '공주님, 아직 깨어 계십니까? 이제 그만 주무시지요 🌙';
  if (h < 9) return `좋은 아침입니다, 공주님! 오늘도 우아하게 시작하시지요.${tail}`;
  if (h < 12) return `공주님, 오전 일과를 시작해 볼까요?${tail}`;
  if (h < 14) return `점심은 드셨습니까, 공주님? 든든히 드셔야 합니다.${tail}`;
  if (h < 18) return `오후도 힘내십시오, 공주님!${tail}`;
  if (h < 22) return `수고 많으셨습니다, 공주님. 저녁 퀘스트를 확인해 볼까요?${tail}`;
  return `하루 고생하셨습니다, 공주님. 곧 쉬실 시간입니다 🌙${tail}`;
}
