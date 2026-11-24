// ─────────────────────────────────────────────────────────────
//  여기에 Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)의 설정값만 붙여 넣으세요.
//  값이 'YOUR_...' 그대로면 앱은 "로컬 모드"(이 기기에만 저장)로 동작합니다.
// ─────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyA_gDyN72AUenesy9uXphu4YEcu7g1swo0",
  authDomain: "hanna-butler.firebaseapp.com",
  projectId: "hanna-butler",
  storageBucket: "hanna-butler.firebasestorage.app",
  messagingSenderId: "277692815772",
  appId: "1:277692815772:web:984bfda4dfdbfc0002d059",
  measurementId: "G-J1KVHVER7R"
};

export const isConfigured =
  !String(firebaseConfig.apiKey).startsWith('YOUR_') && !String(firebaseConfig.projectId).startsWith('YOUR_');

// 오프라인 캐시 포함 (지하철·엘리베이터에서도 체크 가능, 연결되면 자동 동기화)
export const db = isConfigured
  ? initializeFirestore(initializeApp(firebaseConfig), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null;