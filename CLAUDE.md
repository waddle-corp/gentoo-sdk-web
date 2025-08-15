# Gentoo SDK 프로젝트

## 프로젝트 개요
Gentoo 플로팅 버튼 SDK는 다양한 이커머스 플랫폼에 젠투 AI 챗봇을 임베드하기 위한 JavaScript SDK입니다.

## 아키텍처

### SDK 구조
```
floating-button-sdk.js        # 기본 프로덕션 SDK
floating-button-sdk-cafe24.js # 카페24 플랫폼 특화
floating-button-sdk-shopifyTest.js # Shopify 실험용 (맞춤형 문구)
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

## Shopify 실험 기능

### 실험 타겟 체크
```javascript
checkExperimentTarget() {
    const experimentStores = [
        '0qjyz1-uj.myshopify.com',  // 테스트 스토어
        // 추가 실험 스토어들...
    ];
    return experimentStores.some(store => 
        window.location.hostname.includes(store)
    );
}
```

### 맞춤형 문구 시스템
- **플로팅 문구**: `floatingData.comment` 오버라이드
- **그리팅 문구**: `postMessage`로 채팅 웹에 전달
- **하드코딩된 API**: Olive This Olive That partnerId 사용

### redirectState 관리
**핵심 인사이트**: `redirectState`는 PDP 리다이렉트 플로우와 실험을 분리하는 핵심 메커니즘

#### 라이프사이클
1. **설정**: 상품 카드 클릭 시 `true`
2. **전파**: sessionStorage로 페이지 간 유지
3. **해제**: 자동 채팅 열기 완료 후 `false`

#### 실험과의 관계
```javascript
// 실험 적용 조건: 타겟 스토어 + 리다이렉트 아님
if (this.isExperimentTarget && !this.gentooSessionData?.redirectState) {
    // 맞춤형 문구 적용
}
```

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

### 실험 안전성
- **타겟 제한**: 특정 스토어에서만 실행
- **API 하드코딩**: Olive partnerId로 고정
- **폴백 로직**: 실험 실패 시 기존 문구 사용

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

### 개발 파일
- `src/floating-sdk.js`: 소스 파일
- 웹팩으로 번들링

### 배포 파일
- CDN 업로드: `floating-button-sdk-shopifyTest.js`
- Shopify Extension 업데이트 필요

## 디버깅 팁

### 콘솔 로그 패턴
- `🧪`: 실험 관련 로그
- `🛍️`: Shopify 특화 기능
- `💬`: 플로팅 문구 관련

### 자주 확인할 사항
1. `isExperimentTarget` 값
2. `redirectState` 상태
3. API 응답 데이터 구조
4. postMessage 전달 여부