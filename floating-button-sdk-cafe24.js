class FloatingButton {
    constructor(props) {
        console.log('constructor called');
        this.partnerType = props.partnerType || 'gentoo';
        this.partnerId = props.partnerId;
        this.utm = props.utm;
        this.chatUserId = null;
        this.displayLocation;
        this.browserWidth = this.logWindowWidth();
        this.isSmallResolution = this.browserWidth < 601;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.hostSrc;
        this.domains;
        this.isDestroyed = false;
        this.isInitialized = false;  // Add flag to track initialization
        this.floatingCount = 0;
        this.floatingClicked = false;
        this.itemId = this.getProductNo();
        console.log('itemId, displayLocation @ constructor', this.itemId, this.displayLocation);
        
        if (window.location.hostname === 'localhost') {
            this.hostSrc = 'http://localhost:3000';
            this.domains = {
                auth: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/user',
                log: 'https://dev-api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://dev-api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://dev-api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        } else if (window.location.hostname === 'dev-demo.gentooai.com') {
            this.hostSrc = 'https://dev-demo.gentooai.com';
            this.domains = {
                auth: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/user',
                log: '  https://dev-api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://dev-api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://dev-api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        } else {
            this.hostSrc = 'https://demo.gentooai.com';
            this.domains = {
                auth: 'https://byg7k8r4gi.execute-api.ap-northeast-2.amazonaws.com/prod/auth',
                log: 'https://api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://api.gentooai.com/chat/api/v1/chat/floating',
                partnerId: 'https://api.gentooai.com/app/api/partner/v1/cafe24/mall', 
            }
            this.keys = {
                log: 'EYOmgqkSmm55kxojN6ck7a4SKlvKltpd9X5r898k',
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
                            this.chatUserId = res.id.member_id;
                        } else {
                            this.chatUserId = res.id['guest_id'];
                        }

                        // Fetch additional data
                        return Promise.all([
                            this.fetchChatbotData(this.partnerId),
                            this.fetchFloatingData(this.partnerId)
                        ]);
                    })
                    .then(([chatbotData, floatingData]) => {
                        console.log('Chatbot Data:', chatbotData);
                        console.log('Floating Data:', floatingData);
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
    }    
    
    async init() {
        console.log('init called');
        try {
            // Wait for boot process to complete
            await this.bootPromise;

            if (this.isInitialized) {
                console.warn('FloatingButton is already initialized');
                return;
            }

            if (!this.chatUserId || !this.chatbotData || !this.floatingData) {
                throw new Error('Required data not yet loaded');
            }

            this.isInitialized = true;
            
            this.chatUrl = `${this.hostSrc}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;

            // Create UI elements after data is ready
            this.createUIElements();

        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }

    // Separate UI creation into its own method for clarity
    createUIElements() {
        // Add null checks before accessing properties
        if (!this.chatbotData || !this.chatbotData.position) {
            console.error('Chatbot data is incomplete');
            return;
        }

        if (!this.floatingData || !this.floatingData.imageUrl) {
            console.error('Floating data is incomplete');
            return;
        }

        // Create iframe elements
        this.dimmedBackground = document.createElement('div');
        this.dimmedBackground.className = 'dimmed-background hide';
        this.iframeContainer = document.createElement('div');
        this.iframeContainer.className = 'iframe-container iframe-container-hide';
        this.chatHeader = document.createElement('div');
        
        if (this.isSmallResolution) {
            this.chatHandler = document.createElement('div');
            this.chatHeader.className = 'chat-header-md';
            this.chatHandler.className = 'chat-handler-md';
            this.chatHeader.appendChild(this.chatHandler);
        } else {
            this.chatHeader.className = 'chat-header';
            this.closeButtonContainer = document.createElement('div');
            this.closeButtonContainer.className = 'chat-close-button-container';
            this.closeButtonIcon = document.createElement('div');
            this.closeButtonIcon.className = 'chat-close-button-icon';
            this.closeButtonText = document.createElement('p');
            this.closeButtonText.className = 'chat-close-button-text';
            this.closeButtonText.innerText = '채팅창 축소';
            this.closeButtonContainer.appendChild(this.closeButtonIcon);
            this.closeButtonContainer.appendChild(this.closeButtonText);
            this.chatHeader.appendChild(this.closeButtonContainer);
        }

        this.iframe = document.createElement('iframe');
        this.iframe.src = this.chatUrl;
        this.iframe.className = this.isSmallResolution ? 'chat-iframe-md' : 'chat-iframe';

        this.iframeContainer.appendChild(this.chatHeader);
        this.iframeContainer.appendChild(this.iframe);
        document.body.appendChild(this.dimmedBackground);

        // Create floating button
        this.floatingContainer = document.createElement('div');
        this.floatingContainer.className = `floating-container`;
        this.floatingContainer.style.bottom = `${this.chatbotData.position.bottom}px`;
        this.floatingContainer.style.right = `${this.chatbotData.position.right}px`;
        this.button = document.createElement('div');
        this.button.className = `floating-button-common button-image`;
        this.button.type = 'button';
        this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
        document.body.appendChild(this.iframeContainer);
        document.body.appendChild(this.floatingContainer);
        this.floatingContainer.appendChild(this.button);

        this.logEvent({
            eventCategory: 'SDKFloatingRendered',
            partnerId: this.partnerId,
            chatUserId: this.chatUserId,
            products: [],
        });

        // window.gtag('event', 'GentooPopped', {
        //     event_category: 'SDKFloatingRendered',
        //     event_label: 'SDK floating button is rendered',
        //     itemId: this.itemId,
        //     clientId: this.partnerId,
        //     type: this.type,
        // });

        if(this.floatingCount < 2 && this.floatingData.comment.length > 0) {
            setTimeout(() => {
                if (this.floatingClicked) return;
                this.expandedButton = document.createElement('div');
                this.expandedButton.className = 'expanded-area';
                this.expandedText = document.createElement('p');
                this.expandedButton.appendChild(this.expandedText);
                this.expandedText.className = 'expanded-area-text';
                this.floatingContainer.appendChild(this.expandedButton);
                // 각 글자를 1초 간격으로 추가하기 위한 함수
                let i = 0;
                const addLetter = () => {
                    if (i < this.floatingData.comment.length) {
                        this.expandedText.innerText += this.floatingData.comment[i];
                        i++;
                        setTimeout(addLetter, 1000/this.floatingData.comment.length); // 1초마다 호출
                    }
                };

                // 첫 호출 시작
                addLetter();
                this.floatingCount += 1;
            }, 3000);

            setTimeout(() => {
                this.floatingContainer.removeChild(this.expandedButton);
            }, 8000)
        }

        this.elems = {
            iframeContainer: this.iframeContainer,
            chatHeader: this.chatHeader,
            dimmedBackground: this.dimmedBackground,
            button: this.button,
            expandedButton: this.expandedButton,
        }

        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Button click event
        var buttonClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault(); 
            this.floatingClicked = true;
            if (this.iframeContainer.classList.contains('iframe-container-hide')) {
                if (this.expandedButton) this.expandedButton.className = 'expanded-area hide';
                this.button.className = 'floating-button-common button-image-close-mr hide-visibility';
                // this.button.style.backgroundImage = `url('https://d32xcphivq9687.cloudfront.net/public/img/units/sdk-floating-close.png')`;
                this.openChat(e, this.elems);
            } else {
                this.hideChat(this.elems.iframeContainer, this.elems.button, this.elems.expandedButton, this.elems.dimmedBackground);
                this.button.className = 'floating-button-common button-image';
                this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
            }
        }

        this.floatingContainer.addEventListener('click', buttonClickHandler);
        this.closeButtonContainer.addEventListener('click', buttonClickHandler);

        // Add event listener for the resize event
        window.addEventListener('resize', () => {
            this.browserWidth = this.logWindowWidth();
            this.isSmallResolution = this.browserWidth < 601;
        });
    }

    openChat(e, elems) {
        e.stopPropagation();
        e.preventDefault();
        const iframeContainer = elems.iframeContainer;
        const chatHeader = elems.chatHeader;
        const dimmedBackground = elems.dimmedBackground;
        const button = elems.button;
        const expandedButton = elems.expandedButton;

        // Chat being visible
        this.enableChat(iframeContainer, button, expandedButton, dimmedBackground, 'shrink');

        dimmedBackground.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            dimmedBackground.className = 'dimmed-background hide';
            this.hideChat(iframeContainer, button, expandedButton, dimmedBackground);
            this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
        })

        window.addEventListener('message', (e) => {
            if (e.data.redirectState) {
                window.location.href=e.data.redirectUrl;
            }
            if (this.isSmallResolution) {
                this.enableChat(iframeContainer, button, expandedButton, dimmedBackground, 'full');
            }
        })

        chatHeader.addEventListener('touchmove', (e) => {this.handleTouchMove(e, iframeContainer)});
        chatHeader.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e, iframeContainer, button, expandedButton, dimmedBackground)
        });
    }

    remove() {
        if (this.button) {document.body.removeChild(this.button)};
        if (this.expandedButton) {document.body.removeChild(this.expandedButton)};
        if (this.iframeContainer) {document.body.removeChild(this.iframeContainer)};
        this.button = null;
        this.expandedButton = null;
        this.iframeContainer = null;
    }

    destroy() {
        if (!this.isInitialized) {
            console.error('FloatingButton must be initialized before calling destroy');
            return;
        }
        console.log('Destroying FloatingButton instance');
        this.isDestroyed = true;
        window.removeEventListener('resize', this.handleResize);
        if (this.button) {
            this.button.removeEventListener('click', this.buttonClickHandler);
        }
    
        if (this.expandedButton) {
            this.expandedButton.removeEventListener('click', this.expandedButtonClickHandler);
        }
        // Remove created DOM elements if they exist
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }

        // Reset properties
        this.button = null;
        this.expandedButton = null;
        this.iframeContainer = null;
        this.floatingContainer = null;
        this.chatUserId = null;
        this.chatbotData = null;
        this.floatingData = null;
        this.chatUrl = null;

        console.log('FloatingButton instance destroyed');
        // Any other cleanup operations
        this.isInitialized = false;
    }

    async logEvent(payload) {
        try {
            const url = this.domains.log + `/${this.partnerId}`;

            const params = {
                eventCategory: String(payload.eventCategory),
                chatUserId: String(payload.chatUserId),
                partnerId: String(payload.partnerId),
                channelId: this.isMobileDevice ? 'mobile' : 'web',
                products: payload?.products,
            }

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });
    
            const res = await response.json(); // JSON 형태의 응답 데이터 파싱
            return res;
        } catch (error) {
            console.error(`Error while calling logEvent API: ${error}`);
        }
    } 

    async fetchChatUserId (userToken, udid = '') {
        try {
            const url = `${this.domains.auth}?userToken=${userToken}&udid=${udid}`;
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
            const url = `${this.domains.chatbot}/${partnerId}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {}
            });
            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling fetchChatbotId API: ${error}`)
        }
    }

    async fetchFloatingData (partnerId) {
        console.log('fetchFloatingData called', partnerId, this.displayLocation);
        try {
            const url = `${this.domains.floating}/${partnerId}?displayLocation=${this.displayLocation}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {}
            });

            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling fetchFloatingData API: ${error}`)
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
        if (this.scrollDir === 'up') {
            this.enableChat(iframeContainer, button, expandedButton, dimmedBackground, 'full');
        } else if (this.scrollDir === 'down') {
            this.hideChat(iframeContainer, button, expandedButton, dimmedBackground);
        }
        
        this.prevPosition = null;
        this.scrollPosition = 0;
        this.scrollDir = '';
    }

    enableExpandTimer(mode) {
        if (this.type === 'default') return;
        else {
            if (this.needsTimer) {
                clearTimeout(this.needsTimer);  // 기존 타이머를 먼저 클리어
            }
            if (mode === 'on') {
                this.needsTimer = setTimeout(() => {
                    this.updateParameter({type: 'needs'});
                }, 10000);
            }
            else if (mode === 'off') {
                clearTimeout(this.needsTimer);  // 타이머 클리어
            }
        }
    }

    enableChat(iframeContainer, button, expandedButton, dimmedBackground, mode) {
        // window.gtag('event', 'iconClicked', {
        //     event_category: 'SDKFloatingClicked',
        //     event_label: 'User clicked SDK floating button',
        //     itemId: this.itemId,
        //     partnerType: this.partnerType,
        //     type: this.type,
        //     commentType: (this.type === 'this' ? this.commentType : ''),
        // })
        this.logEvent({
            eventCategory: 'SDKFloatingClicked',
            partnerId: this.partnerId,
            chatUserId: this.chatUserId,
            products: [],
        });
        this.enableExpandTimer('off');
        
        var isChatOpenState = {
            isChatOpen: true,
        }
        this.iframe.contentWindow.postMessage(isChatOpenState, '*');

        if (this.isSmallResolution) {
            dimmedBackground.className = 'dimmed-background';
            button.className = 'floating-button-common hide';
            if (expandedButton) expandedButton.className = 'expanded-button hide';
        }
        if (mode === 'shrink') {
            iframeContainer.className = 'iframe-container-shrink';
        } else if (mode === 'full') {
            iframeContainer.className = 'iframe-container';
            iframeContainer.style.height = '100%';
        } else {
            return;
        }
    }

    hideChat(iframeContainer, button, expandedButton, dimmedBackground) {
        if (!this.isDestroyed && this.floatingCount < 2) {
            // mockup is not the case cause scroll event is applied
            this.enableExpandTimer('on');
        }
        button.className = 'floating-button-common button-image';
        if (expandedButton) expandedButton.className = 'expanded-button hide';
        iframeContainer.className = 'iframe-container iframe-container-hide';
        dimmedBackground.className = 'dimmed-background hide';
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