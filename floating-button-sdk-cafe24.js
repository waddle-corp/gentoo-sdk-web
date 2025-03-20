class FloatingButton {
    constructor(props) {
        if (window.__GentooInited !== null && window.__GentooInited !== undefined) {
            console.warn("GentooIO constructor called twice, skipping second call.");
            return;
        }
        this.partnerType = props.partnerType || 'gentoo';
        this.partnerId = props.partnerId;
        this.utm = props.utm;
        this.chatUserId = null;
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
        // this.floatingData;
        this.itemId = this.getProductNo();
        console.log('itemId, displayLocation @ constructor', this.itemId, this.displayLocation);
        
        if (window.location.hostname === 'localhost') {
            this.hostSrc = 'http://localhost:3000';
            this.domains = {
                auth: 'https://dev-api.gentooai.com/chat/api/v1/user',
                log: 'https://dev-api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://dev-api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://dev-api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        } else if (window.location.hostname === 'dev-demo.gentooai.com' || window.location.hostname === 'kickthefence.com') {
            this.hostSrc = 'https://dev-demo.gentooai.com';
            this.domains = {
                auth: 'https://dev-api.gentooai.com/chat/api/v1/user',
                log: '  https://dev-api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://dev-api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://dev-api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
            }
        } else if (window.location.hostname === "stage-demo.gentooai.com") {
            this.hostSrc = "https://stage-demo.gentooai.com";
            this.domains = {
                auth: "https://stage-api.gentooai.com/chat/api/v1/user",
                log: "https://stage-api.gentooai.com/chat/api/v1/event/userEvent",
                chatbot: "https://stage-api.gentooai.com/chat/api/v1/chat/chatbot",
                floating: "https://stage-api.gentooai.com/chat/api/v1/chat/floating",
                partnerId: "https://stage-api.gentooai.com/app/api/partner/v1/cafe24/mall",
            };
        } else {
            this.hostSrc = 'https://demo.gentooai.com';
            this.domains = {
                auth: 'https://api.gentooai.com/chat/api/v1/user',
                log: 'https://api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://api.gentooai.com/app/api/partner/v1/cafe24/mall', 
            }
        }

        // Modify the CAFE24API initialization to ensure promises are handled correctly
        this.bootPromise = new Promise((resolve, reject) => {
            ((CAFE24API) => {
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
                        console.log('Fetched partnerId:', partnerId);
                        this.partnerId = partnerId;

                        // Then get customer ID
                        return getCustomerIDInfoPromise();
                    })
                    .then(res => {
                        console.log('Customer ID Info:', res);
                        if (res.id.member_id) {
                            this.cafe24UserId = res.id.member_id;
                        } else {
                            this.cafe24UserId = res.id['guest_id'];
                        }

                        // Fetch additional data
                        return Promise.all([
                            this.fetchChatUserId(this.cafe24UserId),
                            this.fetchChatbotData(this.partnerId),
                            this.fetchFloatingData(this.partnerId)
                        ]);
                    })
                    .then(([chatUserId, chatbotData, floatingData]) => {
                        console.log('chatUserId', chatUserId);
                        console.log('Chatbot Data:', chatbotData);
                        console.log('Floating Data:', floatingData);
                        this.chatUserId = chatUserId;
                        this.chatbotData = chatbotData;
                        this.floatingData = floatingData;
                        resolve();
                    })
                    .catch(error => {
                        console.error('Initialization error:', error);
                        reject(error);
                    });
            })(CAFE24API.init({
                client_id : 'ckUs4MK3KhZixizocrCmTA',
                version : '2022-12-01'
            }));
        });
    //     this.floatingData = {
    //         imageUrl: "https://d3qrvyizob9ouf.cloudfront.net/public/img/units/gentoo-anime-web-default.gif",
    //         comment: "오늘의 쇼핑은 저와 함께하실래요?",
    //     };

    //     this.chatbotData = {
    //         "chatbotId": 0,
    //         "name": "젠투",
    //         "profileImg": "https://df4n10wq26cwv.cloudfront.net/gentoo.png",
    //         "greetingMessage": "어서오세요 😊 어떤 상품을 찾아드릴까요?\n젠투가 추천해드릴게요.",
    //         "colorCode": [
    //             {
    //                 "hex": "#154cca",
    //                 "rgb": {
    //                     "r": 21,
    //                     "g": 76,
    //                     "b": 202,
    //                     "a": 1
    //                 },
    //                 "red": 21,
    //                 "green": 76,
    //                 "blue": 202,
    //                 "alpha": 1
    //             },
    //             {
    //                 "hex": "#bbc8e5",
    //                 "rgb": {
    //                     "r": 187,
    //                     "g": 200,
    //                     "b": 229,
    //                     "a": 1
    //                 },
    //                 "red": 187,
    //                 "green": 200,
    //                 "blue": 229,
    //                 "alpha": 1
    //             },
    //             {
    //                 "hex": "#e0e6f3",
    //                 "rgb": {
    //                     "r": 224,
    //                     "g": 230,
    //                     "b": 243,
    //                     "a": 1
    //                 },
    //                 "red": 224,
    //                 "green": 230,
    //                 "blue": 243,
    //                 "alpha": 1
    //             }
    //         ],
    //         "recommendSize": "multi",
    //         "carouselType": "single",
    //         "exceptKeyword": [],
    //         "examples": [
    //             "회랑 어울리는 화이트 와인 찾아줘",
    //             "오크 풍미가 있는 버번 중에 7만 원대로 찾아줘",
    //             "부드러운 싱글몰트 위스키 몇 가지 추천해줘"
    //         ],
    //         "chatAgent": "anchovy",
    //         "position": {
    //             "top": null,
    //             "bottom": 32,
    //             "left": null,
    //             "right": 0
    //         },
    //         "mobilePosition": {
    //             "top": null,
    //             "bottom": 32,
    //             "left": null,
    //             "right": 0
    //         },
    //         "preQuestion": {
    //             "count": 0,
    //             "questions": []
    //         },
    //         "isDummy": true,
    //         "planType": "PRO",
    //         "planExpirationTime": "2100-01-01T08:59:59",
    //         "partnerType": "dummy"
    //     }

    //     this.chatUserId = 'selentest';
    //     this.partnerId = '6737041bcf517dbd2b8b6458';
    }    

    
    async init(params) {
        if (window.__GentooInited !== null && window.__GentooInited !== undefined) {
            console.warn("GentooIO init called twice, skipping second call.");
            return;
        }
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
            
            this.chatUrl = `${this.hostSrc}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;

            // Create UI elements after data is ready
            if (!this.isDestroyed) this.createUIElements(position, showGentooButton, isCustomButton);
            else this.destroy();

        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }

    // Separate UI creation into its own method for clarity
    createUIElements(position, showGentooButton, isCustomButton) {
        window.__GentooInited = 'creating';
        this.customButton = isCustomButton ? (document.getElementsByClassName("gentoo-custom-button")[0] || document.querySelectorAll('[data-gentooCustomButton="gentooCustomButton"]')[0]) : null;
        // Add null checks before accessing properties
        if (
            !this.chatbotData || 
            !this.chatbotData.position || 
            !this.chatbotData.mobilePosition 
        ) {
            console.error('Chatbot data is incomplete');
            return;
        }

        if (!this.floatingData || !this.floatingData.imageUrl) {
            console.error('Floating data is incomplete');
            return;
        }

        // Create iframe elements
        this.dimmedBackground = document.createElement("div");
        this.dimmedBackground.className = "dimmed-background hide";
        this.iframeContainer = document.createElement("div");
        this.iframeContainer.className = "iframe-container iframe-container-hide";
        this.chatHeader = document.createElement("div");
        this.chatHandler = document.createElement("div");
        this.chatHeaderText = document.createElement("p");
        this.closeButtonContainer = document.createElement("div");
        this.closeButtonIcon = document.createElement("div");
        this.closeButtonText = document.createElement("p");
        this.chatHeaderText.innerText = "Powered by Gentoo";
        this.iframe = document.createElement("iframe");
        this.iframe.src = this.chatUrl;
        
        if (this.isSmallResolution) {
            this.chatHeader.className = "chat-header-md";
            this.chatHandler.className = "chat-handler-md";
            this.chatHeaderText.className = "chat-header-text-md";
            this.closeButtonIcon.className = "chat-close-button-icon-md";
            this.iframe.className = "chat-iframe-md";
            this.chatHeader.appendChild(this.chatHandler);
            this.chatHeader.appendChild(this.chatHeaderText);
            this.chatHeader.appendChild(this.closeButtonIcon);
        } else {
            this.chatHeader.className = "chat-header";
            this.chatHeaderText.className = "chat-header-text";
            this.closeButtonContainer.className = "chat-close-button-container";
            this.closeButtonIcon.className = "chat-close-button-icon";
            this.closeButtonText.className = "chat-close-button-text";
            this.closeButtonText.innerText = "채팅창 축소";
            this.iframe.className = "chat-iframe";
            this.closeButtonContainer.appendChild(this.closeButtonIcon);
            this.closeButtonContainer.appendChild(this.closeButtonText);
            this.chatHeader.appendChild(this.chatHeaderText);
            this.chatHeader.appendChild(this.closeButtonContainer);
        }

        this.iframeContainer.appendChild(this.chatHeader);
        this.iframeContainer.appendChild(this.iframe);
        document.body.appendChild(this.dimmedBackground);
        document.body.appendChild(this.iframeContainer);

        // Create floating button
        if (showGentooButton) {
            this.floatingContainer = document.createElement("div");
            this.floatingContainer.className = `floating-container`;
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
            this.floatingContainer.appendChild(this.button);

            this.logEvent({
                eventCategory: "SDKFloatingRendered",
                partnerId: this.partnerId,
                chatUserId: this.chatUserId,
                products: [],
            });

            if (this.floatingCount < 2 && this.floatingData.comment.length > 0) {
                setTimeout(() => {
                    // Check if component is destroyed or clicked
                    if (this.floatingClicked || this.isDestroyed || !this.floatingContainer)
                        return;

                    this.expandedButton = document.createElement("div");
                    this.expandedText = document.createElement("p");
                    if (this.isSmallResolution) {
                        this.expandedButton.className = "expanded-area-md";
                        this.expandedText.className = "expanded-area-text-md";
                    } else {
                        this.expandedButton.className = "expanded-area";
                        this.expandedText.className = "expanded-area-text";
                    }
                    this.expandedButton.appendChild(this.expandedText);

                    // Double check if floatingContainer still exists before appending
                    if (this.floatingContainer && this.floatingContainer.parentNode) {
                        this.floatingContainer.appendChild(this.expandedButton);

                        // Add text animation
                        let i = 0;
                        const addLetter = () => {
                            if (!this.floatingData) return;
                            if (i < this.floatingData.comment.length && !this.isDestroyed) {
                                this.expandedText.innerText += this.floatingData.comment[i];
                                i++;
                                setTimeout(addLetter, 1000 / this.floatingData.comment.length);
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
                        }, 8000);
                    }
                }, 3000);
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
        }

        // Add event listeners
        this.setupEventListeners(position, isCustomButton);
        window.__GentooInited = 'created';
    }

    setupEventListeners(position, isCustomButton = false) {
        // Button click event
        var buttonClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.floatingClicked = true;
            if (this.iframeContainer.classList.contains("iframe-container-hide")) {
                if (this.expandedButton)
                    this.expandedButton.className = "expanded-area hide";
                if (this.button) {
                    this.button.className =
                        "floating-button-common button-image-close-mr hide";
                }
                this.openChat(e, this.elems);
                if (this.eventCallback.click !== null) {
                    this.eventCallback.click();
                }
            } else {
                this.hideChat(
                    this.elems.iframeContainer,
                    this.elems.button,
                    this.elems.expandedButton,
                    this.elems.dimmedBackground
                );
                if (this.button) {
                    this.button.className = "floating-button-common button-image";
                    this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
                }
            }
        };

        window?.addEventListener("message", (e) => {
            if (e.data.redirectState) {
                window.location.href = e.data.redirectUrl;
            }
            if (e.data.formSubmittedState) {
                const params = { p1: e.data.firstAnswer, p2: e.data.secondAnswer };
                if (this.eventCallback.formSubmitted !== null) {
                    this.eventCallback?.formSubmitted(params);
                }
            }
            if (this.isSmallResolution && e.data.inputFocusState) {
                this.enableChat(
                    this.elems.iframeContainer,
                    this.elems.button,
                    this.elems.expandedButton,
                    this.elems.dimmedBackground,
                    "full"
                );
            }
        });

        this.floatingContainer?.addEventListener("click", buttonClickHandler);
        this.closeButtonContainer?.addEventListener("click", buttonClickHandler);
        this.closeButtonIcon?.addEventListener("click", buttonClickHandler);
        this.customButton?.addEventListener("click", buttonClickHandler);

        // Add event listener for the resize event
        window?.addEventListener("resize", () => {
            this.browserWidth = this.logWindowWidth();
            this.isSmallResolution = this.browserWidth < 601;
            this.updateFloatingContainerPosition(position); // Update position on resize
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

    openChat(e, elems) {
        e.stopPropagation();
        e.preventDefault();
        const iframeContainer = elems.iframeContainer;
        const iframe = elems.iframe;
        const chatHeader = elems.chatHeader;
        const dimmedBackground = elems.dimmedBackground;
        const button = elems.button;
        const expandedButton = elems.expandedButton;

        // Chat being visible
        this.enableChat(
            iframeContainer, 
            button, 
            expandedButton, 
            dimmedBackground, 
            'shrink'
        );

        dimmedBackground?.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            dimmedBackground.className = 'dimmed-background hide';
            this.hideChat(iframeContainer, button, expandedButton, dimmedBackground);
            if (button) button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
        })

        chatHeader?.addEventListener("touchmove", (e) => {
            this.handleTouchMove(e, iframeContainer);
        });

        chatHeader?.addEventListener("touchend", (e) => {
            this.handleTouchEnd(
                e,
                iframeContainer,
                button,
                expandedButton,
                dimmedBackground
            );
        });

        chatHeader?.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.handleMouseDown(e, iframe);
            const onMouseMove = (e) => {
                e.preventDefault();
                this.handleMouseMove(e, iframeContainer);
            };
            const onMouseUp = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleMouseUp(
                    e,
                    iframeContainer,
                    iframe,
                    button,
                    expandedButton,
                    dimmedBackground,
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
        this.chatUserId = null;
        this.floatingData = null;
        this.chatbotData = null;
        this.chatUrl = null;

        // Reset state flags
        this.isInitialized = false;
        this.floatingCount = 0;
        this.floatingClicked = false;

        window.__GentooInited = null;
        console.log("FloatingButton instance destroyed", window.__GentooInited, window.location.pathname);
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

    async fetchChatUserId (userToken, udid = "") {
        try {
            const url = `${this.domains.auth}?userToken=${userToken}&udid=${udid}&chatUserId=${this.chatUserId}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {}
            });

            const res = await response.json();
            return res.chatUserId;
        } catch (error) {
            console.error(`Error while calling fetchChatUserId API: ${error}`)
        }
    }

    async fetchChatbotData(partnerId) {
        try {
            const response = await fetch(`${this.domains.chatbot}/${partnerId}`, {
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
                `${this.domains.floating}/${partnerId}?displayLocation=${this.displayLocation}`,
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

    async fetchPartnerId(mallId) {
        try {
            const url = `${this.domains.partnerId}/${mallId}`;
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

    handleTouchEnd(e, iframeContainer, button, expandedButton, dimmedBackground) {
        e.preventDefault();
        if (this.scrollDir === "up") {
            this.enableChat(
                iframeContainer,
                button,
                expandedButton,
                dimmedBackground,
                "full"
            );
        } else if (this.scrollDir === "down") {
            this.hideChat(iframeContainer, button, expandedButton, dimmedBackground);
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

    handleMouseUp(e, iframeContainer, iframe, button, expandedButton, dimmedBackground) {
        e.preventDefault();
        iframe.classList.remove("event-disabled");
        if (this.scrollDir === "up") {
            iframeContainer.style.height = "100%";
            this.enableChat(
                iframeContainer,
                button,
                expandedButton,
                dimmedBackground,
                "shrink"
            );
        } else if (this.scrollDir === "down") {
            iframeContainer.style.height = "90%";
            this.hideChat(iframeContainer, button, expandedButton, dimmedBackground);
        }

        this.prevPosition = null;
        this.scrollPosition = 0;
        this.scrollDir = "";
    }

    enableChat(iframeContainer, button, expandedButton, dimmedBackground, mode) {
        this.logEvent({
            eventCategory: 'SDKFloatingClicked',
            partnerId: this.partnerId,
            chatUserId: this.chatUserId,
            products: [],
        });

        if (this.isSmallResolution) {
            dimmedBackground.className = "dimmed-background";
            if (button) button.className = "floating-button-common hide";
            if (expandedButton) expandedButton.className = "expanded-button hide";
        }
        if (mode === "shrink") {
            iframeContainer.className = "iframe-container-shrink";
        } else if (mode === "full") {
            iframeContainer.className = "iframe-container";
            iframeContainer.style.height = "100%";
        } else {
            return;
        }
    }

    hideChat(iframeContainer, button, expandedButton, dimmedBackground) {
        if (button) {
            if (this.isSmallResolution) {
                button.className = "floating-button-common button-image-md";
            } else {
                button.className = "floating-button-common button-image";
            }
        }
        if (expandedButton) expandedButton.className = "expanded-button hide";
        iframeContainer.className = "iframe-container iframe-container-hide";
        dimmedBackground.className = "dimmed-background hide";
    }

    // Function to log the current window width
    logWindowWidth() {
        const width = window.innerWidth;
        return width;
    }

    /**
     * 현재 URL 또는 주어진 URL에서 product_no 값을 추출하는 함수
     * 
     * @param {string} [urlString=window.location.href] - 분석할 URL 문자열
     * @returns {string|null} - 추출된 product_no 값 또는 null (찾을 수 없을 경우)
     */
    getProductNo(urlString = window.location.href) {
        console.log('getProductNo called', urlString);
        if (urlString.includes('/product')) {this.displayLocation = 'PRODUCT_DETAIL'}
        else if (urlString.includes('/category')) {this.displayLocation = 'PRODUCT_LIST'}
        else {this.displayLocation = 'HOME'}
        console.log('displayLocation @ getProductNo', this.displayLocation);

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
             * 정규 표현식 설명:
             * ^\/product\/            - '/product/'로 시작
             * [^\/]+\/                - 상품명 (슬래시가 아닌 문자들) 다음에 슬래시
             * ([^\/]+)\/              - product_no 캡처 그룹 (슬래시가 아닌 문자들) 다음에 슬래시
             * category\/[^\/]+\/      - '/category/' 다음에 category_no 그리고 슬래시
             * display\/[^\/]+\/?$     - '/display/' 다음에 display_group_no 그리고 슬래시 또는 끝
             */
            const regex = /^\/product\/[^\/]+\/([^\/]+)\/category\/[^\/]+\/display\/[^\/]+\/?$/;
    
            const match = path.match(regex);
            if (match && match[1]) {
                return match[1];
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
    // injectCSS("https://d3qrvyizob9ouf.cloudfront.net/floating-button-sdk-cafe24.css");
    injectCSS("https://d32xcphivq9687.cloudfront.net/floating-button-sdk-cafe24.css");
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