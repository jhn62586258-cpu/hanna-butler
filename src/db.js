// 데이터 계층: Firestore(설정 완료 시) 또는 localStorage(로컬 모드)를 같은 API로 제공합니다.
//
//  scope 'me'   → private/{meId}/...   공주님 개인 (퀘스트, 아이디어, 레벨/골드)
//  scope 'home' → shared/{homeId}/...  집안일 (같은 링크로 접속한 사람끼리 실시간 공유)
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where, increment } from 'firebase/firestore';
import { db, isConfigured } from './firebase';

export const mode = isConfigured ? 'cloud' : 'local';

const LS = window.localStorage;

function rid() {
  const raw = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '');
  return raw.slice(0, 20);
}
export const newId = rid;

function stableId(key) {
  let v = LS.getItem(key);
  if (!v) {
    v = rid();
    LS.setItem(key, v);
  }
  return v;
}

// ?home=코드 로 접속하면 그 집안일 방에 참여합니다.
const params = new URLSearchParams(window.location.search);
const urlHome = params.get('home');
if (urlHome && /^[A-Za-z0-9_-]{6,64}$/.test(urlHome)) {
  LS.setItem('hanna.home', urlHome);
}
if (params.has('home')) window.history.replaceState(null, '', window.location.pathname);

export const meId = stableId('hanna.me');
export const homeId = stableId('hanna.home');
export const shareLink = `${window.location.origin}/?home=${homeId}`;

const roots = {
  me: ['private', meId],
  home: ['shared', homeId],
};

// ── Firestore 경로 ───────────────────────────────────────────
const colRef = (scope, c) => collection(db, roots[scope][0], roots[scope][1], c);
const docRef = (scope, c, id) => doc(db, roots[scope][0], roots[scope][1], c, id);

// ── 로컬 모드 저장소 ─────────────────────────────────────────
const listeners = new Set();
const lkey = (scope, c) => `hanna.local.${roots[scope].join('.')}.${c}`;
const readLocal = (scope, c) => {
  try {
    return JSON.parse(LS.getItem(lkey(scope, c)) || '{}');
  } catch {
    return {};
  }
};
const writeLocal = (scope, c, obj) => {
  LS.setItem(lkey(scope, c), JSON.stringify(obj));
  listeners.forEach((f) => f());
};

// ── 공개 API ─────────────────────────────────────────────────
/** 컬렉션 구독. eq=[필드, 값] 이면 해당 값과 같은 문서만. 구독 해제 함수를 반환. */
export function subscribe(scope, c, cb, onErr, eq) {
  if (mode === 'cloud') {
    const base = colRef(scope, c);
    const q = eq ? query(base, where(eq[0], '==', eq[1])) : base;
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.error('[firestore]', err);
        onErr?.(err);
      },
    );
  }
  const emit = () => {
    let arr = Object.entries(readLocal(scope, c)).map(([id, v]) => ({ id, ...v }));
    if (eq) arr = arr.filter((x) => x[eq[0]] === eq[1]);
    cb(arr);
  };
  listeners.add(emit);
  queueMicrotask(emit);
  return () => listeners.delete(emit);
}

/** 문서 생성/병합 저장 (없으면 만들고, 있으면 필드만 갱신) */
export function put(scope, c, id, data) {
  if (mode === 'cloud') {
    setDoc(docRef(scope, c, id), data, { merge: true }).catch((e) => console.error('[put]', e));
    return;
  }
  const all = readLocal(scope, c);
  all[id] = { ...(all[id] || {}), ...data };
  writeLocal(scope, c, all);
}

export function del(scope, c, id) {
  if (mode === 'cloud') {
    deleteDoc(docRef(scope, c, id)).catch((e) => console.error('[del]', e));
    return;
  }
  const all = readLocal(scope, c);
  delete all[id];
  writeLocal(scope, c, all);
}

/** 숫자 필드 증감 (경험치·골드). 두 기기에서 동시에 올려도 안전합니다. */
export function bump(scope, c, id, deltas) {
  if (mode === 'cloud') {
    const inc = Object.fromEntries(Object.entries(deltas).map(([k, v]) => [k, increment(v)]));
    setDoc(docRef(scope, c, id), inc, { merge: true }).catch((e) => console.error('[bump]', e));
    return;
  }
  const all = readLocal(scope, c);
  const cur = { ...(all[id] || {}) };
  for (const [k, v] of Object.entries(deltas)) cur[k] = (cur[k] || 0) + v;
  all[id] = cur;
  writeLocal(scope, c, all);
}
