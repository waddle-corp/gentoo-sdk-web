import './floating-sdk.css';
import { 
    getChatbotData, 
    postChatUserId, 
    getBootConfig, 
    postChatEventLog 
} from './apis/chatConfig';


class FloatingButton {
    constructor(props) {
        // 기본적으로 iframe 내에서 실행 방지, 다음은 허용된 도메인 목록
        this.allowedDomainsForIframe = [
            'admin.shopify.com',
            '*.myshopify.com',  
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
        this.partnerType = props.partnerType || "gentoo";
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
            preInputSubmitted: null,
            userSentMessage: null,
        }
        this.iframeHeightState;
        this.viewportInjected = false;
        this.originalViewport = null;


        // Add a promise to track initialization status
        this.bootPromise = Promise.all([
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
                const warningMessageData = this.chatbotData?.experimentalData?.find(item => item.key === "warningMessage");
                const floatingZoom = this.chatbotData?.experimentalData?.find(item => item.key === "floatingZoom");
                this.warningMessage = warningMessageData?.extra?.message;
                this.warningActivated = warningMessageData?.activated;
                this.floatingZoom = floatingZoom?.activated;
            }),
            getBootConfig(this.chatUserId, window.location.href, this.displayLocation, this.itemId, this.partnerId).then((res) => {
                if (!res) throw new Error("Failed to fetch boot config");
                this.bootConfig = res;
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

            // Fetch floating data before creating UI elements
            // this.floatingData = await getFloatingData(this.partnerId, this.displayLocation, this.itemId, this.chatUserId);
            // if (!this.floatingData) {
            //     throw new Error("Failed to fetch floating data");
            // }
            this.chatUrl = `${process.env.API_CHAT_HOST_URL}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&dp=${this.displayLocation}&it=${this.itemId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}&lang=${this.partnerType === 'shopify' ? 'en' : 'ko'}`;

            // Create UI elements after data is ready
            if (this.isDestroyed) this.destroy();
            else if (!this.bootConfig?.floating?.isVisible) {
                // console.log('not creating ui elements: isVisible is ', this.bootConfig?.floating?.isVisible);
            } else {
                this.createUIElements(position, showGentooButton, isCustomButton);
            }

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
        this.customButton = isCustomButton ? document.getElementsByClassName("gentoo-custom-button")[0] : null;
        // Add null checks before accessing properties
        if (
            !this.chatbotData ||
            !this.chatbotData.position ||
            !this.chatbotData.mobilePosition
        ) {
            console.error("Chatbot data is incomplete");
            return;
        }

        // if (!this.floatingData || !this.floatingData.imageUrl) {
        if (!this.bootConfig?.floating || !this.bootConfig?.floating?.button?.imageUrl) {
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
        this.iframe = document.createElement("iframe");
        this.iframe.src = this.chatUrl;
        if (this.floatingAvatar?.floatingAsset?.includes('lottie') || this.bootConfig?.floating?.button?.imageUrl?.includes('lottie')) {
            const player = document.createElement('dotlottie-player');
            player.setAttribute('autoplay', '');
            player.setAttribute('loop', '');
            player.setAttribute('mode', 'normal');
            // bootConfig 우선 순위로 변경
            player.setAttribute('src', this.bootConfig?.floating?.button?.imageUrl || this.floatingAvatar?.floatingAsset);
            player.style.width = this.floatingZoom ? '120px' : this.isSmallResolution ? '68px' : '94px';
            player.style.height = this.floatingZoom ? '120px' : this.isSmallResolution ? '68px' : '94px';
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
            this.closeButtonText.innerText = this.partnerType === 'shopify' ? "Collapse" : "접기";
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
            this.closeButtonText.innerText = this.partnerType === 'shopify' ? "Minimize" : "채팅창 축소";
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
        
        postChatEventLog({
            eventCategory: "SDKFloatingRendered",
            partnerId: this.partnerId,
            chatUserId: this.chatUserId,
            products: [],
        }, this.isMobileDevice);

        // Create floating button
        if (showGentooButton) {
            this.floatingContainer = document.createElement("div");
            this.floatingContainer.className = `floating-container`;
            if (this.partnerId === '67615284c5ff44110dbc6613') {
                this.floatingContainer.className = `floating-container-fastfive`;
            }
            this.floatingContainer.setAttribute("data-gentoo-sdk", "true");
            this.updateFloatingContainerPosition(position); // Set initial position
            this.button = document.createElement("div");
            if (this.isSmallResolution) {
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image-md'}`;
            } else {
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
            }
            this.button.type = "button";
            this.button.style.backgroundImage = `url(${this.bootConfig?.floating?.button?.imageUrl || this.floatingAvatar?.floatingAsset})`;
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
                this.expandedButtonWrapper.className = `expanded-area-wrapper ${this.floatingZoom ? 'expanded-area-wrapper-zoom' : this.isSmallResolution ? 'expanded-area-wrapper-md' : ''}`;
                this.expandedButton = document.createElement("div");
                this.expandedText = document.createElement("p");
                if (this.isSmallResolution) {
                    this.expandedButton.className = 
                        this.bootConfig?.floating?.button?.imageUrl && this.bootConfig?.floating?.button?.imageUrl.includes('default.lottie') ?
                        `expanded-area-md` :
                        this.bootConfig?.floating?.button?.imageUrl ?
                        `expanded-area-md expanded-area-neutral-md` :
                        !this.floatingAvatar || this.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                        `expanded-area-md` :
                        `expanded-area-md expanded-area-neutral-md`;
                    this.expandedText.className = `${this.floatingZoom ? 'expanded-area-text-zoom-md' : 'expanded-area-text-md'}`;
                } else {
                    this.expandedButton.className = 
                        this.bootConfig?.floating?.button?.imageUrl && this.bootConfig?.floating?.button?.imageUrl.includes('default.lottie') ?
                        "expanded-area" :
                        this.bootConfig?.floating?.button?.imageUrl ?
                        "expanded-area expanded-area-neutral" :
                        !this.floatingAvatar || this.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                        "expanded-area" :
                        "expanded-area expanded-area-neutral";
                    this.expandedText.className = `${this.floatingZoom ? 'expanded-area-text-zoom' : 'expanded-area-text'}`;
                }

                this.expandedButtonWrapper.appendChild(this.expandedButton);
                this.expandedButton.appendChild(this.expandedText);

                // Double check if floatingContainer still exists before appending
                if (this.floatingContainer && this.floatingContainer.parentNode) {
                    this.floatingContainer.appendChild(this.expandedButtonWrapper);
                    this.addLetter(this.bootConfig, this.expandedText, () =>this.isDestroyed);

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
        };

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

    addLetter(bootConfig, expandedText, isDestroyed, i = 0) {
        if (!bootConfig?.floating?.button?.comment) return;
        if (i < bootConfig.floating.button.comment.length && !isDestroyed()) {
            expandedText.innerText += bootConfig.floating.button.comment[i];
            setTimeout(() => this.addLetter(bootConfig, expandedText, isDestroyed, i + 1), 1000 / bootConfig.floating.button.comment.length);
        }
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
                if (this.customButton) {
                    this.customButton.classList.add('hide');
                }
                this.openChat(e, this.elems);
                if (this.eventCallback.click !== null) {
                    this.eventCallback.click();
                }
            } else {
                this.hideChat(
                    this.elems.iframeContainer,
                    this.elems.button,
                    this.elems.expandedButtonWrapper,
                    this.elems.dimmedBackground
                );
                if (this.button) {
                    if (this.isSmallResolution) {
                        this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image-md'}`;
                    } else {
                        this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
                    }
                    this.button.style.backgroundImage = `url(${this.bootConfig?.floating?.button?.imageUrl || this.floatingAvatar?.floatingAsset})`;
                    if (this.dotLottiePlayer) {
                        this.dotLottiePlayer.classList.remove('hide');
                    }
                }
                if (this.customButton) {
                    this.customButton.classList.remove('hide');
                }
            }
        };

        window?.addEventListener("message", (e) => {
            if (e.data.redirectState) {
                if (!this.isSmallResolution) {
                    this.gentooSessionData.redirectState = true;
                    sessionStorage.setItem('gentoo', JSON.stringify(this.gentooSessionData));
                }
                this.sendPostMessageHandler({buttonClickState: true, clickedElement: 'carouselRedirect', currentPage: e.data.redirectUrl});
                window.location.href = e.data.redirectUrl;
            }
            if (e.data.formSubmittedState) {
                const params = { p1: e.data.firstAnswer, p2: e.data.secondAnswer };
                if (this.eventCallback.formSubmitted !== null) {
                    this.eventCallback?.formSubmitted(params);
                }
            }
            if (e.data.preInputSubmittedState) {
                if (this.eventCallback.preInputSubmitted !== null) {
                    if (e.data.step1) {
                        this.eventCallback?.preInputSubmitted({step1: e.data.step1});
                    } else if (e.data.step2) {
                        this.eventCallback?.preInputSubmitted({step2: e.data.step2});
                    }
                }
            }
            if (e.data.userSentMessageState) {
                if (this.eventCallback.userSentMessage !== null) {
                    this.eventCallback?.userSentMessage();
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
            // custom branch for fastfive
            if (this.partnerId === '67615284c5ff44110dbc6613' && !this.isSmallResolution && this.browserWidth < 1200) {
                const setUpPositionRightValue = position?.web?.right || this.chatbotData.position.right;
                this.floatingContainer.style.right = Math.max(setUpPositionRightValue - 28, 0) + 'px';
            }
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
            if (this.button) this.button.style.backgroundImage = `url(${this.bootConfig?.floating?.button?.imageUrl || this.floatingAvatar?.floatingAsset})`;
        });

        this.chatHeader?.addEventListener("touchmove", (e) => {
            this.handleTouchMove(e, this.iframeContainer);
        });

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
        if (this.floatingContainer) {
            if (this.floatingContainer.parentNode) this.floatingContainer.parentNode.removeChild(this.floatingContainer);
        }
        if (this.button) {
            if (this.button.parentNode) this.button.parentNode.removeChild(this.button);
        }
        if (this.dotLottiePlayer) {
            if (this.dotLottiePlayer.parentNode) this.dotLottiePlayer.parentNode.removeChild(this.dotLottiePlayer);
        }
        if (this.expandedButtonWrapper) {
            if (this.expandedButtonWrapper.parentNode) this.expandedButtonWrapper.parentNode.removeChild(this.expandedButtonWrapper);
        }
        if (this.iframeContainer) {
            if (this.iframeContainer.parentNode) this.iframeContainer.parentNode.removeChild(this.iframeContainer);
        }
        if (this.dimmedBackground) {
            if (this.dimmedBackground.parentNode) this.dimmedBackground.parentNode.removeChild(this.dimmedBackground);
        }
        this.floatingContainer = null;
        this.button = null;
        this.dotLottiePlayer = null;
        this.expandedButtonWrapper = null;
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
            this.expandedButtonWrapper,
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
        this.dotLottiePlayer = null;
    
        this.chatUserId = null;
        // this.floatingData = null;
        this.chatbotData = null;
        this.chatUrl = null;
    
        this.isInitialized = false;
        this.floatingCount = 0;
        this.floatingClicked = false;

        window.__GentooInited = null;
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
        postChatEventLog({
            eventCategory: "SDKFloatingClicked",
            partnerId: this.partnerId,
            chatUserId: this.chatUserId,
            products: [],
        }, this.isMobileDevice);

        this.sendPostMessageHandler({enableMode: mode});

        if (this.bootConfig?.greeting?.comment && this.bootConfig.greeting.comment.length > 0) {
            this.sendPostMessageHandler({ bootConfigGreetingComment: this.bootConfig.greeting.comment});
        }

        if (this.isSmallResolution) {
            this.dimmedBackground.className = "dimmed-background";
            if (this.button) this.button.className = "floating-button-common hide";
            if (this.expandedButtonWrapper) this.expandedButtonWrapper.classList.add("hide");
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
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image-md'}`;
            } else {
                this.button.className = `floating-button-common ${this.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
            }
        }
        if (this.dotLottiePlayer) {
            this.dotLottiePlayer.classList.remove('hide');
        }
        if (this.expandedButtonWrapper) this.expandedButtonWrapper.classList.add("hide");
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
            // Wait for postChatUserId to complete before proceeding
            this.chatUserId = await postChatUserId(input?.authCode, input?.udid, input?.partnerId, '');

            const payload = {
                eventCategory: input.eventCategory,
                partnerId: String(input?.partnerId),
                chatUserId: String(this.chatUserId),
                products: input.products,
            };

            return postChatEventLog(payload, this.isMobileDevice);
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

    getPreInputSubmittedEvent(callback) {
        // Execute the callback function
        if (typeof callback === "function" && this.eventCallback) {
            this.eventCallback.preInputSubmitted = callback;
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

(function (global) {
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
                case "getPreInputSubmittedEvent":
                    if (typeof fb.getPreInputSubmittedEvent === "function") {
                        Promise.resolve(fb.getPreInputSubmittedEvent(params.callback)).catch((error) => {
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
