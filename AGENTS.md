# AGENTS.md

## 개요
- **프로젝트 목적**: 전자상거래 스토어(카페24, 고도몰, 아임웹, Shopify 등)에 삽입하는 웹 SDK를 제공하여, 페이지에 플로팅 버튼과 채팅(iframe)을 띄우고 사용자 이벤트/로그를 수집합니다.
- **핵심 산출물**: `webpack` 빌드로 생성되는 UMD 번들(JS/CSS). 각 플랫폼별 엔트리에서 동일한 코어 UX 패턴을 공유하되, 파트너/몰 식별과 API 연동 로직이 상이합니다.

## 디렉토리/파일 구조 하이라이트
- `src/`
  - `floating-sdk.js`: 기본(일반) 웹용 플로팅 SDK 엔트리. 글로벌 `GentooIO` 큐 API를 노출하고, 채팅 iframe/플로팅 버튼 UI를 생성.
  - `floating-sdk-*.js`: 플랫폼별 엔트리.
    - `floating-sdk-cafe24-glacier.js`: 카페24(Glacier)용. `CAFE24API` 사용, 장바구니 추가 등 일부 상호작용 지원.
    - `floating-sdk-cafe24-sidepanel.js`: 카페24 사이드패널 버전. 열릴 때 우측 패널 푸시 레이아웃 적용/복원.
    - `floating-sdk-godomall.js`: 고도몰용. `GodomallSDK` 사용. 회원/비회원 처리, 파트너/유저 토큰 설정.
    - `floating-sdk-imweb.js`: 아임웹용. `UNIT_CODE`, `MEMBER_UID`를 활용.
  - `apis/chatConfig.js`: 서버 API 호출 유틸 집합
    - 파트너/챗봇/부트/이벤트/플로팅 데이터 조회, `postChatUserId`, `postChatEventLog`, 각 플랫폼의 `get*PartnerId` 등
  - `logger.js`: 페이지 전환/스크롤/플로팅 이벤트 등을 `sendBeacon` 또는 API로 전송하는 로거 SDK. 글로벌 `GentooLogger` 큐 API 제공.
  - `*.css`: 각 타깃별 스타일.
- `webpack.config.js`: 멀티 타깃 빌드 설정. 각 엔트리를 UMD 라이브러리로 `dist/<target>/*.js`에 출력.
- `dist/`: 빌드 산출물. 배포/테스트에서 직접 참조 가능.
- `test*.html`, `index.html`: 로컬 테스트/데모 페이지.
- 루트의 `sdk-*.js`, `floating-button-*.js`: 과거/배포용 번들(히스토릭). 신규 개발은 `src/` + `webpack` 경로 기준 권장.

## 빌드/배포
- 스크립트(`package.json`)
  - `build:dev`/`build:stage`/`build:prod` → `webpack` 멀티 번들 빌드
  - `deploy` → `public/`를 `gh-pages` 배포
- 출력 매핑(`webpack.config.js`)
  - gentoo: `src/floating-sdk.js` → `dist/gentoo/floating.js`
  - cafe24(glacier): `src/floating-sdk-cafe24-glacier.js` → `dist/cafe24/floating-cafe24-glacier.js`
  - cafe24(sidepanel): `src/floating-sdk-cafe24-sidepanel.js` → `dist/cafe24-sidepanel/floating-cafe24-sidepanel.js`
  - godomall: `src/floating-sdk-godomall.js` → `dist/godomall/floating-godomall.js`
  - imweb: `src/floating-sdk-imweb.js` → `dist/imweb/*` (CSS만, JS 번들 출력은 config 대상에서 제외된 상태일 수 있음)
  - logger: `src/logger.js` → `dist/logger/gentoo-logger.js`

## 환경변수(.env)
- `webpack.DefinePlugin`으로 `process.env.*`가 번들에 인라인됩니다. 모드에 따라 `.env.development` 또는 `.env.production`를 로드.
- 주요 키(예시)
  - API 베이스: `API_MAIN_BASE_URL`, `API_CHAT_BASE_URL`, `API_TRACKER_BASE_URL`
  - 엔드포인트: `API_PARTNERID_ENDPOINT`, `API_GODOMALL_PARTNERID_ENDPOINT`, `API_IMWEB_PARTNERID_ENDPOINT`, `API_CHATBOT_ENDPOINT`, `API_FLOATING_ENDPOINT`, `API_BOOTCONFIG_ENDPOINT`, `API_AUTH_CAFE24_ENDPOINT`, `API_CHATEVENT_ENDPOINT`, `API_USEREVENT_ENDPOINT`
  - 채팅 호스트: `API_CHAT_HOST_URL`
  - 플랫폼 SDK: `CAFE24_CLIENTID`, `CAFE24_VERSION`, `GODOMALL_SYSTEMKEY`

## 런타임 개념/흐름
- 공통 플로우(요약)
  1) 파트너/유저 식별 확보 → `postChatUserId`로 `chatUserId` 발급/갱신 → 세션 스토리지(`gentoo.cuid`) 저장
  2) `getChatbotData`, `getBootConfig`/`getFloatingData`로 UI/실험치/위치/아바타/이미지 등 수신
  3) 플로팅 버튼/채팅 iframe DOM 생성 및 이벤트 바인딩
  4) 클릭/오픈/스크롤/폼 제출/리다이렉트 등 이벤트를 메시지(`postMessage`)와 API로 기록
