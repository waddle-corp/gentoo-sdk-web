import '../global.css'
import './floating-sdk-modal.css';
import { 
    getChatbotData, 
    postChatUserId, 
    getFloatingData, 
    getGodomallPartnerId, 
    postChatEventLog, 
    getBootConfig, 
} from './apis/chatConfig';
import { createUIElementsModal } from './utils/createUIElementsModal';
import { 
    injectLottie, 
    injectViewport,
    deleteViewport,
    logWindowWidth,
    checkSDKExists,
    isAllowedDomainForIframe
} from './utils/floatingSdkUtils';

class FloatingButton {
    constructor(props) {
        // 기본적으로 iframe 내에서 실행 방지, 다음은 허용된 도메인 목록
        this.allowedDomainsForIframe = [
            'admin.shopify.com',
            '*.myshopify.com',
        ];

        if (window.__GentooInited !== null && window.__GentooInited !== undefined) {
            console.warn("GentooIO constructor called twice, skipping second call.");
            return;
        }

        const isInIframe = window !== window.top;
        const isAllowedDomain = isAllowedDomainForIframe(this, window, document);
        if (isInIframe && !isAllowedDomain) {
            console.warn("GentooIO instantiation attempted in iframe. SDK should only be instantiated in the top document.");
            window.__GentooInited = 'iframe_blocked';
            return;
        }

        // Check for existing SDK elements 
        if (checkSDKExists(window, document)) {
            console.warn("GentooIO UI elements already exist in the document, skipping initialization.");
            window.__GentooInited = 'created';
            return;
        }

        this.partnerType = props.partnerType || 'godomall';
        this.partnerId = props.partnerId;
        this.utm = props.utm;
        this.gentooSessionData = JSON.parse(sessionStorage.getItem('gentoo')) || {};
        this.sessionId = this.gentooSessionData?.sessionId || `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        if (!this.gentooSessionData?.sessionId) {
            this.gentooSessionData.sessionId = this.sessionId;
            sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
        }
        this.chatUserId = this.gentooSessionData?.cuid || null;
        this.userType;
        this.displayLocation;
        this.browserWidth = logWindowWidth(window);
        this.isSmallResolution = this.browserWidth < 601;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isDestroyed = false;
        this.isInitialized = false;  // Add flag to track initialization
        this.floatingCount = 0;
        this.floatingClicked = false;
        this.floatingMessage = '';
        this.warningMessage;
        this.warningActivated;
        this.floatingAvatar;
        this.floatingMessage;
        this.itemId = this.getProductNo();
        this.iframeHeightState;
        this.viewportInjected = false;
        this.originalViewport = null;
        this.isInteractingWithSend = false;
        /* 플로팅 버튼 드래그하여 위치 변동 기능 */
        this.isDraggingFloating = false;
        this._dragMoved = false;
        this._dragStart = { x: 0, y: 0, right: 0, bottom: 0 };

        // Ensure trackingKey is injected into order form if present
        this.injectTrackingKeyIntoOrderForm();

        this.bootPromise = new Promise((resolve, reject) => {
            /* 고도몰 init process */

            this.godomallAPI = window.GodomallSDK.init(process.env.GODOMALL_SYSTEMKEY);

            const getMallInfoPromise = new Promise((resolve, reject) => {
                this.godomallAPI.getMallInfo((err, res) => {
                    if (err) {
                        reject(new Error(`Error while calling godomall getMallInfo api: ${err}`));
                    } else {
                        resolve(res);
                    }
                });
            });

            const getMemberProfilePromise = new Promise((resolve, reject) => {
                this.godomallAPI.getMemberProfile((err, res) => {
                    if (err) {
                        // Handle guest users who get 403 error - they're not logged in
                        // console.log('User is guest (not logged in):', err);
                        resolve(null); // Resolve with null for guest users
                    } else {
                        resolve(res);
                    }
                });
            });

            Promise.all([getMallInfoPromise, getMemberProfilePromise])
                .then(([mallInfo, memberProfile]) => {
                    const godomallMallId = mallInfo.mallDomain.split('.')[0];
                    const partnerIdPromise = getGodomallPartnerId(godomallMallId)
                        .then(partnerId => {
                            this.partnerId = partnerId;
                            return partnerId;
                        });

                    // Handle both member and guest users
                    this.godomallUserId = memberProfile?.id || null;
                    this.userType = memberProfile?.id ? "member" : "guest";

                    // 비회원이면 난수로 대체
                    if (!this.godomallUserId || this.godomallUserId.length === 0) {
                        if (sessionStorage.getItem('gentooGuest')) {
                            this.godomallUserId = sessionStorage.getItem('gentooGuest');
                        } else {
                            this.godomallUserId = generateGuestUserToken();
                            sessionStorage.setItem('gentooGuest', this.godomallUserId);
                        }
                    }

                    // Wait for partner ID before fetching chat user ID
                    return partnerIdPromise.then(partnerId => {
                        return postChatUserId(this.godomallUserId, '', partnerId, this.chatUserId);
                    });
                })
                .then(chatUserId => {
                    this.chatUserId = chatUserId;
                    this.gentooSessionData.cuid = chatUserId;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));

                    return Promise.all([
                        getChatbotData(this.partnerId, chatUserId),
                        getFloatingData(this.partnerId, this.displayLocation, this.itemId, chatUserId),
                        getBootConfig(this.chatUserId, window.location.href, this.displayLocation, this.itemId, this.partnerId)
                    ]);
                })
                .then(([chatbotData, floatingData, bootConfig]) => {
                    this.chatbotData = chatbotData;
                    this.floatingData = floatingData;
                    this.bootConfig = bootConfig;
                    const warningMessageData = chatbotData?.experimentalData?.find(item => item.key === "warningMessage");
                    this.warningMessage = warningMessageData?.extra?.message;
                    this.warningActivated = warningMessageData?.activated;
                    this.floatingAvatar = chatbotData?.avatar;
                    const floatingZoom = chatbotData?.experimentalData?.find(item => item.key === "floatingZoom");
                    this.floatingZoom = floatingZoom?.activated;
                    resolve();
                })
                .catch(error => {
                    console.error('Initialization error:', error);
                    reject(error);
                });
        });
    }

    async init(params) {
        if (window.__GentooInited !== null && window.__GentooInited !== undefined) {
            console.warn("GentooIO init called twice, skipping second call.");
            return;
        }

        const isInIframe = window !== window.top;
        const isAllowedDomain = isAllowedDomainForIframe(this, window, document);
        if (isInIframe && !isAllowedDomain) {
            console.warn("GentooIO initialization attempted in iframe. SDK should only be initialized in the top document.");
            window.__GentooInited = 'iframe_blocked';
            return;
        }

        if (checkSDKExists(window, document)) {
            console.warn("GentooIO UI elements already exist in the document, skipping initialization.");
            window.__GentooInited = 'created';
            return;
        }

        await injectLottie(document);
        window.__GentooInited = 'init';
        const { position, showGentooButton = true, isCustomButton = false } = params;

        try {
            // Wait for boot process to complete
            await this.bootPromise;

            if (this.isInitialized) {
                console.warn('FloatingButton is already initialized');
                return;
            }

            if (!this.chatUserId || !this.chatbotData) {
                throw new Error('Required data not yet loaded');
            }

            this.isInitialized = true;

            // this.chatUrl = `${process.env.API_CHAT_HOST_URL}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;
            this.chatUrl = `https://accio-webclient-git-seo-4844-waddle.vercel.app/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&mode=modal&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;

            // Create UI elements after data is ready
            if (this.isDestroyed) this.destroy();
            else if (!this.bootConfig?.floating?.isVisible) {
            } else { 
                createUIElementsModal(
                    this, // this 객체를 첫 번째 인자로 전달
                    position,
                    showGentooButton,
                    isCustomButton,
                    this.customButton,
                    this.chatbotData,
                );
            }

        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }

    // Separate UI creation into its own method for clarity (createUIElementsModal)

    // Seperate event listener set up into its own method for clarity (setupEventListenersModal)

    openChat() {
        if (this.isDraggingFloating) return;
        // Inject viewport meta tag to block ios zoom in
        injectViewport(this, document);
        // Chat being visible
        this.enableChat(this.isMobileDevice ? 'shrink' : 'full');
        if (this.isMobileDevice) { history.pushState({ chatOpen: true }, '', window.location.href); }

        this.chatHeader?.addEventListener("touchmove", (e) => {
            this.handleTouchMove(e, this.iframeContainer);
        }, { passive: true });

        this.chatHeader?.addEventListener("touchend", (e) => {
            this.handleTouchEnd(
                e,
                this.iframeContainer,
                this.button,
                this.expandedButton,
            );
        });

        this.chatHeader?.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.handleMouseDown(e, this.iframe);
            const onMouseMove = (e) => {
                e.preventDefault();
                this.handleMouseMove(e, this.iframeContainer);
            };
            const onMouseUp = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleMouseUp(
                    e,
                    this.iframeContainer,
                    this.iframe,
                    this.button,
                    this.expandedButton,
                );
                document.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };
            document.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });
    }

    remove() {
        if (this.button) {
            document.body.removeChild(this.button);
        }
        if (this.expandedButton) {
            document.body.removeChild(this.expandedButton);
        }
        if (this.iframeContainer) {
            document.body.removeChild(this.iframeContainer);
        }
        this.button = null;
        this.expandedButton = null;
        this.iframeContainer = null;
    }

    destroy() {
        if (window.__GentooInited !== 'created') {
            console.log('FloatingButton instance is not created');
            return;
        }
        this.isDestroyed = true;

        console.log('Destroying FloatingButton instance');

        // Delete viewport meta tag
        deleteViewport(this, document);

        // Remove event listeners
        window.removeEventListener("resize", this.handleResize);
        if (this.button) {
            this.button.removeEventListener("click", this.buttonClickHandler);
        }
        if (this.expandedButton) {
            this.expandedButton.removeEventListener(
                "click",
                this.expandedButtonClickHandler
            );
        }

        // Remove event listeners for the input container
        this.inputContainer.removeEventListener("click", this.inputContainerClickHandler);
        this.inputContainer.removeEventListener("blur", this.inputContainerBlurHandler);

        // Remove all DOM elements
        if (this.floatingContainer && this.floatingContainer.parentNode) {
            this.floatingContainer.parentNode.removeChild(this.floatingContainer);
        }
        if (this.iframeContainer && this.iframeContainer.parentNode) {
            this.iframeContainer.parentNode.removeChild(this.iframeContainer);
        }

        // Reset all properties
        this.button = null;
        this.expandedButton = null;
        this.expandedText = null;
        this.iframeContainer = null;
        this.floatingContainer = null;
        this.chatHeader = null;
        this.iframe = null;
        this.chatHandler = null;
        this.closeButtonContainer = null;
        this.closeButtonIcon = null;
        this.closeButtonText = null;
        this.chatUserId = null;
        this.floatingData = null;
        this.chatbotData = null;
        this.bootConfig = null;
        this.chatUrl = null;

        // Reset state flags
        this.isInitialized = false;
        this.floatingCount = 0;
        this.floatingClicked = false;

        window.__GentooInited = null;
    }

    // Inject hidden trackingKey input with this.sessionId into #frmOrder, if present
    injectTrackingKeyIntoOrderForm() {
        const insertOrUpdateTrackingKey = () => {
            const form =
                document.getElementById('frmOrder') ||
                document.querySelector('form#frmOrder');
            if (!form) return false;
            let input = form.querySelector('input[name="trackingKey"]');
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'trackingKey';
                form.appendChild(input);
            }
            input.value = this.sessionId || '';
            return true;
        };

        if (insertOrUpdateTrackingKey()) return;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                insertOrUpdateTrackingKey();
            }, { once: true });
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            if (insertOrUpdateTrackingKey()) {
                obs.disconnect();
            }
        });
        try {
            observer.observe(document.documentElement || document.body, {
                childList: true,
                subtree: true,
            });
            setTimeout(() => observer.disconnect(), 15000);
        } catch (e) {
            // no-op
        }
    }

    async addProductToCart(product) {
        if (!this.cafe24API) {
            console.error('CAFE24API is not initialized yet');
            return;
        }

        const productObject = {
            product_no: product.product_no,
            variants_code: product.variants_code,
            quantity: product.quantity,
        }

        // Wrap the Cafe24 API call in a Promise for better error handling
        return new Promise((resolve, reject) => {
            this.cafe24API.addCart(
                'A0000',
                product.prepaid_shipping_fee,
                [productObject],
                (err, res) => {
                    if (err) {
                        postChatEventLog({
                            experimentId: "flowlift_abctest_v1",
                            partnerId: this.partnerId,
                            variantId: this.variant,
                            sessionId: this.sessionId || "sess-test",
                            chatUserId: this.chatUserId,
                            userType: this.userType,
                            displayLocation: this.displayLocation,
                            deviceType: this.isMobileDevice ? "mobile" : "web",
                            timestamp: String(Date.now()),
                            eventCategory: "chat_add_to_cart_completed",
                            context: {
                                productId: product.product_no,
                                success: false,
                                errorCode: err.code,
                                path: "direct",
                            }
                        });
                        console.error('Failed to add product to cart:', err);
                        reject(err);
                    } else {
                        this.sendPostMessageHandler({ addedProductToCart: true });
                        postChatEventLog({
                            experimentId: "flowlift_abctest_v1",
                            partnerId: this.partnerId,
                            variantId: this.variant,
                            sessionId: this.sessionId || "sess-test",
                            chatUserId: this.chatUserId,
                            userType: this.userType,
                            displayLocation: this.displayLocation,
                            deviceType: this.isMobileDevice ? "mobile" : "web",
                            timestamp: String(Date.now()),
                            eventCategory: "chat_add_to_cart_completed",
                            context: {
                                productId: product.product_no,
                                success: true,
                                errorCode: null,
                                path: "direct",
                            }
                        });
                        resolve(res);
                    }
                }
            );
        });
    }

    async addProductWithOptionsToCart(productBulkObject) {
        if (!this.cafe24API) {
            console.error('CAFE24API is not initialized yet');
            return;
        }
        /* 
        const addProductWithOptionsToCart = {
            productNo: productInfo.itemId,
            prepaidShippingFee: prepaidShippingFee,
            productList: productList,
        }
        */

        const productListFull = productBulkObject.productList.map(product => ({
            ...product,
            product_no: productBulkObject.productNo,
        }));

        // Wrap the Cafe24 API call in a Promise for better error handling
        return new Promise((resolve, reject) => {
            this.cafe24API.addCart(
                'A0000',
                productBulkObject.prepaidShippingFee,
                productListFull,
                (err, res) => {
                    if (err) {
                        console.error('Failed to add product to cart:', err, res);
                        resolve(err);
                        postChatEventLog({
                            experimentId: "flowlift_abctest_v1",
                            partnerId: this.partnerId,
                            variantId: this.variant,
                            sessionId: this.sessionId || "sess-test",
                            chatUserId: this.chatUserId,
                            userType: this.userType,
                            displayLocation: this.displayLocation,
                            deviceType: this.isMobileDevice ? "mobile" : "web",
                            timestamp: String(Date.now()),
                            eventCategory: "chat_add_to_cart_completed",
                            context: {
                                productId: productBulkObject.productNo,
                                success: false,
                                errorCode: err.code,
                                path: "with_options",
                            }
                        });
                        this.sendPostMessageHandler({ addProductToCartFailed: true });
                    } else {
                        // err 없이 res 안에 error 가 있는 케이스 처리
                        const errorCode = res?.errors?.[0]?.code || res?.errors?.code;
                        if (errorCode) {
                            console.error('Failed to add product to cart:', res);
                            resolve(res);
                            postChatEventLog({
                                experimentId: "flowlift_abctest_v1",
                                partnerId: this.partnerId,
                                variantId: this.variant,
                                sessionId: this.sessionId || "sess-test",
                                chatUserId: this.chatUserId,
                                userType: this.userType,
                                displayLocation: this.displayLocation,
                                deviceType: this.isMobileDevice ? "mobile" : "web",
                                timestamp: String(Date.now()),
                                eventCategory: "chat_add_to_cart_completed",
                                context: {
                                    productId: productBulkObject.productNo,
                                    success: false,
                                    errorCode: errorCode,
                                    path: "with_options",
                                }
                            });
                            this.sendPostMessageHandler({ addProductToCartFailed: true });
                            return;
                        }
                        postChatEventLog({
                            experimentId: "flowlift_abctest_v1",
                            partnerId: this.partnerId,
                            variantId: this.variant,
                            sessionId: this.sessionId || "sess-test",
                            chatUserId: this.chatUserId,
                            userType: this.userType,
                            displayLocation: this.displayLocation,
                            deviceType: this.isMobileDevice ? "mobile" : "web",
                            timestamp: String(Date.now()),
                            eventCategory: "chat_add_to_cart_completed",
                            context: {
                                productId: productBulkObject.productNo,
                                success: true,
                                errorCode: null,
                                path: "direct",
                            }
                        });
                        this.sendPostMessageHandler({ addedProductWithOptionsToCart: true });
                        // session storage 에 장바구니 담기 실행 여부를 저장 (for redirecting to cart page)
                        if (!sessionStorage.getItem('gentoo_cart_added')) {
                            sessionStorage.setItem('gentoo_cart_added', 'true');
                        }
                        console.log('addedProductWithOptionsToCart', res);
                        resolve(res);
                    }
                }
            );
        });
    }

    handleTouchMove(e, iframeContainer) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!this.prevPosition) {
            this.prevPosition = touch.clientY;
        }

        const diff = touch.clientY - this.prevPosition;
        this.scrollPosition += diff;
        this.prevPosition = touch.clientY;

        const newHeight = iframeContainer.offsetHeight - diff;
        iframeContainer.style.height = `${newHeight}px`
        if (Math.abs(diff) > 1) {
            this.scrollDir = diff > 0 ? 'down' : 'up';
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (this.scrollDir === "up") {
            this.enableChat("full");
        } else if (this.scrollDir === "down") {
            this.hideChat();
        }

        this.prevPosition = null;
        this.scrollPosition = 0;
        this.scrollDir = "";
    }

    handleMouseDown(e, iframe) {
        e.preventDefault();
        // iframe.classList.add("event-disabled");
        const clientY = e.clientY; // Use clientY from mouse event
        if (!this.prevPosition) {
            this.prevPosition = clientY;
        }
    }

    handleMouseMove(e, iframeContainer) {
        e.preventDefault();
        const clientY = e.clientY; // Use clientY from mouse event

        const diff = clientY - this.prevPosition;

        const newHeight = iframeContainer.offsetHeight - diff;
        iframeContainer.style.height = `${newHeight}px`;
        if (Math.abs(diff) > 30) {
            this.scrollDir = diff > 0 ? "down" : "up";
        }
    }

    handleMouseUp(e, iframeContainer, iframe) {
        e.preventDefault();
        // iframe.classList.remove("event-disabled");
        if (this.scrollDir === "up") {
            iframeContainer.style.height = "99%";
            this.enableChat("shrink");
        } else if (this.scrollDir === "down") {
            this.hideChat();
        }

        this.prevPosition = null;
        this.scrollPosition = 0;
        this.scrollDir = "";
    }

    enableChat(mode) {
        if (this.isDraggingFloating) return;

        this.sendPostMessageHandler({ enableMode: mode });

        if (this.isSmallResolution) {
            if (this.button) this.button.className = "floating-button-common hide";
            if (this.expandedButton) this.expandedButton.className = "expanded-button hide";
            if (this.dotLottiePlayer) this.dotLottiePlayer.classList.add('hide');
            if (this.dimmedBackground) this.dimmedBackground.classList.add('hide');
        }
        if (mode === "shrink") {
            this.iframeContainer.className = "iframe-container-shrink";
            if (this.chatHandler) this.chatHandler.classList.remove('visibility-hidden');
            if (this.isMobileDevice) this.iframeContainer.style.height = "400px";
        } else if (mode === "full") {
            this.iframeContainer.className = "iframe-container";
            if (this.chatHandler) this.chatHandler.classList.add('visibility-hidden');
            if (this.isMobileDevice) this.iframeContainer.style.height = "99%";
        } else {
            return;
        }
    }

    hideChat() {
        // Delete viewport meta tag
        deleteViewport(this, document);

        if (this.button) {
            if (this.isSmallResolution) {
                this.button.className = "floating-button-common button-image-md";
            } else {
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
            }
        }
        if (this.dotLottiePlayer) this.dotLottiePlayer.classList.remove('hide');
        if (this.expandedButton) this.expandedButton.className = "expanded-button hide";
        this.iframeContainer.className = "iframe-container iframe-container-hide";
    }

    redirectToCartPage() {
        if (String(sessionStorage.getItem('gentoo_cart_added')) === 'true') {
            sessionStorage.removeItem('gentoo_cart_added');
            window.location.href = '/order/basket.html';
        }
    }

    sendPostMessageHandler(payload) {
        this.iframe.contentWindow.postMessage(payload, "*");
    }

    /**
     * 현재 URL 또는 주어진 URL에서 product_no 값을 추출하는 함수
     * 
     * @param {string} [urlString=window.location.href] - 분석할 URL 문자열
     * @returns {string|null} - 추출된 product_no 값 또는 null (찾을 수 없을 경우)
     */
    getProductNo(urlString = window.location.href) {
        if (urlString.includes('/goods_view')) { this.displayLocation = 'PRODUCT_DETAIL' }
        else if (urlString.includes('/goods_list')) { this.displayLocation = 'PRODUCT_LIST' }
        else { this.displayLocation = 'HOME' }
        try {
            // URL 객체 생성
            const url = new URL(urlString);

            // 1. 쿼리 파라미터에서 goodsNo 추출 시도
            const productNoFromQuery = url.searchParams.get('goodsNo');
            if (productNoFromQuery) {
                return productNoFromQuery;
            }

            // 2. 경로 기반 URL에서 product_no 추출 시도
            const path = url.pathname;

            /**
             * 고려가 필요한 고도몰 경로 패턴
                /goods/goods_view.php?goodsNo={goodsNo}
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
window.FloatingButton = FloatingButton;

(function (global, document) {
    var w = global;

    var fb; // Keep fb in closure scope

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

            // Add UTM parameters
            const parsedUrl = new URL(window.location.href);
            const pathSegments = parsedUrl.pathname.split("/");
            const transitionPage = "/" + pathSegments[1];
            const searchParams = new URLSearchParams(window.location.search);
            const utm = {
                utms: searchParams.get("utm_source"),
                utmm: searchParams.get("utm_medium"),
                utmcp: searchParams.get("utm_campaign"),
                utmct: searchParams.get("utm_content"),
                utmt: searchParams.get("utm_term"),
                tp: transitionPage,
            };

            // Handle boot separately
            if (method === "boot") {
                params.utm = utm;
                try {
                    fb = new FloatingButton(params);
                } catch (error) {
                    console.error("Failed to create FloatingButton instance:", error);
                }
                return;
            }

            // For all other methods, ensure instance exists
            if (!fb) {
                console.error("GentooIO: Must call boot() before using this method");
                return;
            }

            // Process method
            switch (method) {
                case "init":
                    if (typeof fb.init === "function") {
                        Promise.resolve(fb.init(params)).catch((error) => {
                            console.error("Failed to initialize GentooIO:", error);
                        });
                    }
                    break;
                case "openChat":
                    if (typeof fb.openChat === "function") {
                        Promise.resolve(fb.openChat()).catch((error) => {
                            console.error("Failed to open GentooIO chat:", error);
                        });
                    }
                    break;
                case "unmount":
                    if (typeof fb.destroy === "function") {
                        Promise.resolve(fb.destroy()).catch((error) => {
                            console.error("Failed to unmount GentooIO:", error);
                        });
                    }
                    break;
                case "sendLog":
                    if (typeof fb.sendLog === "function") {
                        Promise.resolve(fb.sendLog(params)).catch((error) => {
                            console.error("Failed to send GentooIO log:", error);
                        });
                    }
                    break;
                case "setPageList":
                    if (typeof fb.setPageList === "function") {
                        Promise.resolve(fb.setPageList(params)).catch((error) => {
                            console.error("Failed to set GentooIO page list:", error);
                        });
                    }
                    break;
                case "getGentooShowEvent":
                    if (typeof fb.getGentooShowEvent === "function") {
                        Promise.resolve(fb.getGentooShowEvent(params.callback)).catch((error) => {
                            console.error("Failed to get GentooIO event:", error);
                        });
                    }
                    break;
                case "getGentooClickEvent":
                    if (typeof fb.getGentooClickEvent === "function") {
                        Promise.resolve(fb.getGentooClickEvent(params.callback)).catch((error) => {
                            console.error("Failed to get GentooIO event:", error);
                        });
                    }
                    break;
                case "getFormSubmittedEvent":
                    if (typeof fb.getFormSubmittedEvent === "function") {
                        Promise.resolve(fb.getFormSubmittedEvent(params.callback)).catch((error) => {
                            console.error("Failed to get GentooIO event:", error);
                        });
                    }
                    break;
                default:
                    console.error("GentooIO: Unknown method", method);
            }
        };

        return ge;
    }

    function processQueue() {
        while (w.GentooIO.q && w.GentooIO.q.length) {
            var args = w.GentooIO.q.shift();
            w.GentooIO.process(args);
        }
    }

    // Initialize or get existing GentooIO
    var existingGentooIO = w.GentooIO;
    w.GentooIO = createQueueProcessor();

    // Process any existing queue items
    if (existingGentooIO && existingGentooIO.q) {
        existingGentooIO.q.forEach(function (args) {
            w.GentooIO.process(args);
        });
    }
})(window, document);