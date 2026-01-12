class FloatingButton {
    constructor(props) {
        this.FLOATING_MESSAGE_INTERVAL_MS = 30000;
        this.FLOATING_MESSAGE_DISPLAY_MS = 12000;
        this.TYPING_ANIMATION_SPEED_MS = 800;
        this.MIN_TYPING_SPEED_MS = 50;

        this.allowedDomainsForIframe = [
            'admin.shopify.com',
            '*.myshopify.com',
            'shopify-test.gentooai.com',
            '*.shopify-partners.com',
            'localhost',
            '127.0.0.1'
        ];

        this.isExperimentTarget = this.checkExperimentTarget();

        // Validate required props
        if (window.__GentooInited !== null && window.__GentooInited !== undefined) {
            console.warn("GentooIO constructor called twice, skipping second call.");
            return;
        }

        const isInIframe = window !== window.top;
        const isAllowedDomain = this.isAllowedDomainForIframe();

        if (isInIframe && !isAllowedDomain) {
            console.warn("GentooIO instantiation attempted in iframe. SDK should only be instantiated in the top document.");
            window.__GentooInited = 'iframe_blocked';
            return;
        }

        // Check for existing SDK elements
        if (this.checkSDKExists()) {
            console.warn("GentooIO UI elements already exist in the document, skipping initialization.");
            window.__GentooInited = 'created';
            return;
        }
        if (!props.partnerId || !props.authCode) {
            throw new Error(
                "Missing required parameters: partnerId, authCode are required"
            );
        }

        this.partnerType = props.partnerType || "shopify"; // 🛍️ Shopify 테스트용 기본값
        this.partnerId = props.partnerId;
        this.authCode = props.authCode;
        this.itemId = props.itemId || null;
        this.displayLocation = props.displayLocation || "HOME";
        this.udid = props.udid || "";
        this.utm = props.utm;
        this.gentooSessionData = JSON.parse(sessionStorage.getItem('gentoo')) || {};
        this.chatUserId = this.gentooSessionData?.cuid || null;
        this.chatbotData;
        this.browserWidth = this.logWindowWidth();
        this.isSmallResolution = this.browserWidth < 601;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.hostSrc;
        this.domains;
        this.isDestroyed = false;
        this.isInitialized = false; // Add flag to track initialization
        this.floatingCount = 0;
        this.floatingClicked = false;
        this.availableComments = null;
        this.selectedCommentSet = null;
        this.floatingMessageIntervalId = null;
        this.currentTypingTimeoutId = null;
        this.warningMessage;
        this.warningActivated;
        this.floatingData;
        this.floatingAvatar;
        this.customFloatingImage = null;
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
        this.iframeHeightState;
        this.viewportInjected = false;
        this.originalViewport = null;

        // 🛡️ 메모리 누수 방지를 위한 다중 cleanup 전략
        this.handlePageUnload = this.handlePageUnload.bind(this);
        window.addEventListener('pagehide', this.handlePageUnload);
        window.addEventListener('beforeunload', this.handlePageUnload);

        // 🧪 Shopify 테스트용 환경 설정
        if (
            window.location.hostname === "dailyshot.co" ||
            window.location.hostname === "dev-demo.gentooai.com" ||
            window.location.hostname === "127.0.0.1" ||
            window.location.hostname === "localhost" ||
            window.location.hostname.includes("shopify-test") ||
            window.location.hostname === "gentoo-bom-shop3.myshopify.com"
        ) {
            // 로컬 테스트 할 때만 localhost:3000에서 실행되는 채팅 웹 사용
            this.hostSrc = "https://dev-demo.gentooai.com";
            this.domains = {
                auth: "https://dev-api.gentooai.com/chat/api/v1/user",
                log: "https://dev-api.gentooai.com/chat/api/v1/event/log",
                logLegacy: "https://dev-api.gentooai.com/chat/api/v1/event/userEvent",
                chatbot: "https://dev-api.gentooai.com/chat/api/v1/chat/chatbot",
                floating: "https://dev-api.gentooai.com/chat/api/v1/chat/floating",
                console: "https://dev-api.gentooai.com",
            };
        } else if (
            window.location.hostname === "stage-demo.gentooai.com"
            // || window.location.hostname === "gentoo-demo-shop-template.lovable.app"
        ) {
            this.hostSrc = "https://stage-demo.gentooai.com";
            this.domains = {
                auth: "https://stage-api.gentooai.com/chat/api/v1/user",
                log: "https://stage-api.gentooai.com/chat/api/v1/event/log",
                logLegacy: "https://stage-api.gentooai.com/chat/api/v1/event/userEvent",
                chatbot: "https://stage-api.gentooai.com/chat/api/v1/chat/chatbot",
                floating: "https://stage-api.gentooai.com/chat/api/v1/chat/floating",
                console: "https://stage-api.gentooai.com",
            };
        } else {
            this.hostSrc = "https://demo.gentooai.com";
            this.domains = {
                auth: "https://api.gentooai.com/chat/api/v1/user",
                log: "https://api.gentooai.com/chat/api/v1/event/log",
                logLegacy: "https://api.gentooai.com/chat/api/v1/event/userEvent",
                chatbot: "https://api.gentooai.com/chat/api/v1/chat/chatbot",
                floating: "https://api.gentooai.com/chat/api/v1/chat/floating",
                console: "https://api.gentooai.com",
            };
        }

        // Add a promise to track initialization status
        this.bootPromise = this.checkTrainingProgress(this.partnerId).then((canProceed) => {
            if (!canProceed) {
                console.warn("GentooIO: Training not completed, skipping initialization");
                window.__GentooInited = 'training_incomplete';
                return Promise.reject(new Error("Training not completed"));
            }

            return Promise.all([
                this.fetchChatUserId(this.authCode, this.udid).then((res) => {
                    if (!res) throw new Error("Failed to fetch chat user ID");
                    this.chatUserId = res;
                    this.gentooSessionData.cuid = res;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                })
                    .catch(() => {
                        this.chatUserId = 'test';
                    }),
                this.fetchChatbotData(this.partnerId).then((res) => {
                    if (!res) throw new Error("Failed to fetch chatbot data");
                    this.chatbotData = res;
                    this.floatingAvatar = res?.avatar || null;
                    const warningMessageData = this.chatbotData?.experimentalData.find(item => item.key === "warningMessage");
                    this.warningMessage = warningMessageData?.extra?.message;
                    this.warningActivated = warningMessageData?.activated;
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
        const isAllowedDomain = this.isAllowedDomainForIframe();
        if (isInIframe && !isAllowedDomain) {
            console.warn("GentooIO initialization attempted in iframe. SDK should only be initialized in the top document.");
            window.__GentooInited = 'iframe_blocked';
            return;
        }

        if (this.checkSDKExists()) {
            console.warn("GentooIO UI elements already exist in the document, skipping initialization.");
            window.__GentooInited = 'created';
            return;
        }

        // this.remove();
        await this.injectLottie();
        window.__GentooInited = 'init';
        const { position, showGentooButton = true, isCustomButton = false } = params;

        try {
            // Wait for boot process to complete
            await this.bootPromise;

            if (this.isInitialized) {
                console.warn("FloatingButton is already initialized");
                return;
            }

            if (!this.chatUserId || !this.chatbotData) {
                throw new Error("Required data not yet loaded");
            }

            this.isInitialized = true;

            this.floatingData = await this.fetchFloatingData(this.partnerId);
            if (!this.floatingData) {
                throw new Error("Failed to fetch floating data");
            }

            if (this.isExperimentTarget && !this.gentooSessionData?.redirectState) {
                const currentHref = window.location.href;
                const hostname = window.location.hostname;
                let customMessage = null;

                // 🎯 도메인별 커스텀 메시지 매칭
                switch (hostname) {
                    case 'dualtronusa.com':
                        customMessage = this.getDualtronUSAMessage(currentHref);
                        break;
                    case 'boostedusa.com':
                        customMessage = this.getBoostedUSAMessage(currentHref);
                        break;
                    case 'vomfassghirardellisquare.com':
                        customMessage = this.getVomfassMessage(currentHref);
                        break;
                    case 'paper-tree.com':
                        customMessage = this.getPaperTreeMessage(currentHref);
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
                    this.experimentData = await this.fetchShopifyExperimentData(this.partnerId);

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

            // 검색 자동 트리거: autoUserMessage 파라미터 생성
            this.autoUserMessage = this.getAutoUserMessage();
            const autoUserMessageParam = this.autoUserMessage ? `&autoUserMessage=${encodeURIComponent(this.autoUserMessage)}` : '';

            if (this.partnerId === '676a4cef7efd43d2d6a93cd7') {
                this.chatUrl = `${this.hostSrc}/chat/49/${this.chatUserId}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}${autoUserMessageParam}`;
            }
            else if (this.partnerId === '676a4b3cac97386117d1838d') {
                this.chatUrl = `${this.hostSrc}/chat/153/${this.chatUserId}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}${autoUserMessageParam}`;
            }
            else {
                // 🎯 채팅 웹 애플리케이션 URL 생성 - SDK에서 iframe으로 로드할 URL
                // 🛍️ Shopify 테스트용 - 기본적으로 영어(en)로 설정
                this.chatUrl = `${this.hostSrc}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}&lang=en${autoUserMessageParam}`;
            }

            // Create UI elements after data is ready
            if (!this.isDestroyed) this.createUIElements(position, showGentooButton, isCustomButton);
            else this.destroy();

        } catch (error) {
            console.error("Failed to initialize:", error);
            throw error;
        }
    }

    // Separate UI creation into its own method for clarity
    createUIElements(position, showGentooButton, isCustomButton = false) {
        // Check if any SDK elements exist in document
        if (this.checkSDKExists()) {
            console.warn("GentooIO UI elements already exist in the document, skipping creation.");
            window.__GentooInited = 'created';
            return;
        }

        window.__GentooInited = 'creating';
        this.customButton = isCustomButton ? (document.getElementById('gentoo-custom-button') || document.getElementsByClassName("gentoo-custom-button")[0]) : null;
        // Add null checks before accessing properties
        if (
            !this.chatbotData ||
            !this.chatbotData.position ||
            !this.chatbotData.mobilePosition
        ) {
            console.error("Chatbot data is incomplete");
            return;
        }

        // customFloatingImage가 있으면 floatingData.imageUrl이 없어도 진행 가능
        if (!this.floatingData || (!this.customFloatingImage && !this.floatingData.imageUrl)) {
            console.error("Floating data is incomplete");
            return;
        }

        if (this.eventCallback.show !== null) {
            this.eventCallback.show();
        }

        // Create iframe elements
        this.dimmedBackground = document.createElement("div");
        this.dimmedBackground.className = "dimmed-background hide";
        this.dimmedBackground.setAttribute("data-gentoo-sdk", "true");
        this.dimmedBackground.appendChild(document.createTextNode('\u200B'));

        this.iframeContainer = document.createElement("div");
        this.iframeContainer.className = "iframe-container iframe-container-hide";
        this.iframeContainer.setAttribute("data-gentoo-sdk", "true");

        this.chatHeader = document.createElement("div");
        this.chatHandler = document.createElement("div");
        this.chatHeaderText = document.createElement("p");
        this.closeButtonContainer = document.createElement("div");
        this.closeButtonIcon = document.createElement("div");
        this.closeButtonText = document.createElement("p");
        this.chatHeaderText.innerText = "Gentoo";
        this.footer = document.createElement("div");
        this.footer.className = "chat-footer";
        this.footerText = document.createElement("p");
        this.footerText.className = "chat-footer-text";
        this.footer.appendChild(this.footerText);

        // 🖼️ 채팅 iframe 생성 - 실제 채팅 인터페이스가 로드될 iframe 요소
        this.iframe = document.createElement("iframe");
        this.iframe.src = this.chatUrl; // 위에서 생성한 chatUrl로 채팅 웹 애플리케이션 로드
        this.iframe.addEventListener('load', () => {
            if (this.autoUserMessage) {
                this.openChat();
            }
        });

        if (!this.customFloatingImage && (this.floatingAvatar?.floatingAsset || this.floatingData.imageUrl.includes('gentoo-anime-web-default.lottie'))) {
            const player = document.createElement('dotlottie-wc');
            player.setAttribute('autoplay', '');
            player.setAttribute('loop', '');
            player.setAttribute('mode', 'normal');
            player.setAttribute('src', this.floatingAvatar?.floatingAsset || this.floatingData.imageUrl);
            player.style.width = this.isSmallResolution ? '68px' : '94px';
            player.style.height = this.isSmallResolution ? '68px' : '94px';
            player.style.cursor = 'pointer';
            player.appendChild(document.createTextNode('\u200B'));

            this.dotLottiePlayer = player;
        }

        if (this.isSmallResolution) {
            this.chatHeader.className = "chat-header-md";
            this.chatHandler.className = "chat-handler-md";
            this.chatHandler.appendChild(document.createTextNode('\u200B'));
            this.chatHeaderText.className = "chat-header-text-md";
            this.closeButtonContainer.className = "chat-close-button-container-md";
            this.closeButtonIcon.className = "chat-close-button-icon-md";
            this.closeButtonIcon.appendChild(document.createTextNode('\u200B'));
            this.closeButtonText.className = "chat-close-button-text-md";
            // 🛍️ Shopify 테스트용 - 영어 텍스트 사용
            this.closeButtonText.innerText = "Collapse";
            this.closeActionArea = document.createElement("div");
            this.closeActionArea.className = "chat-close-action-area-md";
            this.closeActionArea.appendChild(document.createTextNode('\u200B'));
            this.iframe.className = `chat-iframe-md ${this.warningActivated ? 'footer-add-height-md' : ''}`;
            this.closeButtonContainer.appendChild(this.closeButtonIcon);
            this.closeButtonContainer.appendChild(this.closeButtonText);
            this.chatHeader.appendChild(this.chatHeaderText);
            this.chatHeader.appendChild(this.chatHandler);
            this.chatHeader.appendChild(this.closeButtonContainer);
            this.iframeContainer.appendChild(this.closeActionArea);
        } else {
            this.chatHeader.className = "chat-header";
            this.chatHeaderText.className = "chat-header-text";
            this.closeButtonContainer.className = "chat-close-button-container";
            this.closeButtonIcon.className = "chat-close-button-icon";
            this.closeButtonText.className = "chat-close-button-text";
            // 🛍️ Shopify 테스트용 - 영어 텍스트 사용
            this.closeButtonText.innerText = "Minimize";
            this.iframe.className = `chat-iframe ${this.warningActivated ? 'footer-add-height' : ''}`;
            this.closeButtonContainer.appendChild(this.closeButtonIcon);
            this.closeButtonContainer.appendChild(this.closeButtonText);
            this.chatHeader.appendChild(this.chatHeaderText);
            this.chatHeader.appendChild(this.closeButtonContainer);
        }

        this.iframeContainer.appendChild(this.chatHeader);
        this.iframeContainer.appendChild(this.iframe);
        if (this.warningActivated) {
            this.footerText.innerText = this.warningMessage;
            this.iframeContainer.appendChild(this.footer);
        }
        document.body.appendChild(this.dimmedBackground);
        document.body.appendChild(this.iframeContainer);

        this.logEventLegacy({
            eventCategory: "SDKFloatingRendered",
            partnerId: this.partnerId,
            chatUserId: this.chatUserId,
            products: [],
        });

        this.logEvent({
            partnerId: this.partnerId,
            variantId: this.variant,
            sessionId: this.sessionId || "sess-test",
            chatUserId: this.chatUserId,
            userType: this.userType,
            displayLocation: this.displayLocation,
            deviceType: this.isMobileDevice ? "mobile" : "web",
            timestamp: String(Date.now()),
            eventCategory: "gentoo_displayed",
            context: {
                autoChatOpen: Boolean(this.bootConfig?.floating?.autoChatOpen),
            },
        });

        // Create floating button
        if (showGentooButton) {
            this.floatingContainer = document.createElement("div");
            this.floatingContainer.className = `floating-container`;
            this.floatingContainer.setAttribute("data-gentoo-sdk", "true");
            this.updateFloatingContainerPosition(position); // Set initial position
            this.button = document.createElement("div");
            if (this.isSmallResolution) {
                this.button.className = `floating-button-common button-image-md`;
            } else {
                this.button.className = `floating-button-common button-image`;
            }
            this.button.type = "button";
            this.button.style.backgroundImage = `url(${this.customFloatingImage || this.floatingData.imageUrl})`;
            this.button.appendChild(document.createTextNode('\u200B'));
            document.body.appendChild(this.floatingContainer);
            
            /* [Lottie Floating Button] - flex: row-reverse이므로 dotLottiePlayer를 먼저 append해야 오른쪽에 렌더링됨 */
            if (this.dotLottiePlayer) {
                // Remove button if it exists, then append dotLottiePlayer synchronously
                if (this.button && this.button.parentNode === this.floatingContainer) {
                    this.floatingContainer.removeChild(this.button);
                }
                this.floatingContainer.appendChild(this.dotLottiePlayer);
                
                // Use requestAnimationFrame to ensure layout is calculated before applying canvas styles
                requestAnimationFrame(() => {
                    // Apply object-fit: cover to canvas in shadow-root
                    applyCanvasObjectFit(this.dotLottiePlayer);
                });
            } else {
                this.floatingContainer.appendChild(this.button);
            }

            // 💬 플로팅 문구 최초 표시 (공통 함수 사용)
            // expandedButton은 createFloatingMessage에서 나중에 append되므로 flex: row-reverse에 의해 왼쪽에 렌더링됨
            if (!this.gentooSessionData?.redirectState && this.floatingData.comment && this.floatingData.comment.length > 0) {
                this.createFloatingMessage(this.floatingData.comment, true);
            }

            // Start repeating interval for experiment target (every 10 seconds)
            if (this.isExperimentTarget && this.availableComments && this.availableComments?.length > 0) {
                this.floatingMessageIntervalId = setInterval(() => {
                    this.showRandomFloatingMessage();
                }, this.FLOATING_MESSAGE_INTERVAL_MS);
            }
        }

        this.elems = {
            iframeContainer: this.iframeContainer,
            iframe: this.iframe,
            chatHeader: this.chatHeader,
            dimmedBackground: this.dimmedBackground,
            button: this.button,
            expandedButton: this.expandedButton,
            customButton: this.customButton,
        };

        // Add event listeners
        this.setupEventListeners(position, isCustomButton);
        if (this.gentooSessionData?.redirectState) {
            setTimeout(() => {
                if (this.expandedButton)
                    this.expandedButton.classList.add('hide');
                if (this.button) {
                    this.button.classList.add('hide');
                }
                if (this.dotLottiePlayer) {
                    this.dotLottiePlayer.classList.add('hide');
                }
                if (this.customButton) {
                    this.customButton.classList.add('hide');
                }
            }, 100);
            setTimeout(() => {
                this.openChat();
                this.gentooSessionData.redirectState = false;
                sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
            }, 500);
        }
        window.__GentooInited = 'created';

        // Gentoo Powered Blocks (Ask Gentoo, Notify Me 등)에 Floating UI 생성 완료 알림
        window.dispatchEvent(new Event('GentooIO:UIElementsCreated'));
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

    setupEventListeners(position) {
        // 🖱️ 플로팅 버튼 클릭 이벤트 핸들러 - 채팅창 열기/닫기 제어
        var buttonClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.floatingClicked = true;

            // 채팅창이 숨겨진 상태라면 열기
            if (this.iframeContainer.classList.contains("iframe-container-hide")) {
                if (this.expandedButton)
                    this.expandedButton.classList.add('hide');
                if (this.button) {
                    if (this.isSmallResolution) {
                        this.button.className =
                            "floating-button-common button-image-close-mr hide";
                    } else {
                        this.button.className =
                            "floating-button-common button-image-close hide";
                    }
                }
                if (this.dotLottiePlayer) {
                    this.dotLottiePlayer.classList.add('hide');
                }
                if (this.customButton) {
                    this.customButton.classList.add('hide');
                }
                // 🚀 채팅창 열기 실행
                this.openChat(e, this.elems);
                if (this.eventCallback.click !== null) {
                    this.eventCallback.click();
                }
            } else {
                // 채팅창이 열린 상태라면 닫기
                this.hideChat(
                    this.elems.iframeContainer,
                    this.elems.button,
                    this.elems.expandedButton,
                    this.elems.dimmedBackground
                );
                if (this.button) {
                    if (this.isSmallResolution) {
                        this.button.className = "floating-button-common button-image-md";
                    } else {
                        this.button.className = "floating-button-common button-image";
                    }
                    this.button.style.backgroundImage = `url(${this.customFloatingImage || this.floatingData.imageUrl})`;
                    if (this.dotLottiePlayer) {
                        this.dotLottiePlayer.classList.remove('hide');
                    }
                }
                if (this.customButton) {
                    this.customButton.classList.remove('hide');
                }
            }
        };

        // 📬 채팅 웹 → SDK 간 통신 수신 리스너
        // iframe 내 채팅 애플리케이션에서 보내는 메시지 처리
        window?.addEventListener("message", (e) => {
            // 상품 페이지 리다이렉트 요청 처리
            if (e.data.redirectState) {
                if (!this.isSmallResolution) {
                    this.gentooSessionData.redirectState = true;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                }
                this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'carouselRedirect', currentPage: e.data.redirectUrl });
                window.location.href = e.data.redirectUrl;
            }
            // 폼 제출 이벤트 처리
            if (e.data.formSubmittedState) {
                const params = { p1: e.data.firstAnswer, p2: e.data.secondAnswer };
                if (this.eventCallback.formSubmitted !== null) {
                    this.eventCallback?.formSubmitted(params);
                }
            }
            // 사용자 메시지 전송 이벤트 처리
            if (e.data.userSentMessageState) {
                if (this.eventCallback.userSentMessage !== null) {
                    this.eventCallback?.userSentMessage();
                }
            }
            // 모바일에서 입력창 포커스 시 전체화면으로 전환
            if (this.isSmallResolution && e.data.inputFocusState) {
                this.enableChat("full");
            }
            // 채팅창 높이 리셋 요청
            if (e.data.resetState) {
                if (this.isMobileDevice && this.iframeContainer) {
                    this.iframeContainer.style.height = "449px";
                }
            }
            // 채팅창 닫기 요청
            if (e.data.closeRequestState) {
                this.hideChat();
            }
        });

        this.floatingContainer?.addEventListener("click", buttonClickHandler);
        this.floatingContainer?.addEventListener("click", (e) => {
            this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href });
            this.logEventLegacy({
                eventCategory: 'SDKFloatingClicked',
                partnerId: this.partnerId,
                chatUserId: this.chatUserId,
                products: [],
            });

            this.logEvent({
                experimentId: "flowlift_abctest_v1",
                partnerId: this.partnerId,
                variantId: this.variant,
                sessionId: this.sessionId || "sess-test",
                chatUserId: this.chatUserId,
                userType: this.userType,
                displayLocation: this.displayLocation,
                deviceType: this.isMobileDevice ? "mobile" : "web",
                timestamp: String(Date.now()),
                eventCategory: "gentoo_clicked",
                context: {
                    autoChatOpen: Boolean(this.bootConfig?.floating?.autoChatOpen),
                    floatingText: this.bootConfig?.floating?.button?.comment,
                },
            });
        });
        this.closeButtonContainer?.addEventListener("click", buttonClickHandler);
        this.closeButtonContainer?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeButtonContainer', currentPage: window?.location?.href }));
        this.closeButtonIcon?.addEventListener("click", buttonClickHandler);
        this.closeActionArea?.addEventListener("click", buttonClickHandler);
        this.closeActionArea?.addEventListener("click", (e) => {
            this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeActionArea', currentPage: window?.location?.href });
            this.logEvent({
                experimentId: "flowlift_abctest_v1",
                partnerId: this.partnerId,
                variantId: this.variant,
                sessionId: this.sessionId || "sess-test",
                chatUserId: this.chatUserId,
                userType: this.userType,
                displayLocation: this.displayLocation,
                deviceType: this.isMobileDevice ? "mobile" : "web",
                timestamp: String(Date.now()),
                eventCategory: "chat_close_requested",
            });
        });
        this.customButton?.addEventListener("click", buttonClickHandler);
        this.customButton?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href }));

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

    updateFloatingContainerPosition(position) {
        if (this.floatingContainer) {
            this.floatingContainer.style.bottom = `${this.isSmallResolution
                ? (position?.mobile?.bottom || this.chatbotData.mobilePosition.bottom)
                : (position?.web?.bottom || this.chatbotData.position.bottom)
                }px`;
            this.floatingContainer.style.right = `${this.isSmallResolution
                ? (position?.mobile?.right || this.chatbotData.mobilePosition.right)
                : (position?.web?.right || this.chatbotData.position.right)
                }px`;
        }
    }

    openChat() {
        // Inject viewport meta tag to block ios zoom in
        this.injectViewport();
        // Chat being visible
        this.enableChat(this.isMobileDevice ? 'shrink' : 'full');
        if (this.isMobileDevice) { history.pushState({ chatOpen: true }, '', window.location.href); }

        this.dimmedBackground?.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.dimmedBackground.className = "dimmed-background hide";
            this.hideChat();
            if (this.button) this.button.style.backgroundImage = `url(${this.customFloatingImage || this.floatingData.imageUrl})`;
        });

        this.chatHeader?.addEventListener("touchmove", (e) => {
            this.handleTouchMove(e, this.iframeContainer);
        });

        this.chatHeader?.addEventListener("touchend", (e) => {
            this.handleTouchEnd(
                e,
                this.iframeContainer,
                this.button,
                this.expandedButton,
                this.dimmedBackground
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
                    this.dimmedBackground,
                );
                document.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };
            document.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });
    }

    remove() {
        if (this.floatingContainer) {
            document.body.removeChild(this.floatingContainer);
        }
        if (this.button) {
            document.body.removeChild(this.button);
        }
        if (this.dotLottiePlayer) {
            document.body.removeChild(this.dotLottiePlayer);
        }
        if (this.expandedButton) {
            document.body.removeChild(this.expandedButton);
        }
        if (this.iframeContainer) {
            document.body.removeChild(this.iframeContainer);
        }
        if (this.dimmedBackground) {
            document.body.removeChild(this.dimmedBackground);
        }
        this.floatingContainer = null;
        this.button = null;
        this.dotLottiePlayer = null;
        this.expandedButton = null;
        this.iframeContainer = null;
        this.dimmedBackground = null;
    }

    destroy() {
        if (window.__GentooInited !== 'created') {
            console.log('FloatingButton instance is not created');
            return;
        }
        this.isDestroyed = true;

        console.log("Destroying FloatingButton instance");

        // Clear floating message interval (cleanup 메서드로 통합)
        this.cleanup();

        // Delete viewport meta tag
        this.deleteViewport();

        // Remove all known DOM elements
        const elemsToRemove = [
            this.floatingContainer,
            this.iframeContainer,
            this.dimmedBackground,
            this.button,
            this.expandedButton,
            this.dotLottiePlayer,
        ];
        elemsToRemove.forEach((el) => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });

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

        // Remove all DOM elements
        if (this.floatingContainer && this.floatingContainer.parentNode) {
            this.floatingContainer.parentNode.removeChild(this.floatingContainer);
        }
        if (this.iframeContainer && this.iframeContainer.parentNode) {
            this.iframeContainer.parentNode.removeChild(this.iframeContainer);
        }
        if (this.dimmedBackground && this.dimmedBackground.parentNode) {
            this.dimmedBackground.parentNode.removeChild(this.dimmedBackground);
        }

        // Reset all properties
        this.button = null;
        this.expandedButton = null;
        this.expandedText = null;
        this.iframeContainer = null;
        this.floatingContainer = null;
        this.dimmedBackground = null;
        this.chatHeader = null;
        this.iframe = null;
        this.chatHandler = null;
        this.closeButtonContainer = null;
        this.closeButtonIcon = null;
        this.closeButtonText = null;
        this.dotLottiePlayer = null;

        this.chatUserId = null;
        this.floatingData = null;
        this.chatbotData = null;
        this.chatUrl = null;

        this.isInitialized = false;
        this.floatingCount = 0;
        this.floatingClicked = false;
        this.availableComments = null;

        window.__GentooInited = null;
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

    setPageList(pageList) {
        this.pageList = pageList;
    }

    // to be used
    async logEvent(payload) {
        try {
            const params = {
                "experiment_id": String(payload.experimentId),
                "partner_id": String(payload.partnerId),
                "variant": String(payload.variantId),
                "session_id": String(payload.sessionId),
                "user_id": String(payload.chatUserId),
                "user_type": String(payload.userType) || 'guest',
                "display_location": String(payload.displayLocation) || undefined,
                "device_type": String(payload.deviceType) || undefined,
                "timestamp": String(payload.timestamp),
                "event_name": String(payload.eventCategory),
                "context": payload?.context || undefined,
            }

            const response = await fetch(`${this.domains.log}/${this.partnerId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(params),
            });

            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling logEvent API: ${error}`);
        }
    }

    // to be deprecated
    async logEventLegacy(payload) {
        try {
            const params = {
                eventCategory: String(payload.eventCategory),
                chatUserId: String(payload.chatUserId),
                partnerId: String(payload.partnerId),
                channelId: this.isMobileDevice ? "mobile" : "web",
                products: payload?.products,
            };

            const response = await fetch(`${this.domains.logLegacy}/${this.partnerId}`, {
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
            const url = `${this.domains.auth}`;
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
            // console.error(`Error while calling fetchChatUserId API: ${error}`)
        }
    }

    async fetchChatbotData(partnerId) {
        try {
            const response = await fetch(`${this.domains.chatbot}/${partnerId}?chatUserId=${this.chatUserId}`, {
                method: "GET",
                headers: {},
            });
            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling fetchChatbotId API: ${error}`);
        }
    }

    async fetchFloatingData(partnerId) {
        try {
            const response = await fetch(
                `${this.domains.floating}/${partnerId}?displayLocation=${this.displayLocation}&itemId=${this.itemId}&chatUserId=${this.chatUserId}`,
                {
                    method: "GET",
                    headers: {},
                }
            );

            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling fetchFloatingData API: ${error}`);
        }
    }

    async fetchShopifyExperimentData(partnerId) {
        try {
            const response = await fetch(
                `${this.domains.floating}/shopify/${partnerId}`,
                {
                    method: "GET",
                    headers: {},
                }
            );
            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling fetchShopifyExperimentData API: ${error}`);
            return null;
        }
    }

    // Function to inject Lottie
    async injectLottie() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js';
            script.onload = () => {
                resolve();
            };
            script.onerror = () => reject(new Error("DotLottiePlayer load failed"));
            document.head.appendChild(script);
        });
    }

    // Function to inject viewport meta tag
    injectViewport() {
        if (this.viewportInjected) return;

        try {
            // Check for existing viewport meta tag
            const existingViewport = document.querySelector('meta[name="viewport"]');
            if (existingViewport) {
                this.originalViewport = existingViewport.cloneNode(true);
                existingViewport.remove();
            }

            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            meta.setAttribute('data-gentoo-injected', 'true');
            document.head.appendChild(meta);
            this.viewportInjected = true;
        } catch (error) {
            console.error('Failed to inject viewport meta tag:', error);
        }
    }

    // Function to delete viewport meta tag
    deleteViewport() {
        if (!this.viewportInjected) return;

        try {
            const meta = document.querySelector('meta[name="viewport"][data-gentoo-injected="true"]');
            if (meta) {
                meta.remove();
            }

            // Restore original viewport tag if it exists
            if (this.originalViewport) {
                document.head.appendChild(this.originalViewport);
                this.originalViewport = null;
            }
        } catch (error) {
            console.error('Failed to delete viewport meta tag:', error);
        } finally {
            this.viewportInjected = false;
        }
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
        iframeContainer.style.height = `${newHeight}px`;
        if (Math.abs(diff) > 1) {
            this.scrollDir = diff > 0 ? "down" : "up";
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
        iframe.classList.add("event-disabled");
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
        iframe.classList.remove("event-disabled");
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
        // 📤 SDK → 채팅 웹 간 통신 함수
        // iframe 내의 채팅 애플리케이션으로 메시지 전송 (enableMode, buttonClickState 등)
        this.sendPostMessageHandler({ enableMode: mode });

        if (this.isSmallResolution) {
            this.dimmedBackground.className = "dimmed-background";
            if (this.button) this.button.className = "floating-button-common hide";
            if (this.expandedButton) this.expandedButton.className = "expanded-button hide";
            if (this.dotLottiePlayer) this.dotLottiePlayer.classList.add('hide');
            if (this.customButton) this.customButton.classList.add('hide');
        }
        if (mode === "shrink") {
            this.iframeContainer.className = "iframe-container-shrink";
            if (this.isMobileDevice) this.iframeContainer.style.height = "449px";
        } else if (mode === "full") {
            this.iframeContainer.className = "iframe-container";
            if (this.isMobileDevice) this.iframeContainer.style.height = "99%";
        } else {
            return;
        }
    }

    hideChat() {
        // Delete viewport meta tag
        this.deleteViewport();

        if (this.button) {
            if (this.isSmallResolution) {
                this.button.className = "floating-button-common button-image-md";
            } else {
                this.button.className = "floating-button-common button-image";
            }
        }
        if (this.dotLottiePlayer) {
            this.dotLottiePlayer.classList.remove('hide');
        }
        if (this.expandedButton) this.expandedButton.className = "expanded-button hide";
        if (this.customButton) this.customButton.classList.remove('hide');
        this.iframeContainer.className = "iframe-container iframe-container-hide";
        this.dimmedBackground.className = "dimmed-background hide";
    }

    sendPostMessageHandler(payload) {
        if (this.selectedCommentSet && this.selectedCommentSet?.greeting) {
            if (this.displayLocation !== 'PRODUCT_DETAIL') {
                payload.customizedGreeting = this.selectedCommentSet.greeting;
            }
        }

        this.iframe.contentWindow.postMessage(payload, "*");
    }

    // Function to log the current window width
    logWindowWidth() {
        const width = window.innerWidth;
        return width;
    }

    async sendLog(input) {
        try {
            await this.bootPromise;
            // Wait for fetchChatUserId to complete before proceeding
            this.chatUserId = await this.fetchChatUserId(input.authCode);

            const payload = {
                eventCategory: input.eventCategory,
                partnerId: String(input.partnerId),
                chatUserId: String(this.chatUserId),
                products: input.products,
            };

            return this.logEvent(payload);
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

    // 🎯 DualtronUSA 전용 메시지 매칭
    getDualtronUSAMessage(currentUrl) {
        if (currentUrl.includes('/collections/electric-scooters')) {
            return {
                floating: "Curious about the details or what comes with each scooter? Ask me!",
                greeting: "Thinking about scooters? I can tell you which one's trending, what it includes, and all the specs — just ask."
            };
        }
        if (currentUrl.includes('/collections/spare-parts')) {
            return {
                floating: "Need a repair or replacement? I can help you out!",
                greeting: "Let me know your scooter model and what spare you're looking for.\nHit us up at [415-273-9870](tel:4152739870) or [support@dualtronusa.com](mailto:support@dualtronusa.com) — we'll get you sorted fast."
            };
        }
        if (currentUrl.includes('/collections/minimotors-accessories')) {
            return {
                floating: "Want to upgrade your scooter? I got you!",
                greeting: "Let's make your scooter stand out!\nI can also show you the accessories everyone's loving — just ask me!"
            };
        }
        if (currentUrl.includes('/collections/sale')) {
            return {
                floating: "This sale's a great chance for you!\nCurious about anything?",
                greeting: "Feel free to ask me anything!\nWant to see what's on sale? Just ask **What's on sale?** I'll walk you through everything!"
            };
        }
        if (currentUrl.includes('/search')) {
            return {
                floating: "Searching for something? I can also help you with it.",
                greeting: "Tell me what you have in mind — the vibe, how it looks, or your situation. I'll find the right one for you."
            };
        }
        if (currentUrl.includes('/cart')) {
            return {
                floating: "Ready to make it yours? Your cart's looking good.",
                greeting: "If you'd like to know more, or find something that pairs well with this, just tell me — I'll show you."
            };
        }
        return null; // 매칭 실패
    }

    // 🎯 Vomfass - 레시피 재료 추출 헬퍼
    extractRecipeIngredients() {
        try {
            // DOM 로드 확인
            if (document.readyState === 'loading') return null;

            // 1. INGREDIENTS 텍스트가 있는 <p> 찾기
            const paragraphs = document.querySelectorAll('p');
            let ingredientsP = null;

            for (const p of paragraphs) {
                if (p.textContent.includes('INGREDIENTS')) {
                    ingredientsP = p;
                    break;
                }
            }

            if (!ingredientsP) return null;

            // 2. 다음 <ul> 요소 찾기 (최대 5번 시도)
            let ul = ingredientsP.nextElementSibling;
            let attempts = 0;

            while (ul && ul.tagName !== 'UL' && attempts < 5) {
                ul = ul.nextElementSibling;
                attempts++;
            }

            if (!ul || ul.tagName !== 'UL') return null;

            // 3. <a> 태그 있는 <li>만 추출
            const items = Array.from(ul.querySelectorAll('li'))
                .filter(li => li.querySelector('a'))
                .map(li => {
                    const link = li.querySelector('a');
                    return link.textContent.trim();
                })
                .filter(text => text.length > 0);

            return items.length > 0 ? items : null;

        } catch (error) {
            console.warn('Vomfass ingredient extraction failed:', error);
            return null;
        }
    }

    // 🎯 Vomfass 전용 메시지 매칭
    getVomfassMessage(currentUrl) {
        if (currentUrl.includes('/blogs/recipes/')) {
            // Floating은 항상 고정
            const fixedFloating = "Wonder which products you need to make this recipe?";

            // 재료 추출 시도
            const ingredients = this.extractRecipeIngredients();

            if (ingredients && ingredients.length > 0) {
                // 재료 추출 성공 → 첫 번째 재료로 개인화 그리팅
                const firstIngredient = ingredients[0];

                return {
                    floating: fixedFloating,
                    greeting: `Is there anything you'd like to know about ${firstIngredient}?`
                };
            } else {
                // 재료 추출 실패 → Fallback 그리팅
                return {
                    floating: fixedFloating,
                    greeting: "I can help you find the perfect oils and vinegars for this recipe!"
                };
            }
        }
        return null;
    }

    // 🎯 BoostedUSA 전용 메시지 매칭
    getBoostedUSAMessage(currentUrl) {
        if (currentUrl.includes('/collections/electric-bikes')) {
            return {
                floating: "Curious about the details about e-bikes? Ask me!",
                greeting: "Thinking about e-bikes? I can tell you which one's trending, what it includes, and all the specs — just ask."
            };
        }
        if (currentUrl.includes('/collections/evolve-skateboards')) {
            return {
                floating: "Want to know what makes each Evolve skateboard special?",
                greeting: "Let's find out together — we can talk about your performance needs or budget preferences."
            };
        }
        if (currentUrl.includes('/collections/onewheel-1')) {
            return {
                floating: "Wanna know what makes our Onewheels stand out?",
                greeting: "What kind of specs and parts are you looking for? I can tell you based on the product details."
            };
        }
        if (currentUrl.includes('/collections/electric-scooters')) {
            return {
                floating: "Curious about the details or what comes with each scooter? Ask me!",
                greeting: "Thinking about scooters? I can tell you which one's trending, what it includes, and all the specs — just ask."
            };
        }
        if (currentUrl.includes('/collections/kingsong-electric-unicycles')) {
            return {
                floating: "Wanna check out some amazing unicycles?",
                greeting: "They've got awesome specs and features. If there's anything you'd like to know more about, just tell me!"
            };
        }
        if (currentUrl.includes('/collections/protective-gear')) {
            return {
                floating: "Maximum safety means maximum confidence. Got any gear in mind?",
                greeting: "For a confident ride, protection is a must! What kind of gear are you looking for — helmet, wrist guards, or gloves?"
            };
        }
        if (currentUrl.includes('/pages/accessories')) {
            return {
                floating: "Want to upgrade your vehicle? I got you!",
                greeting: "Let's make your scooter stand out!\nI can also show you the accessories everyone's loving — just ask me!"
            };
        }
        if (currentUrl.includes('/collections/boosted-accessories')) {
            return {
                floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
                greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
            };
        }
        if (currentUrl.includes('/collections/evolve-skateboard-accessories')) {
            return {
                floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
                greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
            };
        }
        if (currentUrl.includes('/collections/minimotors-accessories')) {
            return {
                floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
                greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
            };
        }
        if (currentUrl.includes('/collections/onewheel')) {
            return {
                floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
                greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
            };
        }
        if (currentUrl.includes('/collections/segway-accessories')) {
            return {
                floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
                greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
            };
        }
        if (currentUrl.includes('/collections/super73-accessories')) {
            return {
                floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
                greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
            };
        }
        if (currentUrl.includes('/collections/zooz-accessories')) {
            return {
                floating: "Need an upgrade or replacement? Tell me which vehicle it's for.",
                greeting: "What kind of accessory are you looking for?\nTell me about your vehicle and how you'll use it — I'll find the perfect match for you."
            };
        }
        if (currentUrl.includes('/cart')) {
            return {
                floating: "Ready to make it yours? Your cart's looking good.",
                greeting: "If you'd like to know more, or find something that pairs well with this, just tell me — I'll show you."
            };
        }
        if (currentUrl.includes('/search')) {
            return {
                floating: "Searching for something? I can also help you with it.",
                greeting: "Tell me what you have in mind — the vibe, how it looks, or your situation. I'll find the right one for you."
            };
        }
        if (currentUrl.includes('/products/boosted-usa-gift-card')) {
            return {
                floating: "Great pick — They'll definitely love it!",
                greeting: "Giving it as a gift? That's really thoughtful. I'm sure they'll love it! Feel free to ask if you have any questions."
            };
        }
        return null;
    }

    // 🎯 Paper Tree 전용 메시지 매칭
    getPaperTreeMessage(currentUrl) {
        const messages = {
            '/blogs/blog': {
                floating: 'Curious about our half-century legacy and history?',
                greeting: 'We\'re a legacy origami brand founded in 1968 in Japantown. Want to know more about our story and products?'
            },
            '/collections/origami-paper': {
                floating: 'What kind of origami paper are you looking for?',
                greeting: 'Tell me about what you\'re trying to make — telling us the model that you are working on or folding level might help me find the right one.'
            },
            '/collections/books-origami': {
                floating: 'Tell me about your origami level — I\'ll get you the right one!',
                greeting: 'Share your folding experience or the model you want to make (ask me like: "books for Jack-in-the-Box"). I\'ll find the ones that fit your level.'
            },
            '/collections/origami-supplies': {
                floating: 'Great folding sometimes needs great supplies!',
                greeting: 'Looking for a specific supply? Ask me first if you\'d like help choosing the right one.'
            },
            '/collections/hand-cut-large-origami': {
                floating: 'This collection is our specialty — ask me about it!',
                greeting: 'These hand-cut large origami papers are our exclusives. Tell me what you\'re working on and what size you need.'
            },
            '/collections/yuzen-chiyogami': {
                floating: 'Looking for special patterns? These are pieces of art.',
                greeting: 'Are you looking for something bold and colorful, or soft and traditional? Ask me, like "colorful Yuzen Chiyogami."'
            },
            '/collections/nature-paper': {
                floating: 'Looking for natural papers? These are pieces of art.',
                greeting: 'These sheets are special. Are you looking for a specific paper? Ask me, like "natural paper with bamboo."'
            },
            '/collections/marbled-papers': {
                floating: 'All sheets are unique — discover these amazing papers.',
                greeting: 'All marbled, ombre, and tie-dye papers are one-of-a-kind. If you have something specific in mind, ask me, like "marbled paper with gold marbling."'
            },
            '/collections/unryu': {
                floating: 'Looking for something soft and natural? Unryu papers are the ones!',
                greeting: 'Unryu papers have a unique, airy texture. Ask me anything — I can help you find the right one.'
            },
            '/collections/solid-color-kozo': {
                floating: 'Curious about our kozo papers and treatments?',
                greeting: 'These papers can be treated with methyl cellulose. Ask me if the kozo type can be treated — I\'ll explain more.'
            },
            '/collections/metallic-papers': {
                floating: 'Looking for Tissue Foils? These are great for folding.',
                greeting: 'Ask me about the metallic paper type and size — I can help you find the right one.'
            },
            '/collections/scenery': {
                floating: 'These are real art pieces — look around and hit me up anytime.',
                greeting: 'Crafting, decoration, thoughtful gifts… what kind of Scenery paper are you looking for? Tell me what you want to make, and I\'ll guide you.'
            },
            '/collections/books-other': {
                floating: 'These books are our selection — want to explore them?',
                greeting: 'Looking for a specific title or theme? Tell me roughly what you\'re after, and I\'ll find it for you.'
            },
            '/collections/calligraphy': {
                floating: 'Looking for calligraphy supplies? Take a look around!',
                greeting: 'Let me know your level or style — I\'ll match you with the right brush and ink.'
            },
            '/collections/writing-drawing': {
                floating: 'Do you like drawing? I\'ll find you the perfect match!',
                greeting: 'Are you looking for a specific brand or utensil? Tell me what you have in mind — I can find it for you. Feel free to ask about any details, too.'
            },
            '/collections/gifts': {
                floating: 'Looking for a gift with the spirit of Japan and San Francisco?',
                greeting: 'Looking for something special?\nThese are our collections — each piece carries the charm of Japan and the heart of San Francisco. It\'ll make a wonderful gift.'
            },
            '/collections/cards-mikis-signature-cards': {
                floating: 'Looking for something heartfelt? Check out Miki\'s Cards.',
                greeting: 'Each card is hand-designed — simple, elegant, and full of warmth. Want to find one that fits your message?'
            },
            '/collections/sale': {
                floating: 'Love a great find? You might spot something special here.',
                greeting: 'Some of our signature pieces are marked down — great for gifting or collecting. Want to take a look?'
            },
            '/collections/frontpage': {
                floating: 'Love a great find? You might spot something special here.',
                greeting: 'Some of our signature pieces are here — great for gifting or collecting. Want to take a look?'
            },
            '/pages/services': {
                floating: 'Curious about classes with Origami expert Linda?',
                greeting: 'Linda and her team teach everyone from beginners to advanced folders — even artists and companies. Whether for fun or something special, we have classes for you. Want to see what\'s available?'
            },
            '/pages/events-page': {
                floating: 'Curious about origami events with Paper Tree?',
                greeting: 'From our annual Palooza to live demos and community gatherings — come explore the world of origami with us! Want me to tell you about the upcoming events?'
            }
        };

        // 매칭되는 경로 찾기 (olivethisolivethat과 동일 방식)
        const matchedPath = Object.keys(messages).find(
            path => currentUrl.includes(path)
        );

        return matchedPath ? messages[matchedPath] : null;
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

    isAllowedDomainPattern(hostname) {
        if (this.allowedDomainsForIframe.includes(hostname)) {
            return true;
        }

        // Check wildcard patterns
        for (const pattern of this.allowedDomainsForIframe) {
            if (pattern.startsWith('*.')) {
                const domain = pattern.substring(2);
                if (hostname.endsWith('.' + domain) || hostname === domain) {
                    return true;
                }
            }
        }

        return false;
    }

    isAllowedDomainForIframe() {
        if (this.isAllowedDomainPattern(window.location.hostname)) {
            return true;
        }

        if (window !== window.top) {
            try {
                const parentDomain = window.top.location.hostname;
                if (this.isAllowedDomainPattern(parentDomain)) {
                    return true;
                }
            } catch (e) {
                if (document.referrer) {
                    try {
                        const referrerUrl = new URL(document.referrer);
                        if (this.isAllowedDomainPattern(referrerUrl.hostname)) {
                            return true;
                        }
                    } catch (urlError) {
                        console.warn('Could not parse referrer URL:', document.referrer);
                    }
                }
            }
        }
        return false;
    }

    checkExperimentTarget() {
        const experimentStores = [
            '0qjyz1-uj.myshopify.com',
            'olivethisolivethat.com',
            'dualtronusa.com',
            'boostedusa.com',
            'vomfassghirardellisquare.com',
            'paper-tree.com',
            'saranghello.com',
            'sftequilashop.com',
            'biondivino.com',
            // LOCAL_DEV_SKIP_EXPERIMENT_CHECK
            // '127.0.0.1',
            // 'localhost'
        ];
        const currentHostname = window.location.hostname;
        const isTarget = experimentStores.some(store => currentHostname.includes(store));
        return isTarget;
    }

    checkSearchAutoTrigger() {
        const searchAutoTriggerStores = [
            '7tmeab-ia.myshopify.com',  // 테스트 스토어
            'vomfassghirardellisquare.com',
            'dualtronusa.com',
            'paper-tree.com',
            'saranghello.com',
            'theauracasa.com',
        ];
        const currentHostname = window.location.hostname;
        return searchAutoTriggerStores.some(store => currentHostname.includes(store));
    }

    getAutoUserMessage() {
        if (!this.checkSearchAutoTrigger()) return null;
        if (this.isMobileDevice) return null;

        const url = new URL(window.location.href);
        if (!url.pathname.includes('/search')) return null;

        const searchQuery = url.searchParams.get('q');
        if (!searchQuery) return null;

        // 이미 트리거된 검색어인지 확인
        let triggeredSearches = [];
        try {
            const data = JSON.parse(sessionStorage.getItem('gentoo_triggered_searches') || '[]');
            triggeredSearches = Array.isArray(data) ? data : [];
        } catch {
            triggeredSearches = [];
        }

        if (triggeredSearches.includes(searchQuery)) {
            return null;
        }

        // 트리거된 검색어 목록에 추가
        triggeredSearches.push(searchQuery);
        sessionStorage.setItem('gentoo_triggered_searches', JSON.stringify(triggeredSearches));

        return searchQuery;
    }

    async checkTrainingProgress(partnerId) {
        // LOCAL_DEV_SKIP_TRAINING_CHECK
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     console.log('🧪 Local development mode: skipping training progress check');
        //     return true;
        // }

        try {
            const response = await fetch(`${this.domains.console}/app/api/shop/data/check/progress/${partnerId}`);
            const data = await response.json();

            if (data.success && data.data) {
                return data.data.status === 'success';
            }

            console.log("Training progress is not 'success'. Initialization will not proceed.");
            return false;
        } catch (error) {
            console.log("Training progress check failed, proceeding with initialization.");
            return false;
        }
    }

    // Function to apply object-fit: cover to canvas in shadow-root
    applyCanvasObjectFit(dotLottiePlayer) {
        if (!dotLottiePlayer) return;

        const tryApplyStyle = (dotLottiePlayer, retries = 10) => {
            if (retries <= 0) {
                console.warn('Failed to apply object-fit to dotLottiePlayer canvas: shadowRoot not ready');
                return;
            }

            const shadowRoot = dotLottiePlayer.shadowRoot;
            if (shadowRoot) {
                const canvas = shadowRoot.querySelector('canvas');
                if (canvas) {
                    canvas.style.objectFit = 'cover';
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                } else {
                    // Canvas might not be ready yet, retry
                    setTimeout(() => tryApplyStyle(retries - 1), 50);
                }
            } else {
                // ShadowRoot not ready yet, retry
                setTimeout(() => tryApplyStyle(retries - 1), 50);
            }
        };

        // Wait for shadowRoot to be ready
        requestAnimationFrame(() => {
            tryApplyStyle(dotLottiePlayer);
        });
    }
}

// Export as a global variable
window.FloatingButton = FloatingButton;

(function (global, document) {
    var w = global;

    // Function to inject CSS
    function injectCSS(href) {
        var existingLink = document.querySelector('link[href="' + href + '"]');
        if (existingLink) return;

        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.type = "text/css";
        link.onerror = function () {
            console.error("Failed to load GentooIO CSS.");
        };
        document.head.appendChild(link);
    }

    // 🧪 Shopify 테스트용 CSS 로드
    injectCSS("https://sdk.gentooai.com/floating-button-sdk.css");
    // injectCSS("https://dev-sdk.gentooai.com/floating-button-sdk.css");
    // injectCSS("./floating-button-sdk.css");

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
                // 🛍️ Shopify 테스트용 - partnerType 기본값 설정
                if (!params.partnerType) {
                    params.partnerType = "shopify";
                }
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
                case "getUserSentMessageEvent":
                    if (typeof fb.getUserSentMessageEvent === "function") {
                        Promise.resolve(fb.getUserSentMessageEvent(params.callback)).catch((error) => {
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
