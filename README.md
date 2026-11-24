# 👑 로판의 한나씨 · 집사 비서 (PWA)

React + Vite + Firebase(Firestore). 모바일 한 화면에 스크롤 없이 들어오는 1줄 퀘스트 리스트.

## 1. 실행

```bash
npm install
npm run dev        # 휴대폰 같은 와이파이에서 http://내PC주소:5173
```

`src/firebase.js`를 고치기 전에도 **로컬 모드**(이 기기에만 저장)로 바로 돌아갑니다.

## 2. Firebase 연결 (3분)

1. [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 만들기 → **웹 앱 추가(</>)**
2. 나온 설정값을 `src/firebase.js`의 `firebaseConfig`에 붙여넣기 (이 파일만 수정하면 됩니다)
3. **빌드 → Firestore Database → 데이터베이스 만들기** (프로덕션 모드, 서울 `asia-northeast3` 추천)
4. **Firestore → 규칙** 탭에 `firestore.rules` 내용을 붙여넣고 게시

## 3. Vercel 배포

```bash
npm i -g vercel
vercel          # 프레임워크는 Vite 자동 인식 (Build: npm run build / Output: dist)
```
또는 GitHub에 올린 뒤 Vercel에서 Import 하면 끝. 배포 후 휴대폰 브라우저에서
**홈 화면에 추가**하면 앱처럼 실행됩니다.

## 4. 남자친구와 집안일 공유

상단 상태바 오른쪽 **🔗** 버튼을 누르면 공유 링크가 복사됩니다.
남자친구가 그 링크(`/?home=코드`)로 한 번 접속하면 🏠 집안일 퀘스트만 실시간으로 같이 체크돼요.
(다른 카테고리·레벨·골드·아이디어는 각자 개인 데이터입니다.)

## 5. 사용법

| 동작 | 방법 |
|---|---|
| 퀘스트 완료 | 왼쪽 체크박스 (XP +10, 골드 +5, 축하 알림 / 다시 누르면 취소) |
| 집사 응원 문구 바꾸기 | 말풍선 탭 |
| 아이디어 저장 | 하단 입력창에 적고 💡 (카테고리는 입력창 왼쪽 아이콘) |
| 바로 오늘 퀘스트로 추가 | 하단 입력창에 적고 ⚔️ |
| 메모함 → 오늘의 퀘스트 | 📥 버튼 → 항목의 **→ 오늘** |
| 퀘스트 삭제 | 줄 오른쪽 ✕ |

## 6. 내 일정에 맞게 고치기

`src/schedule.js` 한 파일에 모두 모여 있어요.

- `TEMPLATES` : 요일별 자동 생성 규칙 (`days`: 0=일 … 6=토, `time` 수정 가능)
  - 과외 시간(10:00 / 19:00), 세탁소·유튜브 요일은 임의로 잡아 둔 값이니 실제 일정에 맞게 바꿔 주세요.
- `getButlerLine()` : 시간·요일별 집사 대사
- `REWARD`, `levelNeed` : 경험치/골드/레벨업 속도

## 파일 구조

```
public/  butler.png(집사) · icon-*.png · manifest.webmanifest · sw.js
src/
  firebase.js   ← Firebase 설정값만 넣는 곳
  db.js         Firestore / 로컬 모드 데이터 계층
  schedule.js   카테고리·자동 생성·집사 대사·레벨 규칙
  App.jsx       화면
  styles.css    네이비·골드·크림 도트 UI
firestore.rules · vercel.json
```

## 참고

- 로그인 없이 "긴 랜덤 ID 링크"로 구분하는 방식이라 링크를 아는 사람만 접근할 수 있어요. 링크는 남에게 공유하지 마세요.
- 도트 폰트는 CDN(Galmuri)에서 불러오며, 실패하면 시스템 폰트로 대체됩니다.
