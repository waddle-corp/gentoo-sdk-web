import { 
    postChatUserId, 
    checkTrainingProgress,
    sendEventLogShopify 
} from './apis/chatConfig';

class Logger {
    constructor(props) {
        // Check for existing SDK elements 
        if (window.__GentooLoggerInited !== null && window.__GentooLoggerInited !== undefined) {
            console.warn("GentooLogger already exists in the document, skipping initialization.");
            return;
        }

        this.partnerType = props.partnerType || 'shopify';
        this.partnerId = props.partnerId;
        this.authCode = props.authCode;
        this.udid = props.udid || "";
        this.displayLocation = props.displayLocation || "HOME";
        this.itemId = props.itemId || null;
        this.gentooSessionData = JSON.parse(sessionStorage.getItem('gentoo')) || {};
        this.chatUserId = this.gentooSessionData?.cuid || null;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isInitialized = false;  // Add flag to track initialization
        this.categoryName = this.parseInfoFromUrl()?.categoryName;
        this.pageNumber = this.parseInfoFromUrl()?.pageNumber;
        this.searchKeyword = this.getSearchKeyword();
        this.sessionId = this.gentooSessionData?.sessionId || `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        if (!this.gentooSessionData?.sessionId) {
            this.gentooSessionData.sessionId = this.sessionId;
            sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
        }

        this.bootPromise = async () => {

            try {
                try {
                    const canProceed = await checkTrainingProgress(this.partnerId);
                    if (!canProceed) {
                        console.warn("GentooIO: Training not completed, skipping initialization");
                        window.__GentooInited = 'training_incomplete';
                        throw new Error("Training not completed - business rule violation");
                    }
                } catch (error) {
                    console.error(`Error while calling checkTrainingProgress API: ${error}`);
                    throw error;
                }

                try {
                    const chatUserId = await postChatUserId(this.authCode, this.udid, this.partnerId, this.chatUserId);
                    if (!chatUserId) throw new Error("Failed to fetch chat user ID");
                    this.chatUserId = chatUserId;
                    this.gentooSessionData.cuid = chatUserId;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                } catch (error) {
                    this.chatUserId = 'test';
                }

                // declare basic payload
                this.basicPayload = {
                    sessionId: this.sessionId,
                    externalKey: this.partnerId,
                    chatUserId: this.chatUserId,
                    userToken: this.authCode,
                    displayLocation: this.displayLocation,
                    pageLocation: window.location.href,
                    itemId: this.itemId,
                    categoryName: this.categoryName, 
                    pageNumber: this.pageNumber,
                }

                // send event log
                const ref = document.referrer;
                if (ref && !ref.includes(window.location.host)) {
                    sendEventLogShopify("PageTransition", this.basicPayload, { referrerOrigin: ref });
                } else if (this.searchKeyword) {
                    sendEventLogShopify("PageTransition", this.basicPayload, { searchKeyword: this.searchKeyword });
                } else {
                    sendEventLogShopify("PageTransition", this.basicPayload); 
                }

                window.GentooLogListener = {
                    log: (payload) => {
                        if (payload.type === 'floatingEvent') {
                            sendEventLogShopify(payload.event, this.basicPayload, { floatingMessage: payload.floatingMessage });
                        }
                        if (payload.type === 'healthCheck') {
                            sendEventLogShopify(payload.event, this.basicPayload, { connectionId: payload.connectionId });
                        }
                    }
                }

                const attachScrollTracker = () => {
                    /** 간단한 throttle 유틸 – 1초당 한 번만 실행 */
                    function throttle(fn, wait = 1000) {
                        let last = 0;
                        return (...args) => {
                            const now = Date.now();
                            if (now - last >= wait) {
                                last = now;
                                fn(...args);
                            }
                        };
                    }
    
                    /** 실제 스크롤 핸들러 */
                    const onScroll = throttle(() => {
                        const y = window.scrollY || document.documentElement.scrollTop;
                        sendEventLogShopify("Scroll", this.basicPayload, {
                            scrollTop: y,
                            documentHeight: document.documentElement.scrollHeight,
                            viewportHeight: window.innerHeight,
                            scrollPercentage: (y / (document.documentElement.scrollHeight - window.innerHeight) * 100).toFixed(1),
                        });
                    });
    
                    /** passive:true → 스크롤 성능 보호 */
                    window.addEventListener('scroll', onScroll, { passive: true });
    
                    /** SDK가 언마운트될 때 정리(선택) */
                    window.GentooCleanup = () => {
                        window.removeEventListener('scroll', onScroll);
                    };
                };
                attachScrollTracker();

                return Promise.resolve();
            } catch (error) {
                console.error(`Error during initialization: ${error}`);
                throw error;
            }
        };
        window.__GentooLoggerInited = 'created';
    }

    async init() {
        if (window.__GentooLoggerInited !== null && window.__GentooLoggerInited !== undefined) {
            console.warn("GentooIO init called twice, skipping second call.");
            return;
        }

        try {
            // Wait for boot process to complete
            await this.bootPromise();

            if (this.isInitialized) {
                console.warn('GentooLogger is already initialized');
                return;
            }

            if (!this.chatUserId) {
                throw new Error('Required data not yet loaded');
            }

            this.isInitialized = true;

        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }

        window.__GentooLoggerInited = 'init';
    }

    /**
     * 현재 URL 또는 주어진 URL에서 product_no 값을 추출하는 함수
     * 
     * @param {string} [urlString=window.location.href] - 분석할 URL 문자열
     * @returns {string|null} - 추출된 product_no 값 또는 null (찾을 수 없을 경우)
     */
    parseInfoFromUrl(urlString = window.location.href) {
        const url = new URL(urlString);
        const path = url.pathname;

        try {
            // URL 객체 생성
            // const url = new URL(urlString);

            /* // 1. 쿼리 파라미터에서 product_no 추출 시도
            const productNoFromQuery = url.searchParams.get('product_no');
            if (productNoFromQuery) {
                return productNoFromQuery;
            } */

            // 2. 경로 기반 URL에서 product_no 추출 시도
            // const path = url.pathname;

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
            //const regexProductNo = /^(?:\/[^\/]+)?\/product\/[^\/]+\/([^\/]+)(?:\/category\/[^\/]+\/display\/[^\/]+\/?)?$/;
            //const regexCategoryNo = /(?:\/category\/(?:[^\/]+\/)*|[?&]cate_no=)(\d+)/;
            const regexCategoryName = /\/collections\/([^\/\?]+)/;
            const searchParams = url.searchParams;
            const pageNumber = searchParams.get('page') || null;
            //const matchProductNo = path.match(regexProductNo);
            //const matchCategoryNo = path.match(regexCategoryNo);
            const matchCategoryName = path.match(regexCategoryName);

            // 3. 찾을 수 없는 경우 null 반환
            return {
                //productNo: matchProductNo ? matchProductNo[1] : null,
                //categoryNo: matchCategoryNo ? matchCategoryNo[1] : null,
                categoryName: matchCategoryName ? matchCategoryName[1] : null,
                pageNumber: pageNumber,
            };
        } catch (error) {
            console.error('Invalid URL:', error);
            return null;
        }
    }

    getSearchKeyword() {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        return searchParams.get('q') || searchParams.get('query') || null;
    }
}

// Export as a global variable
window.GentooLogger = Logger;
console.log('[Logger] window.GentooLogger', window.GentooLogger);

(function (global, document) {
    var w = global;

    var logger; // Keep logger in closure scope

    // Create a persistent queue processor
    function createQueueProcessor() {
        console.log('[Logger] createQueueProcessor started');
        var ge = function () {
            ge.q.push(Array.from(arguments));
            processQueue();
        };

        // Initialize queue
        ge.q = ge.q || [];

        ge.process = function (args) {
            var method = args[0];
            var params = args[1] || {};

            // Handle boot separately
            if (method === "boot") {
                try {
                    logger = new Logger(params);
                } catch (error) {
                    console.error("Failed to create GentooLogger instance:", error);
                }
                return;
            }

            // For all other methods, ensure instance exists
            if (!logger) {
                console.error("GentooLogger: Must call boot() before using this method");
                return;
            }

            // Process method
            switch (method) {
                case "init":
                    if (typeof logger.init === "function") {
                        Promise.resolve(logger.init(params)).catch((error) => {
                            console.error("Failed to initialize GentooLogger:", error);
                        });
                    }
                    break;
                default:
                    console.error("GentooLogger: Unknown method", method);
            }
        };

        return ge;
    }

    function processQueue() {
        console.log('[Logger] processQueue started');
        while (w.GentooLogger.q && w.GentooLogger.q.length) {
            var args = w.GentooLogger.q.shift();
            w.GentooLogger.process(args);
        }
    }

    // Initialize or get existing GentooLogger
    var existingGentooLogger = w.GentooLogger;
    w.GentooLogger = createQueueProcessor();
    console.log('[Logger] w.GentooLogger', w.GentooLogger);

    // Process any existing queue items
    if (existingGentooLogger && existingGentooLogger.q) {
        console.log('[Logger] existingGentooLogger.q', existingGentooLogger.q);
        existingGentooLogger.q.forEach(function (args) {
            w.GentooLogger.process(args);
        });
    } else {
        console.log('[Logger] existingGentooLogger.q is not found');
    }
})(window, document);


/* GentooLogger('boot', {
    partnerType: 'shopify',
})

GentooLogger('init', {}); */ // 아마도 Liquid 파일에서 실행되어야 할 듯