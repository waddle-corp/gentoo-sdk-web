class Logger {
    constructor(props) {
        // Check for existing SDK elements 
        if (this.checkSDKExists()) {
            console.warn("GentooIO UI elements already exist in the document, skipping initialization.");
            window.__GentooInited = 'created';
            return;
        }
        this.partnerType = props.partnerType || 'gentoo';
        this.gentooSessionData = JSON.parse(sessionStorage.getItem('gentoo')) || {};
        this.chatUserId = this.gentooSessionData?.cuid || null;
        this.displayLocation;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isInitialized = false;  // Add flag to track initialization
        this.itemId = this.getProductNo();
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

        // Modify the CAFE24API initialization to ensure promises are handled correctly
        this.bootPromise = new Promise((resolve, reject) => {
            const ref = document.referrer;
            (function attachScrollTracker() {
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
                    console.log('scrollTop', y);
                    navigator.sendBeacon(
                        `${process.env.API_CHAT_BASE_URL}${process.env.API_USEREVENT_ENDPOINT}`,
                        JSON.stringify({
                            eventCategory: "Scroll",
                            sessionId: this.sessionId,
                            partnerId: this.partnerId,
                            chatUserId: this.chatUserId,
                            userId: this.cafe24MemberId,
                            guestId: this.cafe24GuestId,
                            displayLocation: this.displayLocation,
                            pageLocation: window.location.href,
                            scrollTop: y,
                            documentHeight: document.documentElement.scrollHeight,
                            viewportHeight: window.innerHeight,
                            scrollPercentage: y / (document.documentElement.scrollHeight - window.innerHeight),
                        })
                    );
                }, 100);

                /** passive:true → 스크롤 성능 보호 */
                window.addEventListener('scroll', onScroll, { passive: true });

                /** SDK가 언마운트될 때 정리(선택) */
                window.GentooCleanup = () => {
                    window.removeEventListener('scroll', onScroll);
                };
            })();

            ((CAFE24API) => {
                // Store the CAFE24API instance for use in other methods
                this.cafe24API = CAFE24API;

                // Wrap CAFE24API methods in Promises
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
                        return this.fetchChatUserId(this.cafe24UserId)
                    })
                    .then(chatUserId => {
                        this.chatUserId = chatUserId;
                        this.gentooSessionData.cuid = chatUserId;
                        sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));

                        if (ref) {
                            navigator.sendBeacon(
                                `${process.env.API_CHAT_BASE_URL}${process.env.API_USEREVENT_ENDPOINT}`,
                                JSON.stringify({
                                    eventCategory: "ReferrerOrigin",
                                    sessionId: this.sessionId,
                                    partnerId: this.partnerId,
                                    chatUserId: this.chatUserId,
                                    userId: this.cafe24MemberId,
                                    guestId: this.cafe24GuestId,
                                    displayLocation: this.displayLocation,
                                    pageLocation: window.location.href,
                                    referrerOrigin: ref,
                                })
                            );
                        }
                        // 2. chatUserId가 세팅된 후, 나머지 fetch 실행
                        return Promise.all([
                            // this.fetchChatbotData(this.partnerId, chatUserId),
                            // this.fetchFloatingData(this.partnerId, chatUserId)
                        ]);
                    })
                    .catch(error => {
                        console.error('Initialization error:', error);
                        reject(error);
                    });
            })(CAFE24API.init({
                client_id: this.cafe24ClientId,
                version: this.cafe24Version
            }));
        });
    }

    async init() {
        if (window.__GentooInited !== null && window.__GentooInited !== undefined) {
            console.warn("GentooIO init called twice, skipping second call.");
            return;
        }

        window.__GentooInited = 'init';

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
    }

    setupEventListeners(position) {
        // Button click event
        var buttonClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.floatingClicked = true;

            this.logEvent({
                eventCategory: "FloatingButtonClick",
                chatUserId: this.chatUserId,
                partnerId: this.partnerId,
                products: [],
            });
        };

        window?.addEventListener("message", (e) => {
            if (e.data.redirectState) {
                if (!this.isSmallResolution) {
                    this.gentooSessionData.redirectState = true;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                }
                this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'carouselRedirect', currentPage: e.data.redirectUrl });
                window.location.href = e.data.redirectUrl;
            }

            if (e.data.addProductToCart) {
                this.addProductToCart(e.data.addProductToCart);
            }
        });

        this.floatingContainer?.addEventListener("click", buttonClickHandler);
        this.floatingContainer?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href }));
        this.closeButtonContainer?.addEventListener("click", buttonClickHandler);
        this.closeButtonContainer?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeButtonContainer', currentPage: window?.location?.href }));
        this.closeButtonIcon?.addEventListener("click", buttonClickHandler);
        this.closeActionArea?.addEventListener("click", buttonClickHandler);
        this.closeActionArea?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeActionArea', currentPage: window?.location?.href }));
        this.customButton?.addEventListener("click", buttonClickHandler);
        this.customButton?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href }));
        // this.testButton?.addEventListener("click", testButtonClickHandler);
        // Add event listener for the resize event
        window?.addEventListener("resize", () => {
            this.browserWidth = this.logWindowWidth();
            this.isSmallResolution = this.browserWidth < 601;
            this.updateFloatingContainerPosition(position); // Update position on resize
        });

        window?.addEventListener('popstate', () => {
            if (this.isMobileDevice) {
                this.hideChat();
            }
        });
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

    async fetchChatUserId(userToken, udid = "") {
        const convertedUserToken = (userToken && userToken !== 'null') ? String(userToken) : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const params = {
            externalKey: String(this.partnerId),
            userToken: convertedUserToken,
            udid: String(udid),
            chatUserId: this.chatUserId ? String(this.chatUserId) : null
        }

        try {
            const url = `${process.env.API_CHAT_BASE_URL}${process.env.API_AUTH_CAFE24_ENDPOINT}`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(params)
            });

            const res = await response.json();
            return res.chatUserId;
        } catch (error) {
            console.error(`Error while calling fetchChatUserId API: ${error}`)
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

    // SDK가 이미 존재하는지 확인
    checkSDKExists() {
        const isInIframe = window !== window.top;

        // 현재 document의 SDK set 
        const hasDimmedBackground = document.querySelector('div[class^="dimmed-background"][data-gentoo-sdk="true"]') !== null;
        const hasIframeContainer = document.querySelector('div[class^="iframe-container"][data-gentoo-sdk="true"]') !== null;
        const hasFloatingContainer = document.querySelector('div[class^="floating-container"][data-gentoo-sdk="true"]') !== null;

        if (hasDimmedBackground || hasIframeContainer || hasFloatingContainer) {
            return true;
        }

        if (isInIframe) {
            try {
                if (window.top.document) {
                    if (window.top.__GentooInited !== null && window.top.__GentooInited !== undefined) {
                        return true;
                    }

                    // 부모 document의 SDK set 
                    const parentHasDimmedBackground = window.top.document.querySelector('div[class^="dimmed-background"][data-gentoo-sdk="true"]') !== null;
                    const parentHasIframeContainer = window.top.document.querySelector('div[class^="iframe-container"][data-gentoo-sdk="true"]') !== null;
                    const parentHasFloatingContainer = window.top.document.querySelector('div[class^="floating-container"][data-gentoo-sdk="true"]') !== null;

                    return parentHasDimmedBackground || parentHasIframeContainer || parentHasFloatingContainer;
                }
            } catch (e) {
                console.warn("Cannot access parent document due to same-origin policy.");
            }
        }

        return false;
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
            const regex = /^(?:\/[^\/]+)?\/product\/[^\/]+\/([^\/]+)(?:\/category\/[^\/]+\/display\/[^\/]+\/?)?$/;

            const match = path.match(regex);
            if (match && match[1]) {
                return match[1]; // product_no
            }

            // 3. 찾을 수 없는 경우 null 반환
            return null;
        } catch (error) {
            console.error('Invalid URL:', error);
            return null;
        }
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
                case "unmount":
                    if (typeof logger.destroy === "function") {
                        Promise.resolve(logger.destroy()).catch((error) => {
                            console.error("Failed to unmount GentooLogger:", error);
                        });
                    }
                    break;
                case "sendLog":
                    if (typeof logger.sendLog === "function") {
                        Promise.resolve(logger.sendLog(params)).catch((error) => {
                            console.error("Failed to send GentooLogger log:", error);
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

    // Initialize or get existing GentooIO
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