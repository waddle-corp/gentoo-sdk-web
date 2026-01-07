export function getDisplayLocationCafe24(urlString = window.location.href) {
    if (urlString.includes('keyword=') || urlString.includes('query=')) { this.displayLocation = 'PRODUCT_SEARCH' }
    else if (urlString.includes('/product') && !urlString.includes('/product/list')) { this.displayLocation = 'PRODUCT_DETAIL' }
    else if (urlString.includes('/category') || urlString.includes('/product/list')) { this.displayLocation = 'PRODUCT_LIST' }
    else { this.displayLocation = 'HOME' }
    try {
        // URL 객체 생성
        const url = new URL(urlString);

        // 1. 쿼리 파라미터에서 product_no 추출 시도
        const productNoFromQuery = url.searchParams.get('product_no');
        if (productNoFromQuery) {
            return productNoFromQuery;
        }

        // 2. 경로 기반 URL에서 product_no 추출 시도
        const path = url.pathname;

        /**
         * 고려가 필요한 cafe24 경로 패턴
            /product/{product_name}/{product_no}
            /product/{product_name}/{product_no}/category/{category_no}/display/{display_group_no}
            /{shop_no}/product/{product_name}/{product_no}
         */

        /**
         * 정규 표현식 설명:
            (?:\/[^\/]+)?	🔹 optional shop_no segment (/12345 등)
            \/product\/	/product/ 고정
            [^\/]+	product_name
            \/([^\/]+)	✅ 캡처할 product_no
            (?:\/category/...)?	🔹 optional category/display path
         */
        const regex = /^(?:\/[^\/]+)?\/product\/[^\/]+\/([^\/]+)(?:\/category\/[^\/]+\/display\/[^\/]+\/?)?$/;
        const alterRegex = /^(?:\/[^\/]+)?\/product\/[^\/]+\/([^\/]+)/;

        const match = path.match(regex);
        const alterMatch = path.match(alterRegex);
        if (match && match[1]) {
            return match[1]; // product_no
        } else if (alterMatch && alterMatch[1]) {
            return alterMatch[1]; // product_no
        }

        // 3. 찾을 수 없는 경우 null 반환
        return null;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}