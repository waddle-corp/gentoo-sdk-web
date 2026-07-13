# FastFive 커스텀 버튼 전환 — 코드 분기 정리 (내부 공유용)

> 작성 목적: FastFive가 젠투 내장 플로팅 버튼 대신 **자체 커스텀 디자인 버튼**을 사용하게 되면서,
> 코드에 섞여 있던 FastFive 관련 분기 중 **어떤 것이 레거시가 되고 / 어떤 것이 계속 필요한지**를 구분해 공유한다.

---

## 1. 배경

- FastFive는 커스텀 대응이 필요한 고객으로, 그동안 코드에 다음 네 종류의 FastFive 전용 분기가 섞여 있었다.
  1. **Floating element(내장 버튼 UI) 관련 분기** — 버튼 자산/위치/사이즈/이미지 복원
  2. **로깅·데이터 수집 분기** — `_fbc` 쿠키(FB 전환추적)
  3. **스크립트 참조(로더 라우팅) 분기** — FastFive만 modal SDK가 아닌 비-modal SDK 로드
  4. **도메인/경로 기반 시나리오 분기** — `window.location.pathname`을 채팅 `entry` 값으로 매핑
- 이번에 FastFive가 **직접 만든 커스텀 디자인 버튼**으로 채팅을 여닫게 되면서,
  위 **1번(Floating element 관련 분기)이 실행되지 않는 레거시 코드**가 되었다.
- **2번·3번·4번은 UI와 무관하게 그대로 필요**하다. (특히 4번은 커스텀 버튼으로 각 페이지에서 챗을 열 때 어떤 시나리오를 보여줄지 결정하는 핵심 로직)

> ⚠️ **브랜치 주의:** 4번(경로 기반 시나리오)은 현재 **`develop` 브랜치에만** 있다 (커밋 `792e86c`). `main`에는 아직 병합되지 않았다. 아래 4번 관련 라인 번호는 모두 **`develop` 기준**이다.

### 전환에 쓰는 SDK 메서드/옵션

`init` 호출 시 두 옵션으로 내장 UI를 끄고 커스텀 버튼에 연동한다.

```javascript
GentooIO('boot', { partnerId: '67615284c5ff44110dbc6613', authCode: '...' });
GentooIO('init', {
  showGentooButton: false,   // 내장 플로팅 버튼 렌더링 스킵
  isCustomButton: true,      // 고객 커스텀 버튼 감지·연동
});
```

- 고객 페이지에는 반드시 **`class="gentoo-custom-button"`** 요소가 있어야 한다.
  - 해당 클래스 첫 번째 요소에 click 리스너가 자동 등록되어 `openChat()`이 호출된다.
  - ⚠️ FastFive가 로드하는 `src/floating-sdk.js`(빌드: `dist/gentoo/floating.js`)의 선택자는 **class만 지원**한다 (`id="gentoo-custom-button"` 미지원).
- `position` 옵션은 내장 버튼 위치 지정용이므로 **커스텀 버튼 모드에서는 불필요**하다.

---

## 2. FastFive 식별 방식

두 조건 중 하나로 판별한다 (도메인 또는 partnerId).

```javascript
this.fastfivePartnerId = '67615284c5ff44110dbc6613';
this.isFastfive = window.location.hostname.includes('fastfive.co.kr')
               || this.partnerId === this.fastfivePartnerId;
```

- 위치: `src/floating-sdk.js:52-53`
- 로더(`sdk.js`)에서도 동일 조건으로 `isFastfive`를 계산한다: `sdk.js:24`

---

## 3. 분기 전체 목록

파일 기준: FastFive는 **`dist/gentoo/floating.js`**(= `src/floating-sdk.js` 빌드)를 로드한다.
(`floating-button-sdk.js`가 아님)

### (A) 🟥 Floating element(내장 버튼 UI) 관련 분기 — **레거시화**

> 모두 `if (showGentooButton)` 블록(`src/floating-sdk.js:368`) 안에 있거나 `this.button` 널가드로 감싸져 있다.
> `showGentooButton: false` 모드에서는 **실행되지 않는다.**

| 위치 | 역할 | 커스텀 버튼 모드에서 |
|------|------|----------------------|
| `src/floating-sdk.js:374` | FastFive 전용 Lottie 자산(`Ff_fab_nopad`)으로 버튼 렌더 | 미실행 (레거시) |
| `src/floating-sdk.js:397-398` | FastFive는 부모 상대배치 대신 fixed 유지 | 미실행 (레거시) |
| `src/floating-sdk.js:411-428` | 버튼 zoom/사이즈 및 `button-margin-left` 마진 처리 | 미실행 (레거시) |
| `src/floating-sdk.js:620` | 채팅 닫을 때 FastFive 버튼 배경 이미지 복원 | 미실행 (레거시) |
| `src/floating-sdk.css:59` `.floating-container-fastfive` 등 | FastFive 전용 플로팅 CSS | 미사용 (레거시) |

### (B) 🟩 로깅·데이터 수집 분기 — **유지 필요**

| 위치 | 역할 | 커스텀 버튼 모드에서 |
|------|------|----------------------|
| `src/floating-sdk.js:124-125` | `_fbc` 쿠키 수집 (FastFive FB 전환추적) | 그대로 실행·필요 |

> `_fbc`는 이후 이벤트 로깅/PostMessage 데이터에 포함되므로, 커스텀 버튼과 무관하게 유지되어야 한다.

### (C) 🟩 스크립트 참조(로더 라우팅) 분기 — **유지 필요**