- iframe/도메인 보호
  - 기본적으로 iframe 내에서 SDK 인스턴스화 금지. 단, 허용 도메인(Shopify 관리/스토어 등) 패턴은 예외 처리.
  - 중복 인스턴스 방지: `window.__GentooInited` 및 DOM 탐색으로 기존 엘리먼트 존재 여부 체크.
- 반응형/모바일
  - 모바일 환경에서 `viewport` 메타를 주입/복원하여 줌 방지.
  - `resize`, `popstate` 처리로 위치/UI 업데이트 및 뒤로가기 시 채팅 닫기.
- 애니메이션
  - Lottie 도입: `@dotlottie/player-component` 모듈 스크립트 동적 주입 후 아바타/버튼 렌더.

## 퍼블릭 API (글로벌 큐)
- 공통: 전역 함수가 큐로 동작하며, `boot` 이후에만 메서드 사용 가능. 미리 푸시된 큐는 초기화 시 처리됩니다.

### GentooIO (플로팅/채팅)
- 전역: `window.GentooIO`
- 메서드
  - `GentooIO('boot', { partnerId, authCode, partnerType?, itemId?, displayLocation?, udid?, ... })`
    - 필요 파라미터는 엔트리별로 상이. 일반 `floating-sdk.js`의 경우 `partnerId`, `authCode` 필수.
  - `GentooIO('init', { position?, showGentooButton?, isCustomButton? })`
  - `GentooIO('openChat')`
  - `GentooIO('unmount')` → 내부 `destroy()`
  - 이벤트 핸들러 등록(일반 엔트리):
    - `GentooIO('getGentooShowEvent', { callback })`
    - `GentooIO('getGentooClickEvent', { callback })`
    - `GentooIO('getFormSubmittedEvent', { callback })`
    - `GentooIO('getPreInputSubmittedEvent', { callback })`
    - `GentooIO('getUserSentMessageEvent', { callback })`
  - 로깅: `GentooIO('sendLog', { eventCategory, partnerId, authCode, udid, products })`

### GentooLogger (행동 로그)
- 전역: `window.GentooLogger`
- 메서드
  - `GentooLogger('boot', { partnerType })`
  - `GentooLogger('init')`
- 내부 동작
  - `CAFE24API` 초기화 및 파트너/유저/세션 식별 수집
  - `sendEventLog`로 페이지 전환(referrer/키워드), 스크롤 스냅샷, 플로팅 이벤트, 헬스체크 등을 전송

## 플랫폼별 특이사항
- Cafe24 Glacier / Sidepanel
  - `CAFE24API.init({ client_id, version })`
  - `getCustomerIDInfo` → 회원/게스트 식별. 사이드패널은 페이지를 오른쪽으로 푸시하는 레이아웃 제공 및 복원 로직 포함.
  - 메시지 채널로 `addProductToCart` 등 상호작용 지원.
- Godomall
  - `GodomallSDK.init(systemKey)` → `getMallInfo`, `getMemberProfile`
  - 게스트는 세션 난수 토큰(`gentooGuest`)로 대체.
- Imweb
  - 전역 `UNIT_CODE`, `MEMBER_UID` 사용. 게스트는 세션 난수 토큰으로 대체.

## 메시지/이벤트
- `window.postMessage`를 통해 iframe ↔ 부모 간 통신
  - `enableMode: 'shrink' | 'full'`, `redirectState`, `formSubmittedState`, `inputFocusState`, `closeRequestState`, `addProductToCart`, `floatingMessage`, `connectionId` 등
- 로깅 이벤트
  - `SDKFloatingRendered`, `SDKFloatingClicked`, `PageTransition`, `Scroll`, `floatingButtonClick`, `registered`(헬스체크)

## 세션/스토리지 정책
- `sessionStorage['gentoo']`에 `cuid`(chatUserId), `sessionId`, 리다이렉트 상태 등 저장.
- 일부 게스트 토큰은 `sessionStorage['gentooGuest']`로 유지.

## 개발 및 테스트
- 의존성: Node 18+ 권장
- 빌드
  - 개발: `npm run build:dev`
  - 스테이지: `npm run build:stage`
  - 프로덕션: `npm run build:prod`
- 데모 페이지: `index.html`, `test*.html`로 산출물 로드 테스트
- 번들 참조: `dist/<target>/*.js` 경로를 스크립트 태그로 임베드

## 품질/가이드
- 중복 인스턴스 방지: `window.__GentooInited` 상태값(`iframe_blocked`/`init`/`creating`/`created`) 활용
- 보안/호환: iframe 상위 접근은 same-origin 제약에 유의. 접근 불가 시 `document.referrer` 사용 시도.
- 성능: 스크롤 로깅은 throttle, `passive: true`. Lottie는 동적 주입으로 지연 로드.

## FAQ 요약
- Q. 왜 iframe 안에서 생성이 막히나요?
  - A. 상위 문서와 UI/이벤트 충돌, 보안 이슈를 피하고 일관된 UX 제공을 위해 기본 차단. 특정 허용 도메인에서만 예외.
- Q. 버튼이 두 번 생겨요.
  - A. `GentooIO('boot')`는 한 번만 호출해야 하며, 기존 DOM에 SDK 엘리먼트가 있으면 초기화를 건너뜁니다.
- Q. 파트너/유저 식별은 언제 생기나요?
  - A. `boot` 단계에서 `postChatUserId`가 먼저 수행되어 `chatUserId`를 확보 후 나머지 fetch를 진행합니다.
