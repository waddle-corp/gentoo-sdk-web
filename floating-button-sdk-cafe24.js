class FloatingButton {
    constructor(props) {
        console.log('constructor called');
        this.partnerType = props.partnerType || 'gentoo';
        this.partnerId = props.partnerId;
        this.chatUserId;
        this.displayLocation;
        this.browserWidth = this.logWindowWidth();
        this.isSmallResolution = this.browserWidth < 601;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.hostSrc;
        this.domains;
        this.keys;
        this.isDestroyed = false;
        this.isInitialized = false;  // Add flag to track initialization
        this.floatingCount = 0;
        
        if (window.location.hostname === 'localhost') {
            this.hostSrc = 'http://localhost:3000';
            this.domains = {
                auth: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/user',
                log: 'https://7u6bc0lsf4.execute-api.ap-northeast-2.amazonaws.com/userEvent',
                chatbot: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/chat/chatbot',
                floating: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        } else if (window.location.hostname === 'dailyshot.co' || window.location.hostname === 'demo.gentooai.com') {
            this.hostSrc = 'https://demo.gentooai.com';
            this.domains = {
                auth: 'https://byg7k8r4gi.execute-api.ap-northeast-2.amazonaws.com/prod/auth',
                log: 'https://byg7k8r4gi.execute-api.ap-northeast-2.amazonaws.com/prod/userEvent',
                chatbot: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/chat/chatbot',
                floating: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall', 
            }
            this.keys = {
                log: 'EYOmgqkSmm55kxojN6ck7a4SKlvKltpd9X5r898k',
            }
        } else {
            this.hostSrc = 'https://dev-demo.gentooai.com';
            this.domains = {
                auth: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/user',
                log: 'https://7u6bc0lsf4.execute-api.ap-northeast-2.amazonaws.com/userEvent',
                chatbot: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/chat/chatbot',
                floating: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/chat/floating',
                partnerId: 'https://dev-api.gentooai.com/app/api/partner/v1/cafe24/mall',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        }

        // fetch cafe24 mallId
        ((CAFE24API) => {
            // CAFE24API 객체를 통해 SDK 메소드를 사용할 수 있습니다.
            this.bootPromise = Promise.all([
                this.fetchPartnerId(CAFE24API.MALL_ID).then(partnerId => {
                    this.partnerId = partnerId;
                })
            ]).catch(error => {
                console.error(`Error during fetchPartnerId: ${error}`);
                throw error;
            });

            CAFE24API.getCustomerIDInfo((err, res) => {
                if (err) {
                    console.error(`Error while calling cafe24 getCustomerIDInfo api: ${err}`)
                } else {
                    if (res.id.member_id) {
                        this.chatUserId = res.id.member_id;
                    } else {
                        this.chatUserId = res.id['guest_id'];
                    }
                }
            });
            
            })(CAFE24API.init({
                client_id : 'ckUs4MK3KhZixizocrCmTA',  // 사용할 앱의 App Key를 설정해 주세요.
                version : '2022-12-01'   // 적용할 버전을 설정해 주세요.
            }));

        // this.partnerId='672c5e9d45c48a1e578efae4';
        // this.chatUserId='1234567890';

        // Add a promise to track initialization status
        this.bootPromise = Promise.all([
            this.fetchChatbotData(this.partnerId)
                .then(res => {
                    if (!res) throw new Error('Failed to fetch chatbot data');
                    this.chatbotData = res;
                }),
        ]).catch(error => {
            console.error(`Error during initialization: ${error}`);
            throw error;
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

            if (!this.chatUserId || !this.chatbotData) {
                throw new Error('Required data not yet loaded');
            }

            this.isInitialized = true;
            
            // Fetch floating data before creating UI elements
            this.floatingData = await this.fetchFloatingData(this.partnerId);
            if (!this.floatingData) {
                throw new Error('Failed to fetch floating data');
            }
            
            this.remove(this.button, this.expandedButton, this.iframeContainer);
            
            this.chatUrl = `${this.hostSrc}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}`;

            // Create UI elements after data is ready
            this.createUIElements();

        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }

    // Separate UI creation into its own method for clarity
    createUIElements() {
        // Create iframe elements
        this.dimmedBackground = document.createElement('div');
        this.dimmedBackground.className = 'dimmed-background hide';
        this.iframeContainer = document.createElement('div');
        this.iframeContainer.className = 'iframe-container iframe-container-hide';
        
        this.chatHeader = document.createElement('div');
        this.chatHeader.className = 'chat-header';
        this.chatHandler = document.createElement('div');
        this.chatHandler.className = 'chat-handler';
        this.chatHeader.appendChild(this.chatHandler);

        this.iframe = document.createElement('iframe');
        this.iframe.src = this.chatUrl;
        this.iframe.className = 'chat-iframe';

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
            if (this.iframeContainer.classList.contains('iframe-container-hide')) {
                if (this.expandedButton) this.expandedButton.className = 'expanded-area hide';
                this.button.className = 'floating-button-common button-image-close-mr';
                this.button.style.backgroundImage = `url('public/img/units/sdk-floating-close.png')`;
                this.openChat(e, this.elems);
            } else {
                this.hideChat(this.elems.iframeContainer, this.elems.button, this.elems.expandedButton, this.elems.dimmedBackground);
                this.button.style.backgroundImage = `url(${this.floatingData.imageUrl})`;
            }
        }

        this.floatingContainer.addEventListener('click', buttonClickHandler);

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

    // updateParameter(props) {
    //     this.type = props.type;
    //     this.floatingCount += 1;
    //     this.enableExpandTimer('off');
    //     this.fetchFloatingComment(this.itemId, this.userId, props.type)
    //         .then(floatingComment => {
    //             if (floatingComment[0] !== '존재하지 않는 상품입니다.') {
    //                 this.floatingComment = floatingComment[0];
    //                 this.commentType = floatingComment[1];
    //                 this.chatUrl = `${this.hostSrc}/dlst/sdk/${this.userId}?i=${this.itemId}&t=${this.type}&ch=${this.isMobileDevice}&fc=${this.floatingComment}`;
    //                 if (!this.isDestroyed) this.init(this.itemId, this.type, this.chatUrl);
    //             } else {
    //                 // client variable required in chatUrl for the future
    //                 this.chatUrl = `${this.hostSrc}/dlst/${this.userId}?ch=${this.isMobileDevice}`;
    //                 if (!this.isDestroyed) this.init('general', 'general', this.chatUrl);
    //             }
    //         }).catch(error => {
    //             console.error(`Error while constructing FloatingButton: ${error}`);
    //         })
    // }

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
            const url = this.domains.log;

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
                    'x-api-key': this.keys.log,
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
        try {
            const url = `${this.domains.floating}/${partnerId}?displayLocation=HOME`;
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
        if (urlString.includes('/product')) {this.displayLocation = 'PRODUCT_DETAIL'}
        else if (urlString.includes('/category')) {this.displayLocation === 'PRODUCT_LIST'}
        else {this.displayLocation === 'HOME'}

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