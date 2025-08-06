import { fetchChatUserId, sendEventLog } from './apis/chatConfig';

class Logger {
    constructor(props) {
        // Check for existing SDK elements 
        if (window.__GentooLoggerInited !== null && window.__GentooLoggerInited !== undefined) {
            console.warn("GentooLogger already exists in the document, skipping initialization.");
            return;
        }

        this.partnerType = props.partnerType || 'gentoo';
        this.gentooSessionData = JSON.parse(sessionStorage.getItem('gentoo')) || {};
        this.chatUserId = this.gentooSessionData?.cuid || null;
        this.displayLocation;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isInitialized = false;  // Add flag to track initialization
        this.itemId = this.getProductNo()?.productNo;
        this.categoryId = this.getProductNo()?.categoryNo;
        console.log('[DEBUG] itemId', this.itemId);
        console.log('[DEBUG] categoryId', this.categoryId);
        this.searchKeyword = this.getSearchKeyword();
        this.cafe24UserId = null;
        this.cafe24MemberId = null;
        this.cafe24GuestId = null;
        this.sessionId = this.gentooSessionData?.sessionId || `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        if (!this.gentooSessionData?.sessionId) {
            this.gentooSessionData.sessionId = this.sessionId;
            sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
        }

        /* // cafe24 Gentoo-dev App
        this.cafe24ClientId = 'ckUs4MK3KhZixizocrCmTA';
        this.cafe24Version = '2024-09-01'; */
        // cafe24 Gentoo-prod App
        this.cafe24ClientId = 'QfNlFJBPD6mXVWkE8MybWD';
        this.cafe24Version = '2024-09-01';

        // CAFE24API initialization to ensure promises are handled correctly
        this.bootPromise = new Promise((resolve, reject) => {
            // cafe24 API init & fetch partnerId, chatUserId
            ((CAFE24API) => {
                this.cafe24API = CAFE24API;

                const getCustomerIDInfoPromise = () => {
                    return new Promise((innerResolve, innerReject) => {
                        CAFE24API.getCustomerIDInfo((err, res) => {
                            if (err) {
                                console.error(`Error while calling cafe24 getCustomerIDInfo api: ${err}`);
                                innerReject(err);
                            } else {
                                innerResolve(res);
                            }
                        });
                    });
                };

                // Fetch partner ID first
                this.fetchPartnerId(CAFE24API.MALL_ID)
                    .then(partnerId => {
                        this.partnerId = partnerId;

                        // Then get customer ID
                        return getCustomerIDInfoPromise();
                    })
                    .then(res => {
                        if (res.id.member_id) {
                            this.cafe24UserId = res.id.member_id;
                            this.cafe24MemberId = res.id.member_id;
                        } else {
                            this.cafe24UserId = res.id['guest_id'];
                            this.cafe24GuestId = res.id['guest_id'];
                        }

                        // 1. chatUserId 먼저 받아오기 (for floating/chatbot AB test)
                        return fetchChatUserId(this.cafe24UserId, "", this.partnerId, this.chatUserId)
                    })
                    .then(chatUserId => {
                        this.chatUserId = chatUserId;
                        this.gentooSessionData.cuid = chatUserId;
                        sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                        
                        // declare basic payload
                        this.basicPayload = {
                            sessionId: this.sessionId,
                            externalKey: this.partnerId,
                            chatUserId: this.chatUserId,
                            userId: this.cafe24MemberId,
                            anonymousId: this.cafe24GuestId,
                            displayLocation: this.displayLocation,
                            pageLocation: window.location.href,
                            itemId: this.itemId,
                        }

                        // send event log
                        const ref = document.referrer;
                        if (ref && !ref.includes(window.location.host)) {
                            sendEventLog("PageTransition", this.basicPayload, { referrerOrigin: ref });
                        } else if (this.searchKeyword) {
                            sendEventLog("PageTransition", this.basicPayload, { searchKeyword: this.searchKeyword });
                        } else {
                            sendEventLog("PageTransition", this.basicPayload); 
                        }

                        window.GentooLogListener = {
                            log: (payload) => {
                                if (payload.event === 'floatingButtonClick') {
                                    sendEventLog("FloatingButtonClick", this.basicPayload);
                                }
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Initialization error:', error);
                        reject(error);
                    });


            })(CAFE24API.init({
                client_id: this.cafe24ClientId,
                version: this.cafe24Version
            }));

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
                    sendEventLog("Scroll", this.basicPayload, {
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
        });
        window.__GentooLoggerInited = 'created';
    }

    async init() {
        if (window.__GentooLoggerInited !== null && window.__GentooLoggerInited !== undefined) {
            console.warn("GentooIO init called twice, skipping second call.");
            return;
        }

        try {
            // Wait for boot process to complete
            await this.bootPromise;

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

    async logEvent(payload) {
        try {
            const params = {
                eventCategory: String(payload.eventCategory),
                chatUserId: String(payload.chatUserId),
                partnerId: String(payload.partnerId),
                channelId: this.isMobileDevice ? "mobile" : "web",
                products: payload?.products,
            };

            const response = await fetch(`${process.env.API_CHAT_BASE_URL}${process.env.API_USEREVENT_ENDPOINT}/${this.partnerId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(params),
            });

