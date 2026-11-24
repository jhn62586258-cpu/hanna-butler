import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATS, CAT_BY_ID, REWARD, DONE_LINES, scopeOf, templatesFor, levelInfo, getButlerLine, todayKey } from './schedule';
import { subscribe, put, del, bump, newId, meId, shareLink, mode } from './db';

/** 컬렉션 실시간 구독 훅 */
function useCollection(scope, col, eq) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const eqKey = eq ? eq.join('|') : '';
  useEffect(() => {
    setLoaded(false);
    return subscribe(
      scope,
      col,
      (arr) => {
        setItems(arr);
        setLoaded(true);
        setError(false);
      },
      () => {
        setLoaded(true);
        setError(true);
      },
      eq,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, col, eqKey]);
  return { items, loaded, error };
}

export default function App() {
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState('all');
  const [tick, setTick] = useState(0); // 말풍선 탭 → 응원 문구
  const [flash, setFlash] = useState(''); // 퀘스트 완료 직후 집사 한마디
  const [toast, setToast] = useState(null); // {text, kind}
  const [sheet, setSheet] = useState(false);
  const [text, setText] = useState('');
  const [inCat, setInCat] = useState(() => localStorage.getItem('hanna.lastCat') || 'youtube');

  const toastTimer = useRef(null);
  const flashTimer = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const date = todayKey(now);

  const mine = useCollection('me', 'quests', ['date', date]);
  const home = useCollection('home', 'quests', ['date', date]);
  const ideasC = useCollection('me', 'ideas');
  const playerC = useCollection('me', 'player');

  const quests = useMemo(() => [...mine.items, ...home.items], [mine.items, home.items]);
  const ideas = useMemo(() => [...ideasC.items].sort((a, b) => (b.ts || 0) - (a.ts || 0)), [ideasC.items]);
  const player = playerC.items.find((p) => p.id === 'state') || {};
  const xp = Math.max(0, player.xp || 0);
  const gold = Math.max(0, player.gold || 0);
  const lv = levelInfo(xp);

  const showToast = useCallback((t, kind = 'ok', ms = 2200) => {
    setToast({ text: t, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  // 첫 접속 안내 (Firebase 미설정 시)
  useEffect(() => {
    if (mode === 'local') showToast('💾 Firebase 설정 전이라 이 기기에만 저장돼요', 'ok', 3500);
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(flashTimer.current);
    };
  }, [showToast]);

  // ── 요일별 자동 생성 (하루 1회, 기기당) ────────────────────
  useEffect(() => {
    if (!mine.loaded || !home.loaded) return;
    const key = `hanna.seeded.${date}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    const existing = new Set(quests.map((q) => q.id));
    templatesFor(date).forEach((t) => {
      const id = `${date}_${t.id}`;
      if (existing.has(id)) return;
      put(scopeOf(t.cat), 'quests', id, {
        title: t.title,
        cat: t.cat,
        memo: t.memo,
        time: t.time,
        date,
        tpl: t.id,
        ts: Date.now(),
      });
    });
    // 예전 날짜 키 정리
    Object.keys(localStorage)
      .filter((k) => k.startsWith('hanna.seeded.') && k !== key)
      .forEach((k) => localStorage.removeItem(k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine.loaded, home.loaded, date]);

  // ── 퀘스트 체크 ───────────────────────────────────────────
  const toggle = (q) => {
    const done = !q.done;
    put(scopeOf(q.cat), 'quests', q.id, { done, doneAt: done ? Date.now() : null, doneBy: done ? meId : null });
    if (navigator.vibrate) navigator.vibrate(done ? 18 : 6);
    if (done) {
      bump('me', 'player', 'state', { xp: REWARD.xp, gold: REWARD.gold });
      const up = levelInfo(xp + REWARD.xp).lv > lv.lv;
      if (up) showToast(`👑 LEVEL UP! 공주님 Lv.${lv.lv + 1} 달성!`, 'up', 3000);
      else showToast(`🎉 퀘스트 완료!  +${REWARD.xp}XP  +${REWARD.gold}G`);
      setFlash(DONE_LINES[Math.floor(Math.random() * DONE_LINES.length)]);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(''), 4500);
    } else if (q.doneBy === meId) {
      bump('me', 'player', 'state', { xp: -REWARD.xp, gold: -REWARD.gold });
    }
  };

  const removeQuest = (q) => {
    if (window.confirm(`"${q.title}" 퀘스트를 삭제할까요?`)) del(scopeOf(q.cat), 'quests', q.id);
  };

  // ── 하단 빠른 메모 ────────────────────────────────────────
  const pickCat = (v) => {
    setInCat(v);
    localStorage.setItem('hanna.lastCat', v);
  };
  const saveIdea = () => {
    const t = text.trim();
    if (!t) return;
    put('me', 'ideas', newId(), { text: t, cat: inCat, ts: Date.now() });
    setText('');
    showToast('💡 아이디어 메모함에 저장!');
  };
  const addQuestNow = () => {
    const t = text.trim();
    if (!t) return;
    put(scopeOf(inCat), 'quests', newId(), { title: t, cat: inCat, memo: '', time: '', date, tpl: null, ts: Date.now() });
    setText('');
    showToast('⚔️ 오늘의 퀘스트에 추가!');
  };
  const moveIdea = (idea) => {
    put(scopeOf(idea.cat), 'quests', newId(), {
      title: idea.text,
      cat: idea.cat,
      memo: '아이디어',
      time: '',
      date,
      tpl: null,
      ts: Date.now(),
    });
    del('me', 'ideas', idea.id);
    showToast('⚔️ 오늘의 퀘스트로 옮겼어요!');
  };
  const removeIdea = (idea) => del('me', 'ideas', idea.id);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      showToast(mode === 'cloud' ? '🔗 집안일 공유 링크 복사됨! 남자친구에게 보내세요' : '🔗 링크 복사됨 (Firebase 설정 후 공유 가능)', 'ok', 3000);
    } catch {
      window.prompt('이 링크를 남자친구에게 보내세요', shareLink);
    }
  };

  // ── 표시용 계산 ───────────────────────────────────────────
  const sorted = useMemo(
    () =>
      [...quests].sort(
        (a, b) =>
          Number(!!a.done) - Number(!!b.done) ||
          (a.time || '99:99').localeCompare(b.time || '99:99') ||
          (a.ts || 0) - (b.ts || 0),
      ),
    [quests],
  );
  const shown = tab === 'all' ? sorted : sorted.filter((q) => q.cat === tab);
  const leftBy = (id) => quests.filter((q) => !q.done && (id === 'all' || q.cat === id)).length;
  const doneCount = quests.filter((q) => q.done).length;
  const line = flash || getButlerLine(now, quests, tick);
  const syncing = mine.error || home.error;

  return (
    <div className="app">
      {toast && (
        <div className={`toast ${toast.kind === 'up' ? 'up' : ''}`} key={toast.text + toast.kind}>
          {toast.text}
        </div>
      )}

      {/* 1. 집사 브리핑 */}
      <header className="hero">
        <div className="avatar">
          <img src="/butler.png" alt="집사" />
        </div>
        <div className="hero-r">
          <div className="status px">
            <b className="lvl">공주님 Lv.{lv.lv}</b>
            <span className="xpbar" title={`${lv.cur}/${lv.need} XP`}>
              <i style={{ width: `${lv.pct}%` }} />
            </span>
            <span className="gold">💰{gold}</span>
            <span className="prog">
              {doneCount}/{quests.length}
            </span>
            <button className="mini" onClick={copyLink} title="집안일 공유 링크 복사">
              {syncing ? '⚠️' : mode === 'cloud' ? '🔗' : '💾'}
            </button>
          </div>
          <div className="bubble px" onClick={() => setTick((t) => t + 1)} role="button">
            {line}
          </div>
        </div>
      </header>

      {/* 2. 카테고리 탭 */}
      <nav className="tabs">
        {[{ id: 'all', emoji: '📋', name: '전체' }, ...CATS].map((c) => (
          <button key={c.id} className={`tab ${tab === c.id ? 'on' : ''}`} onClick={() => setTab(c.id)}>
            <span className="te">{c.emoji}</span>
            <span className="tn">{c.name}</span>
            {leftBy(c.id) > 0 && <span className="cnt">{leftBy(c.id)}</span>}
          </button>
        ))}
      </nav>

      {/* 퀘스트 1줄 리스트 */}
      <main className="list px">
        {shown.length === 0 ? (
          <p className="empty">
            {mine.loaded && home.loaded ? '오늘은 쉬어가셔도 좋아요, 공주님 🌙' : '퀘스트를 불러오는 중…'}
          </p>
        ) : (
          <ul>
            {shown.map((q) => {
              const cat = CAT_BY_ID[q.cat] || CATS[0];
              return (
                <li key={q.id} className={`row ${q.done ? 'done' : ''}`}>
                  <button className="chk" onClick={() => toggle(q)} aria-label={q.done ? '완료 취소' : '완료'}>
                    {q.done ? '✔' : ''}
                  </button>
                  <span className={`badge c-${q.cat}`}>
                    {cat.emoji}
                    {cat.name}
                  </span>
                  <span className="title">
                    {q.title}
                    {q.memo ? <em>{q.memo}</em> : null}
                  </span>
                  <span className="meta">{q.time}</span>
                  <button className="x" onClick={() => removeQuest(q)} aria-label="삭제">
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* 3. 하단 빠른 메모 */}
      <form
        className="bar"
        onSubmit={(e) => {
          e.preventDefault();
          saveIdea();
        }}
      >
        <button type="button" className="inbox" onClick={() => setSheet(true)} title="아이디어 메모함">
          📥<b>{ideas.length}</b>
        </button>
        <select value={inCat} onChange={(e) => pickCat(e.target.value)} aria-label="카테고리">
          {CATS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji}
            </option>
          ))}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="떠오른 생각을 적어 두세요…"
          enterKeyHint="send"
        />
        <button type="submit" className="go" title="아이디어 메모함에 저장">
          💡
        </button>
        <button type="button" className="go" onClick={addQuestNow} title="바로 오늘의 퀘스트로 추가">
          ⚔️
        </button>
      </form>

      {/* 아이디어 메모함 */}
      {sheet && (
        <div className="backdrop" onClick={() => setSheet(false)}>
          <section className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>
              📥 아이디어 메모함 <small>{ideas.length}개</small>
              <button className="close" onClick={() => setSheet(false)}>
                ✕
              </button>
            </h2>
            {ideas.length === 0 ? (
              <p className="empty">아직 비어 있어요. 아래 입력창에 💡로 저장해 보세요!</p>
            ) : (
              <ul>
                {ideas.map((i) => {
                  const cat = CAT_BY_ID[i.cat] || CATS[0];
                  return (
                    <li key={i.id} className="idea">
                      <span className={`badge c-${i.cat}`}>
                        {cat.emoji}
                        {cat.name}
                      </span>
                      <span className="title">{i.text}</span>
                      <button className="move" onClick={() => moveIdea(i)}>
                        → 오늘
                      </button>
                      <button className="x" onClick={() => removeIdea(i)} aria-label="삭제">
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
