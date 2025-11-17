import '../global.css'
import './floating-sdk-cafe24-modal.css';
import { getChatbotData, postChatUserId, getFloatingData, getPartnerId, postChatEventLog, getBootConfig, postChatEventLogLegacy } from './apis/chatConfig';
import { createUIElementsModal } from './utils/createUIElementsModal';

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
        this.variant = sessionStorage.getItem('gentoo-cafe24-variant');
        if (!this.variant) {
            var r = Math.floor(Math.random() * 2);
            if (r === 0) this.variant = 'variantB';
            else this.variant = 'variantC';
            sessionStorage.setItem('gentoo-cafe24-variant', this.variant);
        }
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
        this.browserWidth = this.logWindowWidth();
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
                });

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
                getPartnerId(CAFE24API.MALL_ID)
                    .then(partnerId => {
                        this.partnerId = partnerId;
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
                        return postChatUserId(this.cafe24UserId, '', this.partnerId, this.chatUserId);
                    })
                    .then(chatUserId => {
                        this.chatUserId = chatUserId;
                        this.gentooSessionData.cuid = chatUserId;
                        sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));

                        // 2. chatUserId가 세팅된 후, 나머지 fetch 실행
                        return Promise.all([
                            getChatbotData(this.partnerId, chatUserId),
                            getFloatingData(this.partnerId, this.displayLocation, this.itemId, chatUserId),
                            getBootConfig(this.chatUserId, window.location.href, this.displayLocation, this.itemId, this.partnerId),
                        ]);
                    })
                    .then(([chatbotData, floatingData, bootConfig]) => {
                        console.log('chatbotData', chatbotData);
                        console.log('floatingData', floatingData);
                        console.log('bootConfig', bootConfig);
                        this.bootConfig = bootConfig;
                        this.chatbotData = chatbotData;
                        this.floatingData = floatingData;
                        const warningMessageData = chatbotData?.experimentalData.find(item => item.key === "warningMessage");
                        const floatingZoom = chatbotData?.experimentalData.find(item => item.key === "floatingZoom");
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
                client_id: process.env.CAFE24_CLIENTID,
                version: process.env.CAFE24_VERSION
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

            // this.chatUrl = `${process.env.API_CHAT_HOST_URL}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;
            // this.chatUrl = `${process.env.API_CHAT_HOST_URL}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&mode=modal&variant=${this.addProductToCartVariant}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;
            this.chatUrl = `https://accio-webclient-git-feat-seo-4727-waddle.vercel.app/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&mode=modal&variant=${this.variant}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;

            // Create UI elements after data is ready

            // Create UI elements after data is ready
            if (this.isDestroyed) this.destroy();
            else if (!this.bootConfig?.floating?.isVisible) {
                console.log('not creating ui elements: isVisible is ', this.bootConfig?.floating?.isVisible);
            } else { 
                createUIElementsModal(
                    this, // this 객체를 첫 번째 인자로 전달
                    position,
                    showGentooButton,
                    isCustomButton,
                    this.checkSDKExists(),
                    this.customButton,
                    this.chatbotData,
                );
            }

        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }

    // Separate UI creation into its own method for clarity
    //  createUIElements(position, showGentooButton, isCustomButton = false) {
    //     // Check if any SDK elements exist in document
    //     if (this.checkSDKExists()) {
    //         console.warn("GentooIO UI elements already exist in the document, skipping creation.");
    //         window.__GentooInited = 'created';
    //         return;
    //     }

    //     window.__GentooInited = 'creating';
    //     this.customButton = isCustomButton ? (document.getElementsByClassName("gentoo-custom-button")[0]) : null;
    //     // Add null checks before accessing properties
    //     if (
    //         !this.chatbotData ||
    //         !this.chatbotData.position ||
    //         !this.chatbotData.mobilePosition
    //     ) {
    //         console.error('Chatbot data is incomplete');
    //         return;
    //     }

    //     if (!this.floatingData || !this.floatingData.imageUrl) {
    //         console.error('Floating data is incomplete');
    //         return;
    //     }

    //     // Create iframe elements
    //     this.dimmedBackground = document.createElement("div");
    //     this.dimmedBackground.className = "dimmed-background hide";
    //     this.dimmedBackground.setAttribute("data-gentoo-sdk", "true");

    //     this.iframeContainer = document.createElement("div");
    //     this.iframeContainer.className = "iframe-container iframe-container-hide";
    //     this.iframeContainer.setAttribute("data-gentoo-sdk", "true");

    //     this.chatHeader = document.createElement("div");
    //     this.chatHandler = document.createElement("div");
    //     this.chatHeaderText = document.createElement("p");
    //     this.closeButtonContainer = document.createElement("div");
    //     this.closeButtonIcon = document.createElement("div");
    //     this.closeButtonText = document.createElement("p");
    //     this.chatHeaderText.innerText = "Gentoo";
    //     this.footer = document.createElement("div");
    //     this.footer.className = "chat-footer";
    //     this.footerText = document.createElement("p");
    //     this.footerText.className = "chat-footer-text";
    //     this.footer.appendChild(this.footerText);
    //     this.iframe = document.createElement("iframe");
    //     this.iframe.src = this.chatUrl;
    //     if (this.floatingAvatar?.floatingAsset || this.floatingData.imageUrl.includes('gentoo-anime-web-default.lottie')) {
    //         const player = document.createElement('dotlottie-player');
    //         player.setAttribute('autoplay', '');
    //         player.setAttribute('loop', '');
    //         player.setAttribute('mode', 'normal');
    //         player.setAttribute('src', this.floatingAvatar?.floatingAsset || this.floatingData.imageUrl);
    //         player.style.width = this.isSmallResolution ? '68px' : this.floatingZoom ? '120px' : '94px';
    //         player.style.height = this.isSmallResolution ? '68px' : this.floatingZoom ? '120px' : '94px';
    //         player.style.cursor = 'pointer';
    //         this.dotLottiePlayer = player;
    //     }

    //     if (this.isSmallResolution) {
    //         this.chatHeader.className = "chat-header-md";
    //         this.chatHandler.className = "chat-handler-md";
    //         this.chatHeaderText.className = "chat-header-text-md";
    //         this.closeButtonContainer.className = "chat-close-button-container-md";
    //         this.closeButtonIcon.className = "chat-close-button-icon-md";
    //         this.closeButtonText.className = "chat-close-button-text-md";
    //         this.closeButtonText.innerText = "접기";
    //         this.closeActionArea = document.createElement("div");
    //         this.closeActionArea.className = "chat-close-action-area-md";
    //         this.iframe.className = `chat-iframe-md ${this.warningActivated ? 'footer-add-height-md' : ''}`;
    //         this.closeButtonContainer.appendChild(this.closeButtonIcon);
    //         this.closeButtonContainer.appendChild(this.closeButtonText);
    //         // this.testButton = document.createElement("button");
    //         // this.testButton.className = "test-button";
    //         // this.testButton.innerText = "테스트";
    //         this.chatHeader.appendChild(this.chatHeaderText);
    //         this.chatHeader.appendChild(this.chatHandler);
    //         this.chatHeader.appendChild(this.closeButtonContainer);
    //         this.iframeContainer.appendChild(this.closeActionArea);
    //         // this.iframeContainer.appendChild(this.testButton);
    //     } else {
    //         this.chatHeader.className = "chat-header";
    //         this.chatHeaderText.className = "chat-header-text";
    //         this.closeButtonContainer.className = "chat-close-button-container";
    //         this.closeButtonIcon.className = "chat-close-button-icon";
    //         this.closeButtonText.className = "chat-close-button-text";
    //         this.closeButtonText.innerText = "채팅창 축소";
    //         this.iframe.className = `chat-iframe ${this.warningActivated ? 'footer-add-height' : ''}`;
    //         this.closeButtonContainer.appendChild(this.closeButtonIcon);
    //         this.closeButtonContainer.appendChild(this.closeButtonText);
    //         this.chatHeader.appendChild(this.chatHeaderText);
    //         this.chatHeader.appendChild(this.closeButtonContainer);
    //     }

    //     this.iframeContainer.appendChild(this.chatHeader);
    //     this.iframeContainer.appendChild(this.iframe);
    //     if (this.warningActivated) {
    //         this.footerText.innerText = this.warningMessage;
    //         this.iframeContainer.appendChild(this.footer);
    //     }
    //     document.body.appendChild(this.dimmedBackground);
    //     document.body.appendChild(this.iframeContainer);

    //     postChatEventLog({
    //         eventCategory: "SDKFloatingRendered",
    //         partnerId: this.partnerId,
    //         chatUserId: this.chatUserId,
    //         products: [],
    //     }, this.isMobileDevice);
    //     window?.GentooLogListener?.log({ type: 'floatingEvent', event: 'floatingButtonRendered' });

    //     // Create floating button
    //     if (showGentooButton) {
    //         this.floatingContainer = document.createElement("div");
    //         this.floatingContainer.className = `floating-container`;
    //         this.floatingContainer.setAttribute("data-gentoo-sdk", "true");

    //         this.updateFloatingContainerPosition(position); // Set initial position
    //         this.button = document.createElement("div");
    //         if (this.isSmallResolution) {
    //             this.button.className = `floating-button-common button-image-md`;
    //         } else {
    //             this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
    //         }
    //         this.button.type = "button";
    //         this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
    //         document.body.appendChild(this.floatingContainer);
    //         if (this.dotLottiePlayer) {
    //             this.floatingContainer.appendChild(this.dotLottiePlayer);
    //         } else {
    //             this.floatingContainer.appendChild(this.button);
    //         }
    //     }

    //     this.elems = {
    //         iframeContainer: this.iframeContainer,
    //         iframe: this.iframe,
    //         chatHeader: this.chatHeader,
    //         dimmedBackground: this.dimmedBackground,
    //         button: this.button,
    //         expandedButton: this.expandedButton,
    //         customButton: this.customButton,
    //     }

    //     // Add event listeners
    //     this.setupEventListeners(position, isCustomButton);
    //     if (this.gentooSessionData?.redirectState) {
    //         setTimeout(() => {
    //             if (this.expandedButton)
    //                 this.expandedButton.classList.add('hide');
    //             if (this.button) {
    //                 this.button.classList.add('hide');
    //             }
    //             if (this.dotLottiePlayer) {
    //                 this.dotLottiePlayer.classList.add('hide');
    //             }
    //         }, 100);
    //         setTimeout(() => {
    //             this.openChat();
    //             this.gentooSessionData.redirectState = false;
    //             sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
    //         }, 500);
    //     }
    //     window.__GentooInited = 'created';
    // }

    setupEventListeners(position) {
        // Button click event
        var buttonClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.floatingClicked = true;
            console.log('clicked element', e.target);

            // if (this.iframeContainer.classList.contains("iframe-container-hide")) {
            //     if (this.expandedButton)
            //         this.expandedButton.classList.add('hide');
            //     if (this.button) {
            //         if (this.isSmallResolution) {
            //             this.button.className =
            //                 "floating-button-common button-image-close-mr hide";
            //         } else {
            //             this.button.className =
            //                 "floating-button-common button-image-close hide";
            //         }
            //     }
            //     if (this.dotLottiePlayer) {
            //         this.dotLottiePlayer.classList.add('hide');
            //     }
            //     this.openChat(e, this.elems);
            //     // if (this.eventCallback?.click !== null) {
            //     //     this.eventCallback?.click();
            //     // }
            // } else {
            //     this.hideChat(
            //         this.elems.iframeContainer,
            //         this.elems.button,
            //         this.elems.expandedButton,
            //         this.elems.dimmedBackground
            //     );
            //     if (this.button) {
            //         if (this.isSmallResolution) {
            //             this.button.className = "floating-button-common button-image-md";
            //         } else {
            //             this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
            //         }
            //         this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
            //     }
            //     if (this.dotLottiePlayer) {
            //         this.dotLottiePlayer.classList.remove('hide');
            //     }
            // }
            if (this.messageExistence || this.displayLocation === 'PRODUCT_DETAIL') {
                this.openChat();
            } else if (this.inputContainer.classList.contains("hide")) {
                this.dimmedBackground.classList.remove("hide");
                this.inputContainer.classList.remove("hide");
                this.inputWrapper.classList.remove("shrink-hide");
                this.input.classList.remove("shrink-hide");
                this.examFloatingGroup.classList.add("slide-up");
                this.examFloatingGroup.classList.remove("hide");
                // this.examFloatingButton.classList.remove("slide-down");
                // this.examFloatingButton.classList.remove("hide");
                this.sendButton.classList.remove("hide");
                this.profileImage.classList.remove("hide");
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
                this.input.focus();
            }
            // } else {
            //     this.inputContainer.classList.add("shrink-hide");
            //     this.inputWrapper.classList.add("shrink-hide");
            //     this.input.classList.add("shrink-hide");
            //     this.sendButton.classList.add("hide");
            //     this.profileImage.classList.add("hide");

            //     if (this.button) {
            //         if (this.isSmallResolution) {
            //             this.button.className = "floating-button-common button-image-md";
            //         } else {
            //             this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
            //         }
            //         this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
            //     }
            //     if (this.dotLottiePlayer) {
            //         this.dotLottiePlayer.classList.remove('hide');
            //     }
            // }
        };

        const performInputBlur = () => {
            if (this.dimmedBackground) this.dimmedBackground.classList.add('hide');
            this.inputContainer.classList.add("hide");
            this.inputWrapper.classList.add("shrink-hide");
            this.input.classList.add("shrink-hide");
            this.examFloatingGroup.classList.remove("slide-up");
            this.examFloatingGroup.classList.add("hide");
            this.sendButton.classList.add("hide");
            this.profileImage.classList.add("hide");

            this.inputContainerTimeout = setTimeout(() => {
                if (this.iframeContainer.classList.contains("iframe-container-shrink")) return;
                if (this.button) {
                    if (this.isSmallResolution) {
                        this.button.className = "floating-button-common button-image-md";
                    } else {
                        this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
                    }
                    this.button.style.backgroundImage = `url(${this.bootConfig?.floating?.button?.imageUrl || this.floatingData.imageUrl})`;
                }
                if (this.dotLottiePlayer) {
                    this.dotLottiePlayer.classList.remove('hide');
                    this.dotLottiePlayer.setAttribute('src', this.bootConfig?.floating?.button?.imageUrl || this.floatingData.imageUrl);
                }
            }, 100);
            this.inputContainerTimeout = null;
        };

        this.input?.addEventListener("blur", () => {
            if (this.isInteractingWithSend) {
                setTimeout(() => {
                    this.isInteractingWithSend = false;
                    performInputBlur();
                }, 0);
                return;
            }
            performInputBlur();
        });

        window?.addEventListener("message", (e) => {
            console.log('[DEBUG] message', e.data);
            if (e.data.redirectState) {
                console.log('[DEBUG] redirectState', e.data.redirectState);
                if (!this.isSmallResolution) {
                    this.gentooSessionData.redirectState = true;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                }
                this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'carouselRedirect', currentPage: e.data.redirectUrl });
                window.location.href = e.data.redirectUrl;
            }
            if (e.data.formSubmittedState) {
                const params = { p1: e.data.firstAnswer, p2: e.data.secondAnswer };
                if (this.eventCallback.formSubmitted !== null) {
                    this.eventCallback?.formSubmitted(params);
                }
            }
            if (this.isSmallResolution && e.data.inputFocusState) {
                // this.enableChat("full");
            }
            if (e.data.resetState) {
                if (this.isMobileDevice && this.iframeContainer) {
                    this.hideChat();
                    // open modal 로 묶어야 됨
                    if (this.inputContainer.classList.contains("hide")) {
                        this.inputContainer.classList.remove("hide");
                        this.inputWrapper.classList.remove("shrink-hide");
                        this.input.classList.remove("shrink-hide");
                        this.examFloatingGroup.classList.add("slide-up");
                        this.examFloatingGroup.classList.remove("hide");
                        // this.examFloatingButton.classList.remove("slide-down");
                        // this.examFloatingButton.classList.remove("hide");
                        this.sendButton.classList.remove("hide");
                        this.profileImage.classList.remove("hide");
                        if (this.dimmedBackground) this.dimmedBackground.classList.remove('hide');
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
                        this.input.focus();
                    }
                }
            }
            if (e.data.closeRequestState) {
                this.hideChat();
            }
            if (e.data.addProductToCart) {
                this.addProductToCart(e.data.addProductToCart);
            }
            if (e.data.addProductWithOptionsToCart) {
                this.addProductWithOptionsToCart(e.data.addProductWithOptionsToCart);
            }

            if (e.data.floatingMessage) {
                if (!this.gentooSessionData?.redirectState && this.floatingCount < 2 && e.data.floatingMessage?.length > 0) {
                    // Check if component is destroyed or clicked
                    if (this.floatingClicked || this.isDestroyed || !this.floatingContainer)
                        return;
                    this.floatingMessage = e.data.floatingMessage;
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
                        this.expandedText.className = `${this.floatingZoom ? 'expanded-area-text-zoom' : 'expanded-area-text'}`;
                    }
                    this.expandedButton.appendChild(this.expandedText);

                    // Double check if floatingContainer still exists before appending
                    if (this.floatingContainer && this.floatingContainer.parentNode) {
                        this.floatingContainer.appendChild(this.expandedButton);

                        this.addLetter(this.bootConfig?.floating?.button?.comment || this.floatingData.comment, this.expandedText, () => this.isDestroyed);
                        this.floatingCount += 1;

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

            if (e.data.connectionId) {
                window?.GentooLogListener?.log({ type: 'healthCheck', event: 'registered', connectionId: e.data.connectionId });
            }
            if (e.data.type === 'messageExistence') {
                console.log('messageExistence', e.data.messageExistenceState);
                this.messageExistence = e.data.messageExistenceState;
                sessionStorage.setItem('gentoo', JSON.stringify({ ...this.gentooSessionData, messageExistence: e.data.messageExistenceState }));
            }
        });

        this.floatingContainer?.addEventListener("click", buttonClickHandler);
        this.floatingContainer?.addEventListener("click", (e) => {
            this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href });
            window?.GentooLogListener?.log({ type: 'floatingEvent', event: 'floatingButtonClick', floatingMessage: this.floatingMessage });
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
                eventCategory: "gentoo_clicked",
                context: {
                    autoChatOpen: Boolean(this.bootConfig?.floating?.autoChatOpen),
                    floatingText: this.bootConfig?.floating?.button?.comment,
                },
            }, this.isMobileDevice);
    
            postChatEventLogLegacy({
                eventCategory: 'SDKFloatingClicked',
                partnerId: this.partnerId,
                chatUserId: this.chatUserId,
                products: [],
            }, this.isMobileDevice);
        });
        this.closeButtonContainer?.addEventListener("click", buttonClickHandler);
        this.closeButtonContainer?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeButtonContainer', currentPage: window?.location?.href }));
        this.closeButtonIcon?.addEventListener("click", buttonClickHandler);
        this.closeActionArea?.addEventListener("click", (e) => {
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
            this.hideChat();
            this.redirectToCartPage();
            // add letter 관련 묶어야 됨
            setTimeout(() => {
                this.floatingMessage = '궁금한 게 있으시면 언제든 다시 눌러주세요!';
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
                    this.expandedText.className = `${this.floatingZoom ? 'expanded-area-text-zoom' : 'expanded-area-text'}`;
                }
                this.expandedButton.appendChild(this.expandedText);
                if (this.floatingContainer && this.floatingContainer.parentNode) {
                    this.floatingContainer.appendChild(this.expandedButton);

                    this.addLetter(this.floatingMessage, this.expandedText, () => this.isDestroyed);
                    this.floatingCount += 1;

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
            }, 500);
        });
        this.closeActionArea?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeActionArea', currentPage: window?.location?.href }));
        this.customButton?.addEventListener("click", buttonClickHandler);
        this.customButton?.addEventListener("click", (e) => this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href }));
        this.sendButton?.addEventListener("pointerdown", () => { this.isInteractingWithSend = true; });
        this.sendButton?.addEventListener("mousedown", () => { this.isInteractingWithSend = true; });
        this.sendButton?.addEventListener("touchstart", () => { this.isInteractingWithSend = true; }, { passive: true });
        this.sendButton?.addEventListener("click", (e) => {
            this.iframeContainer.style.height = "400px";
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
                eventCategory: "chat_input_started",
                context: {
                    dialogueId: this.dialogueId,
                    inputType: "manual_input",
                    messageText: this.input.value,
                    messageLength: this.input.value.length,
                },
            });
            this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'sendButton', currentPage: window?.location?.href, requestMessage: this.input.value });
            this.openChat();
            this.input.value = "";
            this.input.blur();
        });

        // 예시 버튼 클릭 이벤트 추가
        this.examFloatingGroup?.addEventListener("pointerdown", () => { this.isInteractingWithSend = true; });
        this.examFloatingGroup?.addEventListener("mousedown", () => { this.isInteractingWithSend = true; });
        this.examFloatingGroup?.addEventListener("touchstart", () => { this.isInteractingWithSend = true; }, { passive: true });
        this.examFloatingGroup.addEventListener("click", (e) => {
            const button = e.target.closest('.exam-floating-button');
            if (button) {
                this.iframeContainer.style.height = "400px";
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
                    eventCategory: "chat_input_started",
                    context: {
                        dialogueId: this.dialogueId,
                        inputType: "example_click",
                        messageText: button.innerText,
                        messageLength: button.innerText.length,
                    },
                });
                this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'sendButton', currentPage: window?.location?.href, requestMessage: button.innerText });
                this.openChat();
                this.input.blur();
            }
        });

        // 엔터키 이벤트 추가
        this.input?.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.keyCode === 13) {
                e.preventDefault(); // 기본 엔터 동작 방지
                this.iframeContainer.style.height = "400px";
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
                    eventCategory: "chat_input_started",
                    context: {
                        dialogueId: this.dialogueId,
                        inputType: "manual_input",
                        messageText: this.input.value,
                        messageLength: this.input.value.length,
                    },
                });
                this.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'sendButton', currentPage: window?.location?.href, requestMessage: this.input.value });
                this.openChat();
                this.input.value = "";
                this.input.blur();
            }
        });
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
        this.deleteViewport();

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

    addLetter(floatingMessage, expandedText, isDestroyed, i = 0) {
        if (!floatingMessage || floatingMessage.length === 0) return;
        this.floatingMessage = floatingMessage;
        if (i < floatingMessage.length && !isDestroyed()) {
            expandedText.innerText += floatingMessage[i];
            setTimeout(() => this.addLetter(floatingMessage, expandedText, isDestroyed, i + 1), 1000 / floatingMessage.length);
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

        console.log('[sdk] productBulkObject', productBulkObject);
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
        this.deleteViewport();

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
        console.log('sendPostMessageHandler', payload);
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
        const hasIframeContainer = document.querySelector('div[class^="iframe-container"][data-gentoo-sdk="true"]') !== null;
        const hasFloatingContainer = document.querySelector('div[class^="floating-container"][data-gentoo-sdk="true"]') !== null;

        if (hasIframeContainer || hasFloatingContainer) {
            return true;
        }

        if (isInIframe) {
            try {
                if (window.top.document) {
                    if (window.top.__GentooInited !== null && window.top.__GentooInited !== undefined) {
                        return true;
                    }

                    // 부모 document의 SDK set 
                    const parentHasIframeContainer = window.top.document.querySelector('div[class^="iframe-container"][data-gentoo-sdk="true"]') !== null;
                    const parentHasFloatingContainer = window.top.document.querySelector('div[class^="floating-container"][data-gentoo-sdk="true"]') !== null;

                    return parentHasIframeContainer || parentHasFloatingContainer;
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