| 위치 | 역할 | 커스텀 버튼 모드에서 |
|------|------|----------------------|
| `sdk.js:24` + 라우팅 | FastFive만 modal(`floating-modal.js`)이 아닌 비-modal(`floating.js`) 로드 | 그대로 유지·필요 |
| `src/floating-sdk-modal.js:22` (주석) | pre-question 시나리오 때문에 modal SDK에서 FastFive 제외 명시 | 유지 (문서성 주석) |

로더 라우팅 원본 로직:

```javascript
source = isMobile && !isFastfive
  ? '.../dist/gentoo-modal/floating-modal.js'   // 모바일 + 비FastFive → modal
  : '.../dist/gentoo/floating.js';              // FastFive거나 데스크탑 → 비-modal
```

> ⚠️ 현재 워킹트리의 `sdk.js`에는 이 라우팅이 주석 처리되고 `floating.js`로 하드코딩된 **임시 수정**이 uncommitted 상태로 남아 있음. 배포 전 원복 여부 확인 필요.

### (D) 🟩 도메인/경로 기반 시나리오 분기 — **유지 필요** *(develop 브랜치)*

> `window.location.pathname`을 읽어 채팅 URL의 `entry` 쿼리 파라미터로 매핑한다.
> 고객이 `entry`를 수동으로 넘기지 않아도 페이지별로 다른 채팅 시나리오가 열린다.
> **UI가 아니라 "어떤 시나리오로 챗을 여는가"를 결정** → 커스텀 버튼 모드에서 오히려 핵심.

| 위치 (develop) | 역할 | 커스텀 버튼 모드에서 |
|------|------|----------------------|
| `src/floating-sdk.js:58-59` | 부팅 시 `this.pagePath` / `this.entry` 계산 | 그대로 실행·필요 |
| `src/floating-sdk.js:1167` `mapPagePathToEntry()` | pathname → entry 매핑 테이블 | 그대로 실행·필요 |
| `chatUrl` 조립부 (`&entry=...` 부착) | 매핑된 entry를 채팅 URL 쿼리에 추가 | 그대로 실행·필요 |
| `testpage.html` path switcher | 로컬에서 pathname을 mocking해 테스트 | 테스트 지원 |

**경로 → entry 매핑:**

| pathname (prefix) | entry |
|-------------------|-------|
| `/shared-office` | `office` |
| `/office-interior` | `interior` |
| `/office-solution` | `building` |
| `/individual-office` | `private` |
| `/lounge-membership` | `lounge` |
| 그 외 (홈 등) | (entry 쿼리 미포함) |

```javascript
mapPagePathToEntry(pagePath) {
    if (!pagePath) return '';
    const map = [
        { prefix: '/shared-office', entry: 'office' },
        { prefix: '/office-interior', entry: 'interior' },
        { prefix: '/office-solution', entry: 'building' },
        { prefix: '/individual-office', entry: 'private' },
        { prefix: '/lounge-membership', entry: 'lounge' },
    ];
    for (const { prefix, entry } of map) {
        if (pagePath === prefix || pagePath.startsWith(prefix + '/')) return entry;
    }
    return '';
}
```

> ⚠️ **이 분기는 `develop`에만 있고 `main`에는 아직 없다** (커밋 `792e86c`). 커스텀 버튼 전환 배포 시 이 로직도 함께 반영되는지 브랜치 병합 여부 확인 필요.

---

## 4. 안전성 검증 (커스텀 버튼 단독 모드)

`showGentooButton: false` + `isCustomButton: true` 조합에서 내장 버튼(`this.button`, `this.floatingContainer`, `this.dotLottiePlayer`)이 생성되지 않아도 채팅 여닫기 경로가 안전한지 확인함.

- 채팅 컨테이너 `this.iframeContainer`는 `showGentooButton`과 무관하게 **항상 생성됨** → `openChat`/`hideChat` 정상 동작
- 아래 경로 모두 **널가드 존재** → 내장 버튼 부재 시 에러 없음
  - `buttonClickHandler` `src/floating-sdk.js:587-627`
  - `enableChat` `src/floating-sdk.js:1112-1118`
  - `hideChat` `src/floating-sdk.js:1130`
  - `updateFloatingContainerVisibility` `src/floating-sdk.js:817`
  - `updateFloatingContainerPosition` `src/floating-sdk.js:790`
- 커스텀 버튼 click 리스너 등록: `src/floating-sdk.js:705-706`

**결론:** 레거시화된 (A) 분기들은 실행되지 않을 뿐 에러를 유발하지 않으므로, 즉시 삭제하지 않아도 동작상 문제는 없다.

---

## 5. 후속 액션 제안

1. **(A) 그룹 정리(리팩터링) 검토** — 실행되지 않는 FastFive floating UI 분기(374, 397-398, 411-428, 620) 및 관련 CSS를 정리 대상으로 표시. (기능 영향 없음 / 가독성·유지보수 목적)
   - 참고: `src/floating-sdk.js:411-428`의 `!this.partnerId === '...'` 는 원래부터 논리 버그(항상 false)로 보임. 정리 시 함께 검토.
2. **(B)/(C)/(D) 그룹 유지** — `_fbc` 수집, 로더 라우팅, 경로→entry 시나리오 매핑은 유지.
3. **브랜치 병합 확인** — (D) 경로 기반 시나리오(`792e86c`)는 `develop`에만 존재. 커스텀 버튼 전환 배포 시 `main` 병합 여부를 반드시 확인. (미병합 시 FastFive 각 페이지에서 시나리오가 구분되지 않음)
4. **`sdk.js` 로컬 임시 수정 처리** — `floating.js` 하드코딩 상태를 원래 `isFastfive` 라우팅으로 원복할지 결정.
5. **커스텀 버튼 연동 가이드** — FastFive에 전달할 별도 연동 문서(`class="gentoo-custom-button"`, `init` 옵션) 필요 시 작성.
