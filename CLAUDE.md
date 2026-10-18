# 라이더 가계부 (웹)

배달 라이더용 가계부. `index.html` 한 파일에 화면·로직이 다 있고, GitHub Pages(main 루트)로 배포되는 PWA예요.
폰에서는 네이티브 앱(별도 비공개 저장소)이 이 페이지를 WebView로 열고 `window.RiderNative`로 폰 기능을 붙여요.

## 반드시 지킬 것
- **공개 저장소예요.** 실제 금액·잔액·사람 이름·가게 이름·계좌번호를 코드, 주석, 커밋 메시지에 넣지 마세요. 예시는 가짜 값으로.
- **`index.html`을 고치면 `sw.js`의 `VERSION`을 꼭 올리세요** (`"YYYY-MM-DD.N"`). 안 올리면 폰에 옛 화면이 남아요.
  서비스 워커는 HTML을 네트워크 우선(4초 대기)으로 받고 skipWaiting + controllerchange 새로고침을 해요. 캐시 우선으로 되돌리지 마세요.
- 배포는 `/deploy-ledger` 스킬로 하세요 (VERSION 올리기 → 커밋 → push → Pages 반영 확인).

## 이 PC에서 git 쓰는 법 (Windows)
- git은 PATH에 없어요: `D:\Git\cmd\git.exe`
- 소유자 SID가 달라서 매번 `-c safe.directory=D:/projects/mini-apps/rider-ledger`가 필요해요.
- PowerShell 5.1에서 따옴표가 들어간 커밋 메시지는 here-string이 깨져요. 메시지는 파일에 써서 `commit -F <파일>`로.
- push는 `$env:GCM_INTERACTIVE='never'`로 (로그인 창이 뜨지 않게).

## 코드 구조 메모
- 데이터: localStorage `rider-ledger-v1` = `{months:{YYYY-MM:[entries]}, settings}`. Firebase(Firestore)로 폰↔PC 동기화(`users/{uid}/months/*`, `meta/settings`).
- entry type: `in`(src baemin|coupang|shop, 정산 대기면 `pending`) · `out`(cat) · `xfer`(from/to) · `settle`(실제 입금) · `bal`(그 시각 통장 잔액, 숨김).
- `acctBalances()`는 시간순으로 더하고 `bal`이 있으면 그 값으로 맞춰요.
- 돈 나누기: `settings.budget` (roles, fixed[{name,amount,day}], 비율, `splitWeekday`/`splitDays`). `computeSplit()`·`splitPool()`·`fixedDueBeforeNext()`.
- 은행 알림 처리: `processBank()` → 배민 정산 `autoSettle`, 가게 입금 `shopDeposit`, 카드 결제 자동 지출, 중복 방지(`sameOutRecorded`, `crossOut`, `xferCovered`).
- 브리지 함수는 **인자 개수를 정확히** 맞춰야 불려요 (`NATIVE.undo()`처럼).
- 사용자가 화면을 단순하게 유지하길 원해요. 매일 보는 화면은 단순하게, 자동·백그라운드 기능 위주로.

## 테스트
- 로컬 서버: `.claude/launch.json`의 `ledger` (PowerShell HttpListener, 포트 8765).
- 폰 기능은 가짜 `window.RiderNative`를 넣어서 시험해요 (`ledger-tester` 에이전트 참고). 테스트 후 localStorage는 비우세요.
- 사용자의 실제 가계부(로그인된 사이트)는 분석·변경을 요청받았을 때만 열고, 비밀번호는 절대 입력하지 않아요.
