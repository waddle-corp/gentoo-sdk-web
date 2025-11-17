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
        this.variant = 'control';
        this.partnerType = props.partnerType || 'gentoo';
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
        // this.chatbotData;
        this.browserWidth = this.logWindowWidth();
        this.isSmallResolution = this.browserWidth < 601;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.hostSrc;
        this.domains;
        this.isDestroyed = false;
        this.isInitialized = false;  // Add flag to track initialization
        this.floatingCount = 0;
        this.floatingClicked = false;
        this.warningMessage;
        this.warningActivated;
        this.floatingAvatar;

        this.itemId = this.getProductNo();
        this.iframeHeightState;
        this.viewportInjected = false;
        this.originalViewport = null;

        if (window.location.hostname === 'localhost') {
            this.hostSrc = 'http://localhost:3000';
            this.domains = {
                auth: 'https://dev-api.gentooai.com/chat/api/v1/user',
                log: 'https://dev-api.gentooai.com/chat/api/v1/event/log',
                logLegacy: 'https://dev-api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://dev-api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://dev-api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
                cafe24Utils: 'https://dev-api.gentooai.com/chat/api/cafe24/utils',
                bootConfig: 'https://dev-api.gentooai.com/chat/api/sdk/boot',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
            // cafe24 Gentoo-dev App
            this.cafe24ClientId = 'ckUs4MK3KhZixizocrCmTA';
            this.cafe24Version = '2024-09-01';
            /* // cafe24 Gentoo-prod App
            this.cafe24ClientId = 'QfNlFJBPD6mXVWkE8MybWD';
            this.cafe24Version = '2024-09-01'; */
        } else if (window.location.hostname === 'dev-demo.gentooai.com' || window.location.hostname.includes('kickthefence') || window.location.hostname.includes('y6company') || window.location.hostname.includes('jintaebaek')) {
            this.hostSrc = 'https://dev-demo.gentooai.com';
            this.domains = {
                auth: 'https://dev-api.gentooai.com/chat/api/v1/user',
                log: 'https://dev-api.gentooai.com/chat/api/v1/event/log',
                logLegacy: 'https://dev-api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://dev-api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://dev-api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
                cafe24Utils: 'https://dev-api.gentooai.com/chat/api/cafe24/utils',
                bootConfig: 'https://dev-api.gentooai.com/chat/api/sdk/boot'
            }
            // cafe24 Gentoo-dev App
            this.cafe24ClientId = 'ckUs4MK3KhZixizocrCmTA';
            this.cafe24Version = '2024-09-01';
            /* // cafe24 Gentoo-prod App
            this.cafe24ClientId = 'QfNlFJBPD6mXVWkE8MybWD';
            this.cafe24Version = '2024-09-01'; */
        } else if (window.location.hostname === "stage-demo.gentooai.com") {
            this.hostSrc = "https://stage-demo.gentooai.com";
            this.domains = {
                auth: "https://stage-api.gentooai.com/chat/api/v1/user",
                log: "https://stage-api.gentooai.com/chat/api/v1/event/log",
                logLegacy: "https://stage-api.gentooai.com/chat/api/v1/event/userEvent",
                chatbot: "https://stage-api.gentooai.com/chat/api/v1/chat/chatbot",
                floating: "https://stage-api.gentooai.com/chat/api/v1/chat/floating",
                partnerId: "https://stage-api.gentooai.com/app/api/partner/v1/cafe24/mall",
                cafe24Utils: "https://stage-api.gentooai.com/chat/api/cafe24/utils",
                bootConfig: 'https://stage-api.gentooai.com/chat/api/sdk/boot'
            };
            // cafe24 Gentoo-prod App
            this.cafe24ClientId = 'QfNlFJBPD6mXVWkE8MybWD';
            this.cafe24Version = '2024-09-01';
        } else {
            this.hostSrc = 'https://demo.gentooai.com';
            this.domains = {
                auth: 'https://api.gentooai.com/chat/api/v1/user',
                log: 'https://api.gentooai.com/chat/api/v1/event/log',
                logLegacy: 'https://api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://api.gentooai.com/app/api/partner/v1/cafe24/mall',
                cafe24Utils: 'https://api.gentooai.com/chat/api/cafe24/utils',
                bootConfig: 'https://api.gentooai.com/chat/api/sdk/boot'
            }
            // cafe24 Gentoo-prod App
            this.cafe24ClientId = 'QfNlFJBPD6mXVWkE8MybWD';
            this.cafe24Version = '2024-09-01';
        }

        // Modify the CAFE24API initialization to ensure promises are handled correctly
        this.bootPromise = new Promise((resolve, reject) => {
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
                this.getPartnerId(CAFE24API.MALL_ID)
                    .then(partnerId => {
                        this.partnerId = partnerId;

                        // Then get customer ID
                        return getCustomerIDInfoPromise();
                    })
                    .then(res => {
                        if (res.id.member_id) {
                            this.cafe24UserId = res.id.member_id;
                            this.userType = "member";
                        } else {
                            this.cafe24UserId = res.id['guest_id'];
                            this.userType = "guest";
                        }

                        // 1. chatUserId 먼저 받아오기 (for floating/chatbot AB test)
                        return this.postChatUserId(this.cafe24UserId);
                    })
                    .then(chatUserId => {
                        this.chatUserId = chatUserId;
                        this.gentooSessionData.cuid = chatUserId;
                        sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));

                        // 2. chatUserId가 세팅된 후, 나머지 fetch 실행
                        return Promise.all([
                            this.getChatbotData(this.partnerId, chatUserId),
                            this.getBootConfig(chatUserId, window.location.href, this.displayLocation, this.itemId, this.partnerId)
                        ]);
                    })
                    .then(([chatbotData, bootConfig]) => {
                        this.chatbotData = chatbotData;
                        this.bootConfig = bootConfig;
                        const warningMessageData = chatbotData?.experimentalData?.find(item => item.key === "warningMessage");
                        const floatingZoom = chatbotData?.experimentalData?.find(item => item.key === "floatingZoom");
                        this.warningMessage = warningMessageData?.extra?.message;
                        this.warningActivated = warningMessageData?.activated;
                        this.floatingZoom = floatingZoom?.activated;
                        this.floatingAvatar = chatbotData?.avatar;
                        resolve();
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

        await this.injectLottie();
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

            this.chatUrl = `${this.hostSrc}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&variant=${this.variant}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;

            // Create UI elements after data is ready
            if (this.isDestroyed) this.destroy();
            else if (!this.bootConfig?.floating?.isVisible) {
                // console.log('not creating ui elements: isVisible is ', this.bootConfig?.floating?.isVisible);
            } else {
                this.createUIElements(position, showGentooButton, isCustomButton);
            }

        } catch (error) {
            console.error('Failed to initialize:', error);
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
        this.customButton = isCustomButton ? (document.getElementsByClassName("gentoo-custom-button")[0]) : null;
        // Add null checks before accessing properties
        if (
            !this.chatbotData ||
            !this.chatbotData.position ||
            !this.chatbotData.mobilePosition
        ) {
            console.error('Chatbot data is incomplete');
            return;
        }

        if (
            !this.bootConfig?.floating ||
            (!this.bootConfig?.floating?.button?.imageUrl && !this.floatingAvatar?.floatingAsset)
        ) {
            console.error('Floating data is incomplete');
            return;
        }

        // Create iframe elements
        this.dimmedBackground = document.createElement("div");
        this.dimmedBackground.className = "dimmed-background hide";
        this.dimmedBackground.setAttribute("data-gentoo-sdk", "true");

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
        this.iframe = document.createElement("iframe");
        this.iframe.src = this.chatUrl;

        // bootconfig floating imageurl OR floatingavatar floatingasset 중 하나
        const bootImage = this.bootConfig?.floating?.button?.imageUrl;
        const avatarAsset = this.floatingAvatar?.floatingAsset;
        this.useBootConfigFloatingImage = !!(bootImage && !bootImage.includes('default.lottie'));
        const selectedAsset = this.useBootConfigFloatingImage ? bootImage : avatarAsset;
        if (selectedAsset?.includes('lottie')) {
            const player = document.createElement('dotlottie-wc');
            player.setAttribute('autoplay', '');
            player.setAttribute('loop', '');
            player.setAttribute('mode', 'normal');
            // bootConfig 우선 순위로 변경 - 단, bootConfig가 default.lottie 라면 floatingAvatar 적용
            player.setAttribute('src', selectedAsset);
            player.style.width = this.isSmallResolution ? '68px' : this.floatingZoom ? '120px' : '94px';
            player.style.height = this.isSmallResolution ? '68px' : this.floatingZoom ? '120px' : '94px';
            player.style.cursor = 'pointer';
            player.appendChild(document.createTextNode('\u200B'));

            this.dotLottiePlayer = player;
        }

        if (this.isSmallResolution) {
            this.chatHeader.className = "chat-header-md";
            this.chatHandler.className = "chat-handler-md";
            this.chatHeaderText.className = "chat-header-text-md";
            this.closeButtonContainer.className = "chat-close-button-container-md";
            this.closeButtonIcon.className = "chat-close-button-icon-md";
            this.closeButtonText.className = "chat-close-button-text-md";
            this.closeButtonText.innerText = "접기";
            this.closeActionArea = document.createElement("div");
            this.closeActionArea.className = "chat-close-action-area-md";
            this.iframe.className = `chat-iframe-md ${this.warningActivated ? 'footer-add-height-md' : ''}`;
            this.closeButtonContainer.appendChild(this.closeButtonIcon);
            this.closeButtonContainer.appendChild(this.closeButtonText);
            // this.testButton = document.createElement("button");
            // this.testButton.className = "test-button";
            // this.testButton.innerText = "테스트";
            this.chatHeader.appendChild(this.chatHeaderText);
            this.chatHeader.appendChild(this.chatHandler);
            this.chatHeader.appendChild(this.closeButtonContainer);
            this.iframeContainer.appendChild(this.closeActionArea);
            // this.iframeContainer.appendChild(this.testButton);
        } else {
            this.chatHeader.className = "chat-header";
            this.chatHeaderText.className = "chat-header-text";
            this.closeButtonContainer.className = "chat-close-button-container";
            this.closeButtonIcon.className = "chat-close-button-icon";
            this.closeButtonText.className = "chat-close-button-text";
            this.closeButtonText.innerText = "채팅창 축소";
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

        // gentoo static parameters to iframe
        this.sendPostMessageHandler({
            messageType: "gentoo-statics",
            contentData: {
                experimentId: "flowlift_abctest_v1",
                partnerId: this.partnerId,
                variantId: this.variant,
                sessionId: this.sessionId || "sess-test",
                chatUserId: this.chatUserId,
                userType: this.userType,
                displayLocation: this.displayLocation,
                deviceType: this.isMobileDevice ? "mobile" : "web",
            }
        });

        this.logEventLegacy({
            eventCategory: "SDKFloatingRendered",
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
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
            }
            this.button.type = "button";
            this.button.style.backgroundImage = `url(${this.useBootConfigFloatingImage ? this.bootConfig?.floating?.button?.imageUrl : this.floatingAvatar?.floatingAsset})`;
            document.body.appendChild(this.floatingContainer);
            if (this.dotLottiePlayer) {
                this.floatingContainer.appendChild(this.dotLottiePlayer);
            } else {
                this.floatingContainer.appendChild(this.button);
            }

            if (Boolean(this.bootConfig?.floating?.autoChatOpen)) this.openChat();
            else if (!this.gentooSessionData?.redirectState && this.floatingCount < 2 && this.bootConfig?.floating?.button?.comment?.length > 0) {
                // Check if component is destroyed or clicked
                if (this.floatingClicked || this.isDestroyed || !this.floatingContainer)
                    return;

                this.expandedButtonWrapper = document.createElement("div");
                this.expandedButtonWrapper.className = `expanded-area-wrapper ${this.isSmallResolution ? 'expanded-area-wrapper-md' : this.floatingZoom ? 'expanded-area-wrapper-zoom' : ''}`;
                this.expandedButton = document.createElement("div");
                this.expandedText = document.createElement("p");
                if (this.isSmallResolution) {
                    this.expandedButton.className =
                        this.useBootConfigFloatingImage ?
                            `expanded-area-md expanded-area-neutral-md` :
                            !this.floatingAvatar || this.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                                `expanded-area-md` :
                                `expanded-area-md expanded-area-neutral-md`;
                    this.expandedText.className = "expanded-area-text-md"; // 추후 아가방 노티 후에 다른 SDK들과 동일하게 업데이트 필요
                } else {
                    this.expandedButton.className =
                        this.useBootConfigFloatingImage ?
                            `expanded-area expanded-area-neutral` :
                            !this.floatingAvatar || this.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                                "expanded-area" :
                                `expanded-area expanded-area-neutral`;
                    this.expandedText.className = `${this.floatingZoom ? 'expanded-area-text-zoom' : 'expanded-area-text'}`;
                }
                this.expandedButtonWrapper.appendChild(this.expandedButton);
                this.expandedButton.appendChild(this.expandedText);

                // Double check if floatingContainer still exists before appending
                if (this.floatingContainer && this.floatingContainer.parentNode) {
                    this.floatingContainer.appendChild(this.expandedButtonWrapper);

                    // Add text animation
                    let i = 0;
                    const addLetter = () => {
                        if (!this.bootConfig?.floating?.button?.comment) return;
                        if (i < this.bootConfig.floating.button.comment.length && !this.isDestroyed) {
                            this.expandedText.innerText += this.bootConfig.floating.button.comment[i];
                            i++;
                            setTimeout(addLetter, 1000 / this.bootConfig.floating.button.comment.length);
                        }
                    };
                    addLetter();
                    this.floatingCount += 1;

                    // Remove expanded button after delay
                    setTimeout(() => {
                        if (
                            this.floatingContainer &&
                            this.expandedButtonWrapper &&
                            this.expandedButtonWrapper.parentNode === this.floatingContainer
                        ) {
                            this.floatingContainer.removeChild(this.expandedButtonWrapper);
                        }
                    }, 7000);
                }
            }
        } else {
            if (Boolean(this.bootConfig?.floating?.autoChatOpen)) this.openChat();
        }

        this.elems = {
            iframeContainer: this.iframeContainer,
            iframe: this.iframe,
            chatHeader: this.chatHeader,
            dimmedBackground: this.dimmedBackground,
            button: this.button,
            expandedButtonWrapper: this.expandedButtonWrapper,
            customButton: this.customButton,
        }

        // Add event listeners
        this.setupEventListeners(position, isCustomButton);
        if (this.gentooSessionData?.redirectState) {
            setTimeout(() => {
                if (this.expandedButtonWrapper)
                    this.expandedButtonWrapper.classList.add('hide');
                if (this.button) {
                    this.button.classList.add('hide');
                }
                if (this.dotLottiePlayer) {
                    this.dotLottiePlayer.classList.add('hide');
                }
            }, 100);
            setTimeout(() => {
                this.openChat();
                this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'carouselRedirect', currentPage: window?.location?.href });
                this.gentooSessionData.redirectState = false;
                sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
            }, 500);
        }
        window.__GentooInited = 'created';
    }

    setupEventListeners(position) {
        // Button click event
        var buttonClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.floatingClicked = true;

            if (this.iframeContainer.classList.contains("iframe-container-hide")) {
                if (this.expandedButtonWrapper)
                    this.expandedButtonWrapper.classList.add('hide');
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
                this.openChat(e, this.elems);
                // if (this.eventCallback?.click !== null) {
                //     this.eventCallback?.click();
                // }
            } else {
                this.hideChat(
                    this.elems.iframeContainer,
                    this.elems.button,
                    this.elems.expandedButtonWrapper,
                    this.elems.dimmedBackground
                );
                if (this.button) {
                    if (this.isSmallResolution) {
                        this.button.className = "floating-button-common button-image-md";
                    } else {
                        this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
                    }
                    this.button.style.backgroundImage = `url(${this.useBootConfigFloatingImage ? this.bootConfig?.floating?.button?.imageUrl : this.floatingAvatar?.floatingAsset})`;
                }
                if (this.dotLottiePlayer) {
                    this.dotLottiePlayer.classList.remove('hide');
                }
            }
        };

        window?.addEventListener("message", (e) => {
            if (e.data.redirectState) {
                if (!this.isSmallResolution) {
                    this.gentooSessionData.redirectState = true;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                }
                window.location.href = e.data.redirectUrl;
            }
            if (e.data.formSubmittedState) {
                const params = { p1: e.data.firstAnswer, p2: e.data.secondAnswer };
                if (this.eventCallback.formSubmitted !== null) {
                    this.eventCallback?.formSubmitted(params);
                }
            }
            if (this.isSmallResolution && e.data.inputFocusState) {
                this.enableChat("full");
            }
            if (e.data.resetState) {
                if (this.isMobileDevice && this.iframeContainer) {
                    this.iframeContainer.style.height = "449px";
                }
            }
            if (e.data.closeRequestState) {
                this.hideChat();
            }
            if (e.data.addProductToCart) {
                this.addProductToCart(e.data.addProductToCart);
            }

            // if (this.isMobileDevice) {
            //     if (e.data.messageExistence === 'exist') {
            //         this.iframeHeightState = 'full';
            //     } else if (e.data.messageExistence === 'none') {
            //         this.iframeHeightState = 'shrink';
            //     }
            // }
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
                eventCategory: "chat_close_requested",
            });
        });
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
            this.dimmedBackground.className = 'dimmed-background hide';
            this.hideChat();
            if (this.button) this.button.style.backgroundImage = `url(${this.useBootConfigFloatingImage ? this.bootConfig?.floating?.button?.imageUrl : this.floatingAvatar?.floatingAsset})`;
        })

        this.chatHeader?.addEventListener("touchmove", (e) => {
            this.handleTouchMove(e, this.iframeContainer);
        }, { passive: true });

        this.chatHeader?.addEventListener("touchend", (e) => {
            this.handleTouchEnd(
                e,
                this.iframeContainer,
                this.button,
                this.expandedButtonWrapper,
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
                    this.expandedButtonWrapper,
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
        if (this.button) {
            if (this.button.parentNode) this.button.parentNode.removeChild(this.button);
        }
        if (this.expandedButtonWrapper) {
            if (this.expandedButtonWrapper.parentNode) this.expandedButtonWrapper.parentNode.removeChild(this.expandedButtonWrapper);
        }
        if (this.iframeContainer) {
            if (this.iframeContainer.parentNode) this.iframeContainer.parentNode.removeChild(this.iframeContainer);
        }
        this.button = null;
        this.expandedButtonWrapper = null;
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
        this.deleteViewport();

        // Remove event listeners
        window.removeEventListener("resize", this.handleResize);
        if (this.button) {
            this.button.removeEventListener("click", this.buttonClickHandler);
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
        this.expandedButtonWrapper = null;
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
        this.chatUserId = null;
        this.bootConfig = null;
        this.chatbotData = null;
        this.chatUrl = null;

        // Reset state flags
        this.isInitialized = false;
        this.floatingCount = 0;
        this.floatingClicked = false;

        window.__GentooInited = null;
    }

    // async logEvent(payload) {
    //     try {
    //         const params = {
    //             eventCategory: String(payload.eventCategory),
    //             chatUserId: String(payload.chatUserId),
    //             partnerId: String(payload.partnerId),
    //             channelId: this.isMobileDevice ? "mobile" : "web",
    //             products: payload?.products,
    //         };

    //         const response = await fetch(`${this.domains.log}/${this.partnerId}`, {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify(params),
    //         });

    //         const res = await response.json(); // JSON 형태의 응답 데이터 파싱
    //         return res;
    //     } catch (error) {
    //         console.error(`Error while calling logEvent API: ${error}`);
    //     }
    // }

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

    async postChatUserId(userToken, udid = "") {
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
            console.error(`Error while calling postChatUserId API: ${error}`)
        }
    }

    async getChatbotData(partnerId, chatUserId) {
        try {
            const response = await fetch(`${this.domains.chatbot}/${partnerId}?chatUserId=${chatUserId}`, {
                method: "GET",
                headers: {},
            });
            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling fetchChatbotId API: ${error}`);
        }
    }

    /* async getFloatingData(partnerId, chatUserId) {
        try {
            const response = await fetch(
                `${this.domains.floating}/${partnerId}?displayLocation=${this.displayLocation}&itemId=${this.itemId}&chatUserId=${chatUserId}`,
                {
                    method: "GET",
                    headers: {},
                }
            );

            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling getFloatingData API: ${error}`);
        }
    } */

    async getBootConfig(chatUserId, currentUrl, displayLocation, itemId, partnerId) {
        try {
            const response = await fetch(
                `${this.domains.bootConfig}?chatUserId=${chatUserId}&url=${currentUrl}&displayLocation=${displayLocation}&itemId=${itemId}`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${partnerId}`,
                    },
                }
            );
            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling getBootConfig API: ${error}`);
        }
    }

    async getPartnerId(mallId) {
        try {
            const url = `${this.domains.partnerId}/${mallId}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {}
            });
            const res = await response.json();
            return res.partnerId;
        } catch (error) {
            console.error(`Error while calling getPartnerId API: ${error}`)
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

        this.sendPostMessageHandler({ enableMode: mode });

        if (this.bootConfig?.greeting?.comment && this.bootConfig.greeting.comment.length > 0) {
            this.sendPostMessageHandler({ bootConfigGreetingComment: this.bootConfig.greeting.comment });
        }

        if (this.isSmallResolution) {
            this.dimmedBackground.className = "dimmed-background";
            if (this.button) this.button.className = "floating-button-common hide";
            if (this.expandedButtonWrapper) this.expandedButtonWrapper.classList.add("hide");
            if (this.dotLottiePlayer) this.dotLottiePlayer.classList.add('hide');
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
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
            }
        }
        if (this.dotLottiePlayer) this.dotLottiePlayer.classList.remove('hide');
        if (this.expandedButtonWrapper) this.expandedButtonWrapper.classList.add("hide");
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

    /**
     * 현재 URL 또는 주어진 URL에서 product_no 값을 추출하는 함수
     * 
     * @param {string} [urlString=window.location.href] - 분석할 URL 문자열
     * @returns {string|null} - 추출된 product_no 값 또는 null (찾을 수 없을 경우)
     */
    getProductNo(urlString = window.location.href) {
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

    // Inject the CSS automatically
    injectCSS("https://sdk.gentooai.com/floating-button-sdk-cafe24.css");
    // injectCSS("https://dev-sdk.gentooai.com/floating-button-sdk-cafe24.css");
    // injectCSS("./floating-button-sdk-cafe24.css");

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