# Gentoo SDK 프로젝트

## 프로젝트 개요
Gentoo 플로팅 버튼 SDK는 다양한 이커머스 플랫폼에 젠투 AI 챗봇을 임베드하기 위한 JavaScript SDK입니다.

## 아키텍처

### SDK 구조
```
floating-button-sdk.js        # 기본 프로덕션 SDK
floating-button-sdk-cafe24.js # 카페24 플랫폼 특화
floating-button-sdk-shopifyTest.js # Shopify 특화
sdk.js                        # 기본 로더
sdk-shopifyTest.js           # Shopify 실험용 로더
```

### 핵심 컴포넌트

#### FloatingButton 클래스
- **생성자**: 환경별 설정, 도메인 검증, 실험 타겟 체크
- **init()**: 비동기 초기화, API 호출, UI 생성
- **createUIElements()**: DOM 요소 생성 및 이벤트 리스너 설정

#### 주요 메서드
- `fetchFloatingData()`: 플로팅 문구 API 호출
- `fetchShopifyExperimentData()`: 실험용 맞춤 문구 API 호출
- `sendPostMessageHandler()`: iframe 통신
- `checkExperimentTarget()`: 실험 대상 스토어 판별

## displayLocation 시스템

### 핵심 역할
`displayLocation`은 **페이지 컨텍스트 인식**을 통해 상황에 맞는 AI 응답과 플로팅 문구를 제공하는 핵심 변수입니다.

### 공식 지원 값 (백엔드 Enum)
```typescript
// gentoo-backend/apps/gentoo-nest-chat/src/const/floating-button.ts
export const DisplayLocationEnum = {
  HOME: 'HOME',                    // 홈페이지/메인페이지
  PRODUCT_DETAIL: 'PRODUCT_DETAIL', // 상품 상세페이지 (PDP)
  PRODUCT_LIST: 'PRODUCT_LIST',    // 상품 목록/카테고리 페이지
} as const;
```

### SDK 전용 값 (로컬 처리)
```javascript
'PRODUCT_SEARCH'     // 검색 결과 페이지 (Cafe24만, 백엔드 미지원)
'UNDEFINED_LOCATION' // 분류 불가능한 페이지 (Logger만, 백엔드 미지원)
```

### 플랫폼별 설정 방식
| 플랫폼 | 설정 방법 | 지원 값 |
|--------|-----------|---------|
| **Shopify** | Liquid 템플릿 자동 감지 (`{{ template }}`), extensions/gentoo-floating/blocks/floating_button.liquid 참고 | HOME, PRODUCT_DETAIL, PRODUCT_LIST, CART, OTHER |
| **Cafe24** | JavaScript URL 패턴 자동 감지 | HOME, PRODUCT_DETAIL, PRODUCT_LIST, PRODUCT_SEARCH |
| **고도몰** | JavaScript URL 패턴 자동 감지 | HOME, PRODUCT_DETAIL, PRODUCT_LIST |

### 사용 위치
1. **채팅 URL 쿼리 파라미터**: `dp=${this.displayLocation}`
2. **플로팅 데이터 API 호출**: 페이지별 맞춤 문구 요청
3. **로깅/분석**: 사용자 행동 분석 데이터

### PRODUCT_DETAIL의 특별함
- **itemId와 연동**: 상품 ID와 함께 전달하여 상품별 맞춤 응답 제공
- **실험 로직**: PDP 방문 후 채팅 자동 열기 등 특수 시나리오 처리
- **백엔드 특화 처리**: 상품 상세 페이지에서만 작동하는 로직들

### Shopify의 실제 감지 방식
```liquid
// SDK로 전달
window.GentooIO('boot', {
    displayLocation: pageCategory,  // 자동 감지된 값
    itemId: "{{ product.id }}",     // Liquid로 자동 주입
})
```

### 테스트 페이지에서의 수동 설정
```javascript
// test_pdp.html - 개발/테스트용
GentooIO('boot', {
    displayLocation: 'PRODUCT_DETAIL', // 수동 지정
    itemId: '3607505',                  // 수동 지정
})
```

### 환경별 분기 로직

#### 로컬 개발 환경
```javascript
if (hostname === "127.0.0.1" || hostname === "localhost") {
    this.hostSrc = "http://localhost:3000";  // 로컬 React 개발 서버
}
```

#### 스테이징 환경
```javascript
else if (hostname === "stage-demo.gentooai.com") {
    this.hostSrc = "https://stage-demo.gentooai.com";
}
```

#### 프로덕션 환경
```javascript
else {
    this.hostSrc = "https://demo.gentooai.com";
}
```

### redirectState 관리
**핵심 인사이트**: `redirectState`는 PDP 리다이렉트 플로우와 실험을 분리하는 핵심 메커니즘

#### 라이프사이클
1. **설정**: 상품 카드 클릭 시 `true`
2. **전파**: sessionStorage로 페이지 간 유지
3. **해제**: 자동 채팅 열기 완료 후 `false`

## 플랫폼별 특화 기능

### Cafe24
- 특화된 CSS 스타일링
- 플랫폼 특화 API 엔드포인트

### Shopify
- Extension을 통한 스크립트 주입
- 실험 기능 (맞춤형 문구)
- partnerType: 'shopify' 기본값

## 로컬 개발

### 테스트 페이지 구조
- `testpage.html`: 기본 테스트 (sdk-shopifyTest.js 로더 사용)
- `test_pdp.html`: PDP 시나리오 테스트
- `testCafe24.html`: 카페24 플랫폼 테스트

### 개발 서버 실행
```bash
# VS Code Live Server 사용 (포트 5500)
# 또는 Python 서버
python -m http.server 5500
```

### 환경별 SDK 로딩
```javascript
// sdk-shopifyTest.js의 분기 로직
if (window.location.hostname === "127.0.0.1" || hostname === "localhost") {
    s.src = "./floating-button-sdk-shopifyTest.js";  // 로컬
} else {
    s.src = "https://sdk.gentooai.com/floating-button-sdk-shopifyTest.js";  // CDN
}
```

## PostMessage 통신

### SDK → 채팅 웹
```javascript
// 맞춤형 그리팅 전달
payload.customizedGreeting = this.selectedCommentSet.greeting;
this.iframe.contentWindow.postMessage(payload, "*");
```

### 채팅 웹 → SDK
```javascript
// 상품 리다이렉트 요청
window.parent.postMessage({ 
    redirectState: true, 
    redirectUrl: productUrl 
}, '*');
```

## 중요한 발견사항

### iframe 도메인 허용
```javascript
this.allowedDomainsForIframe = [
    'admin.shopify.com',
    '*.myshopify.com',
    'localhost',
    '127.0.0.1'
];
```

### 플로팅 문구 표시 조건
```javascript
// 3가지 조건 모두 만족해야 표시
if (!this.gentooSessionData?.redirectState &&    // PDP 리다이렉트 아님
    this.floatingCount < 2 &&                     // 2회 미만 표시
    this.floatingData.comment &&                  // 문구 데이터 존재
    this.floatingData.comment.length > 0) {
    // 플로팅 문구 표시
}
```

## 빌드 & 배포

## 디버깅 팁

### 자주 확인할 사항
1. `isExperimentTarget` 값
2. `redirectState` 상태
3. API 응답 데이터 구조
4. postMessage 전달 여부
