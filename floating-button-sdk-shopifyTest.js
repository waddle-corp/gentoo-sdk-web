class FloatingButton {
    constructor(props) {
        // 🛍️ Shopify 테스트용 - iframe 허용 도메인 확장
        this.allowedDomainsForIframe = [
            'admin.shopify.com',
            '*.myshopify.com',
            // 🧪 Shopify 테스트용 추가 도메인들
            'shopify-test.gentooai.com',
            '*.shopify-partners.com',
            'localhost',
            '127.0.0.1'
        ];
        
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
        this.warningMessage;
        this.warningActivated;
        this.floatingData;
        this.floatingAvatar;
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

        // 🧪 Shopify 테스트용 환경 설정
        if (
            window.location.hostname === "dailyshot.co" ||
            window.location.hostname === "dev-demo.gentooai.com" ||
            window.location.hostname === "127.0.0.1" ||
            window.location.hostname === "localhost" ||
            window.location.hostname.includes("shopify-test")
        ) {
            this.hostSrc = "https://dev-demo.gentooai.com";
            this.domains = {
                auth: "https://dev-api.gentooai.com/chat/api/v1/user",
                log: "https://dev-api.gentooai.com/chat/api/v1/event/userEvent",
                chatbot: "https://dev-api.gentooai.com/chat/api/v1/chat/chatbot",
                floating: "https://dev-api.gentooai.com/chat/api/v1/chat/floating",
            };
        } else if (
            window.location.hostname === "stage-demo.gentooai.com"
            // || window.location.hostname === "gentoo-demo-shop-template.lovable.app"
        ) {
            this.hostSrc = "https://stage-demo.gentooai.com";
            this.domains = {
                auth: "https://stage-api.gentooai.com/chat/api/v1/user",
                log: "https://stage-api.gentooai.com/chat/api/v1/event/userEvent",
                chatbot: "https://stage-api.gentooai.com/chat/api/v1/chat/chatbot",
                floating: "https://stage-api.gentooai.com/chat/api/v1/chat/floating",
            };
        } else {
            this.hostSrc = "https://demo.gentooai.com";
            this.domains = {
                auth: "https://api.gentooai.com/chat/api/v1/user",
                log: "https://api.gentooai.com/chat/api/v1/event/userEvent",
                chatbot: "https://api.gentooai.com/chat/api/v1/chat/chatbot",
                floating: "https://api.gentooai.com/chat/api/v1/chat/floating",
            };
        }

        // Add a promise to track initialization status
        this.bootPromise = Promise.all([
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
        ]).catch((error) => {
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

            // ✨ 플로팅 문구 데이터 API 호출 - "Do you want to go shopping with me today?" 같은 텍스트를 가져옴
            // API: /chat/api/v1/chat/floating/{partnerId}?displayLocation={}&itemId={}&chatUserId={}
            this.floatingData = await this.fetchFloatingData(this.partnerId);
            if (!this.floatingData) {
                throw new Error("Failed to fetch floating data");
            }

            // 🛍️ Shopify 테스트용 - 특정 파트너 ID에 대한 분기 처리
            if (this.partnerId === '676a4cef7efd43d2d6a93cd7') {
                this.chatUrl = `${this.hostSrc}/chat/49/${this.chatUserId}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;
            } 
            else if (this.partnerId === '676a4b3cac97386117d1838d') {
                this.chatUrl = `${this.hostSrc}/chat/153/${this.chatUserId}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;
            } 
            else {
                // 🎯 채팅 웹 애플리케이션 URL 생성 - SDK에서 iframe으로 로드할 URL
                // 🛍️ Shopify 테스트용 - 기본적으로 영어(en)로 설정
                this.chatUrl = `${this.hostSrc}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}&lang=en`;
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

        if (!this.floatingData || !this.floatingData.imageUrl) {
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
        
        if (this.floatingAvatar?.floatingAsset || this.floatingData.imageUrl.includes('gentoo-anime-web-default.lottie')) {
            const player = document.createElement('dotlottie-player');
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
        
        this.logEvent({
            eventCategory: "SDKFloatingRendered",
            partnerId: this.partnerId,
            chatUserId: this.chatUserId,
            products: [],
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
            this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
            document.body.appendChild(this.floatingContainer);
            if (this.dotLottiePlayer) {
                this.floatingContainer.appendChild(this.dotLottiePlayer);
            } else {
                this.floatingContainer.appendChild(this.button);
            }
            
            // 💬 플로팅 문구 렌더링 조건 체크
            // - redirectState가 없고, 2회 미만 표시했고, API에서 받은 comment가 있는 경우
            // 🛍️ Shopify 테스트용 - 플로팅 문구 표시 로직
            if (!this.gentooSessionData?.redirectState && this.floatingCount < 2 && this.floatingData.comment && this.floatingData.comment.length > 0) {
                // Check if component is destroyed or clicked
                if (this.floatingClicked || this.isDestroyed || !this.floatingContainer)
                    return;

                // 🗨️ 플로팅 문구 UI 요소 생성 (expandedButton과 expandedText)
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

                // Double check if floatingContainer still exists before appending
                if (this.floatingContainer && this.floatingContainer.parentNode) {
                    this.floatingContainer.appendChild(this.expandedButton);

                    // ⚡ 플로팅 문구 타이핑 애니메이션 시작 - API의 comment 데이터를 한 글자씩 표시
                    // 🛍️ Shopify 테스트용 - 영어 문구에 최적화된 타이핑 애니메이션
                    let i = 0;
                    const addLetter = () => {
                        if (!this.floatingData) return;
                        if (i < this.floatingData.comment.length && !this.isDestroyed) {
                            this.expandedText.innerText += this.floatingData.comment[i];
                            i++;
                            // 🛍️ 영어 문구에 맞춰 타이핑 속도 조정
                            setTimeout(addLetter, 800 / this.floatingData.comment.length);
                        }
                    };
                    addLetter();
                    this.floatingCount += 1;

                    // Remove expanded button after delay
                    setTimeout(() => {
                        if (
                            this.floatingContainer &&
                            this.expandedButton &&
                            this.expandedButton.parentNode === this.floatingContainer
                        ) {
                            this.floatingContainer.removeChild(this.expandedButton);
                        }
                    }, 7000);
                }
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
                    this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
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
                this.sendPostMessageHandler({buttonClickState: true, clickedElement: 'carouselRedirect', currentPage: e.data.redirectUrl});
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
        this.floatingContainer?.addEventListener("click", (e) => this.sendPostMessageHandler({buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href}));
        this.closeButtonContainer?.addEventListener("click", buttonClickHandler);
        this.closeButtonContainer?.addEventListener("click", (e) => this.sendPostMessageHandler({buttonClickState: true, clickedElement: 'closeButtonContainer', currentPage: window?.location?.href}));
        this.closeButtonIcon?.addEventListener("click", buttonClickHandler);
        this.closeActionArea?.addEventListener("click", buttonClickHandler);
        this.closeActionArea?.addEventListener("click", (e) => this.sendPostMessageHandler({buttonClickState: true, clickedElement: 'closeActionArea', currentPage: window?.location?.href}));
        this.customButton?.addEventListener("click", buttonClickHandler);
        this.customButton?.addEventListener("click", (e) => this.sendPostMessageHandler({buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href}));

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
        if (this.isMobileDevice) {history.pushState({ chatOpen: true }, '', window.location.href);}

        this.dimmedBackground?.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.dimmedBackground.className = "dimmed-background hide";
            this.hideChat();
            if (this.button) this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
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

        window.__GentooInited = null;
    }

    setPageList(pageList) {
        this.pageList = pageList;
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

            const response = await fetch(`${this.domains.log}/${this.partnerId}`, {
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
            chatUserId: this.chatUserId && !userToken.includes('guest') ? String(this.chatUserId) : null
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

    // Function to inject Lottie
    async injectLottie() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'https://unpkg.com/@dotlottie/player-component@2.3.0/dist/dotlottie-player.mjs';
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
        this.logEvent({
            eventCategory: "SDKFloatingClicked",
            partnerId: this.partnerId,
            chatUserId: this.chatUserId,
            products: [],
        });

        // 📤 SDK → 채팅 웹 간 통신 함수
        // iframe 내의 채팅 애플리케이션으로 메시지 전송 (enableMode, buttonClickState 등)
        this.sendPostMessageHandler({enableMode: mode});

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
