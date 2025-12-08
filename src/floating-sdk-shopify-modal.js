import '../global.css'
import './floating-sdk-modal.css';
import { 
    getChatbotData, 
    postChatUserId, 
    getFloatingData, 
    postChatEventLog, 
    postChatEventLogLegacy,
    generateGuestUserToken,
    getBootConfig, 
    checkTrainingProgress,
    fetchShopifyExperimentData,
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
import { 
    checkExperimentTarget,
    getDualtronUSAMessage,
    getBoostedUSAMessage,
    getVomfassMessage,
    getPaperTreeMessage,
} from './utils/shopifySdkUtils';

class FloatingButton {
    constructor(props) {
        // 기본적으로 iframe 내에서 실행 방지, 다음은 허용된 도메인 목록
        this.allowedDomainsForIframe = [
            'admin.shopify.com',
            '*.myshopify.com',
            'shopify-test.gentooai.com',
            '*.shopify-partners.com',
            'localhost',
            '127.0.0.1'
        ];
        this.FLOATING_MESSAGE_INTERVAL_MS = 30000;
        this.FLOATING_MESSAGE_DISPLAY_MS = 12000;
        this.TYPING_ANIMATION_SPEED_MS = 800;
        this.MIN_TYPING_SPEED_MS = 50;
        this.isExperimentTarget = checkExperimentTarget();

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
        if (!props.partnerId || !props.authCode) {
            throw new Error(
                "Missing required parameters: partnerId, authCode are required"
            );
        }

        this.lang = 'en';
        this.partnerType = props.partnerType || 'shopify';
        this.partnerId = props.partnerId;
        this.authCode = props.authCode;
        this.itemId = props.itemId || null;
        this.displayLocation = props.displayLocation || "HOME";
        this.udid = props.udid || "";
        this.utm = props.utm;
        this.gentooSessionData = JSON.parse(sessionStorage.getItem('gentoo')) || {};
        this.sessionId = this.gentooSessionData?.sessionId || `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        if (!this.gentooSessionData?.sessionId) {
            this.gentooSessionData.sessionId = this.sessionId;
            sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
        }
        this.chatUserId = this.gentooSessionData?.cuid || null;
        this.browserWidth = logWindowWidth(window);
        this.isSmallResolution = this.browserWidth < 601;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isDestroyed = false;
        this.isInitialized = false;  // Add flag to track initialization
        this.floatingCount = 0;
        this.floatingClicked = false;
        this.floatingMessage = '';
        this.availableComments = null;
        this.selectedCommentSet = null;
        this.floatingMessageIntervalId = null;
        this.currentTypingTimeoutId = null;
        this.warningMessage;
        this.warningActivated;
        this.floatingAvatar;
        this.floatingMessage;
        this.customFloatingImage = null;
        this.iframeHeightState;
        this.viewportInjected = false;
        this.originalViewport = null;
        this.isInteractingWithSend = false;
        /* 플로팅 버튼 드래그하여 위치 변동 기능 */
        this.isDraggingFloating = false;
        this._dragMoved = false;
        this._dragStart = { x: 0, y: 0, right: 0, bottom: 0 };
        // dualtronusa 전용 커스텀 플로팅 이미지
        if (window.location.hostname === 'dualtronusa.com') {
            this.customFloatingImage = 'https://gentoo-public.s3.ap-northeast-2.amazonaws.com/gentoo-floating-parts-small.png';
        }
        this.pageList = [];
        this.eventCallback = {
            show: null,
            click: null,
            formSubmitted: null,
            userSentMessage: null,
        }
        // 🛡️ 메모리 누수 방지를 위한 다중 cleanup 전략
        this.handlePageUnload = this.handlePageUnload.bind(this);
        window.addEventListener('pagehide', this.handlePageUnload);
        window.addEventListener('beforeunload', this.handlePageUnload);

        // Add a promise to track initialization status
        this.bootPromise = checkTrainingProgress(this.partnerId).then((canProceed) => {
            if (!canProceed) {
                console.warn("GentooIO: Training not completed, skipping initialization");
                window.__GentooInited = 'training_incomplete';
                return Promise.reject(new Error("Training not completed"));
            }

            return Promise.all([
                postChatUserId(this.authCode, this.udid, this.partnerId, this.chatUserId).then((res) => {
                    if (!res) throw new Error("Failed to fetch chat user ID");
                    this.chatUserId = res;
                    this.gentooSessionData.cuid = res;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                })
                .catch(() => {
                    this.chatUserId = 'test';
                }),
                getChatbotData(this.partnerId, this.chatUserId).then((res) => {
                    if (!res) throw new Error("Failed to fetch chatbot data");
                    this.chatbotData = res;
                    this.floatingAvatar = res?.avatar || null;
                    const warningMessageData = this.chatbotData?.experimentalData.find(item => item.key === "warningMessage");
                    this.warningMessage = warningMessageData?.extra?.message;
                    this.warningActivated = warningMessageData?.activated;
                }),
                getFloatingData(this.partnerId, this.displayLocation, this.itemId, this.chatUserId).then((res) => {
                    if (!res) throw new Error("Failed to fetch floating data");
                    this.floatingData = res;
                }),
                getBootConfig(this.chatUserId, window.location.href, this.displayLocation, this.itemId, this.partnerId).then((res) => {
                    if (!res) throw new Error("Failed to fetch boot config");
                    this.bootConfig = res;
                }),
            ]);
        }).catch((error) => {
            if (error.message === "Training not completed") {
                console.log("GentooIO: Training incomplete, stopping initialization");
                return; // 학습 미완료는 정상적인 중단이므로 에러로 처리하지 않음
            }
            console.error(`Error during initialization: ${error}`);
            throw error;
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

            if (this.isExperimentTarget && !this.gentooSessionData?.redirectState) {
                const currentHref = window.location.href;
                const hostname = window.location.hostname;
                let customMessage = null;

                // 🎯 도메인별 커스텀 메시지 매칭
                switch(hostname) {
                    case 'dualtronusa.com':
                        customMessage = getDualtronUSAMessage(currentHref);
                        break;
                    case 'boostedusa.com':
                        customMessage = getBoostedUSAMessage(currentHref);
                        break;
                    case 'vomfassghirardellisquare.com':
                        customMessage = getVomfassMessage(currentHref);
                        break;
                    case 'paper-tree.com':
                        customMessage = getPaperTreeMessage(currentHref);
                        break;
                    // 새 스토어 추가 시 여기에 case 추가
                }

                // 커스텀 메시지가 매칭되었으면 적용
                if (customMessage) {
                    this.availableComments = [customMessage];
                    this.selectedCommentSet = customMessage;
                    this.floatingData.comment = customMessage.floating;
                }
                // 기존 실험 대상 스토어 로직 (paper-tree, saranghello, olivethisolivethat)
                else if (currentHref.includes('paper-tree.com') &&
                    currentHref.includes('search') &&
                    document.body.textContent.includes('No results found for')) {
                    this.availableComments = [
                        {
                            "floating": "Can't find what you're looking for?",
                            "greeting": "I'm here to help you find the perfect product. Can you tell me what you're looking for?",
                        },
                    ];
                    this.selectedCommentSet = this.availableComments[0];
                    this.floatingData.comment = this.selectedCommentSet.floating;
                }
                else if (currentHref.includes('saranghello.com') &&
                        currentHref.includes('search') &&
                        document.querySelector('.grid-product__tag--sold-out')) {
                    this.availableComments = [
                        {
                            "floating": "Is the item you want sold out?",
                            "greeting": "Looking for a specific album or merch?  If it's sold out, just tell me the name and your email — I'll notify you.  (e.g. youremail@gmail.com, STRAY KIDS - KARMA - ACCORDION VERSION)",
                        },
                    ];
                    this.selectedCommentSet = this.availableComments[0];
                    this.floatingData.comment = this.selectedCommentSet.floating;
                }
                else if (currentHref.includes('olivethisolivethat.com') &&
                        currentHref.includes('/collections/')) {

                    const collectionMessages = {
                        'extra-virgin-olive-oil': {
                            floating: "Curious how these oils differ from each other?",
                            greeting: "Are you looking for a spicy, grassy, or mild olive oil or vinegar? Or is there a specific product you'd like to learn more about?"
                        },
                        'infused-olive-oils': {
                            floating: "Curious how these oils differ from each other?",
                            greeting: "Are you looking for a spicy, grassy, or mild olive oil or vinegar? Or is there a specific product you'd like to learn more about?"
                        },
                        'balsamic-fruit-vinegars': {
                            floating: "Curious how these vinegars differ from each other?",
                            greeting: "Are you looking for a earthy sweet, or refreshing vinegar? Or is there a specific product you'd like to learn more about?"
                        }
                    };

                    const matchedCollection = Object.keys(collectionMessages).find(
                        slug => currentHref.includes(`/collections/${slug}`)
                    );

                    if (matchedCollection) {
                        const messages = collectionMessages[matchedCollection];
                        this.availableComments = [messages];
                        this.selectedCommentSet = this.availableComments[0];
                        this.floatingData.comment = this.selectedCommentSet.floating;
                    }
                }
                else if (this.displayLocation === 'PRODUCT_DETAIL') {
                    const pdpComment = this.floatingData?.comment;
                    this.availableComments = [
                        {
                            "floating": pdpComment,
                            "greeting": null,
                        },
                    ];
                    this.selectedCommentSet = this.availableComments[0];
                }
                // Fallback: 기존 실험 API 호출
                else {
                    this.experimentData = await fetchShopifyExperimentData(this.partnerId);

                    if (this.experimentData && this.experimentData?.comments && this.experimentData?.comments?.length > 0) {
                        this.availableComments = this.experimentData.comments;

                        if (this.availableComments && this.availableComments?.length > 0) {
                            const randomIndex = Math.floor(Math.random() * this.availableComments.length);
                            this.selectedCommentSet = this.availableComments[randomIndex];

                            if (this.selectedCommentSet && this.selectedCommentSet?.floating) {
                                this.floatingData.comment = this.selectedCommentSet.floating;
                            }
                        }
                    }
                }
            }

            // this.chatUrl = `${process.env.API_CHAT_HOST_URL}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;
            this.chatUrl = `${process.env.API_CHAT_HOST_URL}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&mode=modal&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}&lang=en`;

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
        this.enableChat((this.isMobileDevice || this.isSmallResolution) ? 'shrink' : 'full');
        if (this.isMobileDevice || this.isSmallResolution) { history.pushState({ chatOpen: true }, '', window.location.href); }

        // Prevent native scroll gestures interfering with drag-resize on header
        if (this.chatHeader) {
            this.chatHeader.style.touchAction = 'none';
        }

        this.chatHeader?.addEventListener("touchmove", (e) => {
            this.handleTouchMove(e, this.iframeContainer);
        }, { passive: false });

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
        if (this.handleResize) {
            window.removeEventListener("resize", this.handleResize);
        }
        if (this.button && this.buttonClickHandler) {
            this.button.removeEventListener("click", this.buttonClickHandler);
        }
        if (this.expandedButton && this.expandedButtonClickHandler) {
            this.expandedButton.removeEventListener(
                "click",
                this.expandedButtonClickHandler
            );
        }

        // Remove event listeners for the input container
        if (this.inputContainer) {
            if (this.inputContainerClickHandler) {
                this.inputContainer.removeEventListener("click", this.inputContainerClickHandler);
            }
            if (this.inputContainerBlurHandler) {
                this.inputContainer.removeEventListener("blur", this.inputContainerBlurHandler);
            }
        }

        // Remove all DOM elements
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }
        if (this.expandedButton && this.expandedButton.parentNode) {
            this.expandedButton.parentNode.removeChild(this.expandedButton);
        }
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

    async addProductToCart(product) {
        console.log('not supported yet');
        return;
    }

    async addProductWithOptionsToCart(productBulkObject) {
        console.log('not supported yet');
        return;
    }

    handleTouchMove(e, iframeContainer) {
        if (e && e.cancelable) e.preventDefault();
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
        if (e && e.cancelable) e.preventDefault();
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
            if (this.isMobileDevice || this.isSmallResolution) this.iframeContainer.style.height = "400px";
            if (this.chatHeader) {
                while (this.chatHeader.firstChild) {
                    this.chatHeader.removeChild(this.chatHeader.firstChild);
                }
                this.chatHeaderText.innerText = this.chatbotData?.name || 'Gentoo';
                while (this.chatHeaderProfile.firstChild) {
                    this.chatHeaderProfile.removeChild(this.chatHeaderProfile.firstChild);
                }
                this.chatHeaderProfile.appendChild(this.chatHeaderImage);
                this.chatHeaderProfile.appendChild(this.chatHeaderText);
                this.chatHeader.appendChild(this.chatHeaderProfile);
                this.chatHeader.appendChild(this.chatHandler);
                this.chatHeader.appendChild(this.closeButtonContainer);
            }
        } else if (mode === "full") {
            this.iframeContainer.className = "iframe-container";
            if (this.chatHandler) this.chatHandler.classList.add('visibility-hidden');
            if (this.isMobileDevice || this.isSmallResolution) this.iframeContainer.style.height = "99%";
            if (this.chatHeader) {
                while (this.chatHeader.firstChild) {
                    this.chatHeader.removeChild(this.chatHeader.firstChild);
                }
                this.chatHeaderText.innerText = 'Gentoo';
                this.chatHeader.appendChild(this.chatHeaderText);
                this.chatHeader.appendChild(this.closeButtonContainer);
            }
        } else {
            return;
        }
    }

    hideChat() {
        // Delete viewport meta tag
        deleteViewport(this, document);

        if (this.button) {
            if (this.isSmallResolution) {
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image-md'}`;
            } else {
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
            }
        }
        if (this.dotLottiePlayer) this.dotLottiePlayer.classList.remove('hide');
        if (this.expandedButton) this.expandedButton.className = "expanded-button hide";
        this.iframeContainer.className = "iframe-container iframe-container-hide";
    }

    // 🎯 플로팅 메시지 생성 공통 함수 (기존 로직 기반)
    createFloatingMessage(messageText, shouldIncrementCounter = false) {
        if (!messageText || typeof messageText !== 'string' || messageText.length === 0) {
            console.warn('Invalid messageText for floating message:', messageText);
            return;
        }

        // 기존 코드의 안전장치들 유지
        if (this.floatingClicked || this.isDestroyed || !this.floatingContainer)
            return;

        // 기존 타이핑 애니메이션과 expandedButton 정리 (새로운 메시지용) - 안전한 제거
        this.clearCurrentTyping();
        this.safeRemoveExpandedButton();

        // 🗨️ 플로팅 문구 UI 요소 생성 (기존 로직 그대로)
        this.expandedButton = document.createElement("div");
        this.expandedText = document.createElement("p");
        
        if (this.isSmallResolution) {
            this.expandedButton.className = 
                !this.floatingAvatar || this.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                "expanded-area-md" :
                "expanded-area-md expanded-area-neutral-md";
            this.expandedText.className = "expanded-area-text-md";
        } else {
            this.expandedButton.className = 
                !this.floatingAvatar || this.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                "expanded-area" :
                "expanded-area expanded-area-neutral";
            this.expandedText.className = "expanded-area-text";
        }
        this.expandedButton.appendChild(this.expandedText);

        // 기존 코드의 안전한 DOM 추가 로직 유지
        if (this.floatingContainer && this.floatingContainer.parentNode) {
            this.floatingContainer.appendChild(this.expandedButton);

            // ⚡ 플로팅 문구 타이핑 애니메이션 (기존 로직 기반)
            let i = 0;
            const typeSpeed = Math.max(this.MIN_TYPING_SPEED_MS, this.TYPING_ANIMATION_SPEED_MS / messageText.length); // 최소 타이핑 속도 보장
            const addLetter = () => {
                // 기존 안전장치 유지 + DOM 존재 확인
                if (!messageText || !this.expandedText || !this.expandedText.parentNode) return;
                if (i < messageText.length && !this.isDestroyed) {
                    try {
                        this.expandedText.innerText += messageText[i];
                        i++;
                        if (i < messageText.length && !this.isDestroyed) {
                            // 다음 타이핑을 예약하고 ID 저장 (충돌 방지)
                            this.currentTypingTimeoutId = setTimeout(addLetter, typeSpeed);
                        } else {
                            // 타이핑 완료시 ID 초기화
                            this.currentTypingTimeoutId = null;
                        }
                    } catch (error) {
                        console.warn('Error during typing animation:', error);
                        this.currentTypingTimeoutId = null;
                    }
                }
            };
            addLetter();
            
            // 카운터 증가 (옵션)
            if (shouldIncrementCounter) {
                this.floatingCount += 1;
            }

            // 7초 후 제거 (안전한 제거 메서드 사용)
            setTimeout(() => {
                this.safeRemoveExpandedButton();
            }, this.FLOATING_MESSAGE_DISPLAY_MS);
        }
    }

    // Method to display a random floating message (uses common function)
    showRandomFloatingMessage() {
        if (!this.availableComments || this.availableComments?.length === 0) {
            return;
        }

        if (this.availableComments && this.availableComments?.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.availableComments.length);
            this.selectedCommentSet = this.availableComments[randomIndex];
        }

        if (!this.selectedCommentSet || !this.selectedCommentSet.floating || typeof this.selectedCommentSet.floating !== 'string') {
            console.warn('Invalid comment data for floating message:', this.selectedCommentSet);
            return;
        }

        this.createFloatingMessage(this.selectedCommentSet.floating, false);
    }

    // 현재 진행 중인 타이핑 애니메이션 중단
    clearCurrentTyping() {
        if (this.currentTypingTimeoutId) {
            clearTimeout(this.currentTypingTimeoutId);
            this.currentTypingTimeoutId = null;
        }
    }

    safeRemoveExpandedButton() {
        // 타이핑 애니메이션 먼저 중단
        this.clearCurrentTyping();
        
        try {
            if (this.expandedButton && 
                this.expandedButton.parentNode && 
                this.floatingContainer &&
                this.expandedButton.parentNode === this.floatingContainer) {
                this.floatingContainer.removeChild(this.expandedButton);
            }
        } catch (error) {
            console.warn('Error removing expanded button:', error);
        }
    }

    // 🛡️ 페이지 언로드 시 리소스 정리 (다중 이벤트 대응)
    handlePageUnload() {
        this.cleanup();
    }

    // 🧹 리소스 정리 메서드 (멱등성 보장)
    cleanup() {
        if (this.isDestroyed) return; // 중복 실행 방지
        
        // interval 정리
        if (this.floatingMessageIntervalId) {
            clearInterval(this.floatingMessageIntervalId);
            this.floatingMessageIntervalId = null;
        }
        
        // 타이핑 애니메이션 정리
        this.clearCurrentTyping();
        
        // 이벤트 리스너 정리
        window.removeEventListener('pagehide', this.handlePageUnload);
        window.removeEventListener('beforeunload', this.handlePageUnload);
        
        this.isDestroyed = true;
    }

    redirectToCartPage() {
        return;
    }

    setPageList(pageList) {
        this.pageList = pageList;
    }

    sendPostMessageHandler(payload) {
        if (this.selectedCommentSet && this.selectedCommentSet?.greeting) {
            if (this.displayLocation !== 'PRODUCT_DETAIL') {
                payload.customizedGreeting = this.selectedCommentSet.greeting;
            }
        }

        this.iframe.contentWindow.postMessage(payload, "*");
    }

    async sendLog(input) {
        try {
            await this.bootPromise;
            // Ensure chatUserId exists (refresh if needed)
            try {
                const refreshed = await postChatUserId(input.authCode, this.udid, this.partnerId, this.chatUserId);
                if (refreshed) {
                    this.chatUserId = refreshed;
                    this.gentooSessionData.cuid = refreshed;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                }
            } catch {}

            return postChatEventLogLegacy({
                eventCategory: input.eventCategory,
                partnerId: String(input.partnerId || this.partnerId),
                chatUserId: String(this.chatUserId),
                products: input.products,
            }, this.isMobileDevice);
        } catch (error) {
            console.error("Failed to send log:", error);
            throw error;
        }
    }

    getGentooShowEvent(callback) {
        // Execute the callback function
        if (typeof callback === "function" && this.eventCallback) {
            this.eventCallback.show = callback;
        }
    }

    getGentooClickEvent(callback) {
        // Execute the callback function
        if (typeof callback === "function" && this.eventCallback) {
            this.eventCallback.click = callback;
        }
    }

    getFormSubmittedEvent(callback) {
        // Execute the callback function
        if (typeof callback === "function" && this.eventCallback) {
            this.eventCallback.formSubmitted = callback;
        }
    }

    getUserSentMessageEvent(callback) {
        // Execute the callback function
        if (typeof callback === "function" && this.eventCallback) {
            this.eventCallback.userSentMessage = callback;
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