            const res = await response.json(); // JSON 형태의 응답 데이터 파싱
            return res;
        } catch (error) {
            console.error(`Error while calling logEvent API: ${error}`);
        }
    }

    async fetchPartnerId(mallId) {
        try {
            const url = `${process.env.API_MAIN_BASE_URL}${process.env.API_PARTNERID_ENDPOINT}/${mallId}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {}
            });
            const res = await response.json();
            return res.partnerId;
        } catch (error) {
            console.error(`Error while calling fetchPartnerId API: ${error}`)
        }
    }

    /**
     * 현재 URL 또는 주어진 URL에서 product_no 값을 추출하는 함수
     * 
     * @param {string} [urlString=window.location.href] - 분석할 URL 문자열
     * @returns {string|null} - 추출된 product_no 값 또는 null (찾을 수 없을 경우)
     */
    getProductNo(urlString = window.location.href) {
        const url = new URL(urlString);
        const path = url.pathname;

        // displayLocation parsing
        if (
            path === '/' ||
            path === '/index.html' ||
            path.replace(/\/$/, '') === '' // (빈 path)
        ) {
            this.displayLocation = 'HOME';
        }
        else if (path.includes('/product') && !path.includes('/product/list') && !path.includes('/search')) {
            this.displayLocation = 'PRODUCT_DETAIL';
        }
        else if (path.includes('/category') || path.includes('/product/list')) {
            this.displayLocation = 'PRODUCT_LIST';
        }
        else if (path.includes('/search')) {
            this.displayLocation = 'PRODUCT_SEARCH';
        }
        else {
            this.displayLocation = 'UNDEFINED_LOCATION';
        }
        try {
            // URL 객체 생성
            // const url = new URL(urlString);

            // 1. 쿼리 파라미터에서 product_no 추출 시도
            const productNoFromQuery = url.searchParams.get('product_no');
            if (productNoFromQuery) {
                return productNoFromQuery;
            }

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
            const regexProductNo = /^(?:\/[^\/]+)?\/product\/[^\/]+\/([^\/]+)(?:\/category\/[^\/]+\/display\/[^\/]+\/?)?$/;
            const regexCategoryNo = /(?:\/category\/(?:[^\/]+\/)*|[?&]cate_no=)(\d+)/;
            const matchProductNo = path.match(regexProductNo);
            const matchCategoryNo = path.match(regexCategoryNo);
            console.log('[DEBUG] matchProductNo', matchProductNo);
            console.log('[DEBUG] matchCategoryNo', matchCategoryNo);

            // 3. 찾을 수 없는 경우 null 반환
            return {
                productNo: matchProductNo ? matchProductNo[1] : null,
                categoryNo: matchCategoryNo ? matchCategoryNo[1] : null,
            };
        } catch (error) {
            console.error('Invalid URL:', error);
            return null;
        }
    }

    getSearchKeyword() {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        return searchParams.get('keyword') || searchParams.get('query') || null;
    }
}

// Export as a global variable
window.GentooLogger = Logger;

(function (global, document) {
    var w = global;

    var logger; // Keep logger in closure scope

    // Create a persistent queue processor
    function createQueueProcessor() {
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
        while (w.GentooLogger.q && w.GentooLogger.q.length) {
            var args = w.GentooLogger.q.shift();
            w.GentooLogger.process(args);
        }
    }

    // Initialize or get existing GentooLogger
    var existingGentooLogger = w.GentooLogger;
    w.GentooLogger = createQueueProcessor();

    // Process any existing queue items
    if (existingGentooLogger && existingGentooLogger.q) {
        existingGentooLogger.q.forEach(function (args) {
            w.GentooLogger.process(args);
        });
    }
})(window, document);


GentooLogger('boot', {
    partnerType: 'cafe24',
})

GentooLogger('init', {});