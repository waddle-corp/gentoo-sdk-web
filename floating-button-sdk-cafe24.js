class FloatingButton {
    constructor(props) {
        this.partnerType = props.partnerType;
        this.partnerId = props.partnerId;
        this.chatbotId = props.chatbotId;
        this.chatUserId;
        this.udid = props.udid;
        this.authCode = props.authCode;
        this.itemId = props.itemId || 'general';
        this.displayLocation;
        this.type = props.type || 'default';
        this.userId = '';
        this.floatingComment = [];
        this.floatingProduct = {};
        this.floatingPos = {
            top: null,
            bottom: 200,
            left: null,
            right: 0,
        }
        this.chatUrl = '';
        this.browserWidth = this.logWindowWidth();
        this.isSmallResolution = this.browserWidth < 601;
        this.floatingCount = 0;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.hostSrc;
        this.domains;
        this.keys;
        this.commentType;
        this.isDestroyed = false;
        this.needsTimer = ( this.type !== 'default' && setTimeout(() => {
            this.updateParameter({type: 'needs'});
        }, 10000))
        
        if (window.location.hostname === 'localhost') {
            this.hostSrc = 'http://localhost:3000';
            this.domains = {
                auth: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/user',
                recommend: 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/dlst/recommend',
                log: 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/userEvent',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        } else if (window.location.hostname === 'dailyshot.co' || window.location.hostname === 'demo.gentooai.com') {
            this.hostSrc = 'https://demo.gentooai.com';
            this.domains = {
                auth: 'https://byg7k8r4gi.execute-api.ap-northeast-2.amazonaws.com/prod/auth',
                recommend: 'https://byg7k8r4gi.execute-api.ap-northeast-2.amazonaws.com/prod/dlst/recommend',
                log: 'https://byg7k8r4gi.execute-api.ap-northeast-2.amazonaws.com/prod/userEvent',
            }
            this.keys = {
                log: 'EYOmgqkSmm55kxojN6ck7a4SKlvKltpd9X5r898k',
            }
        } else {
            this.hostSrc = 'https://dev-demo.gentooai.com';
            // this.hostSrc = 'https://accio-webclient-git-feat-gent-670-waddle.vercel.app';
            this.domains = {
                auth: 'https://8krjc3tlhc.execute-api.ap-northeast-2.amazonaws.com/chat/api/v1/user',
                recommend: 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/dlst/recommend',
                log: 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/userEvent',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        }
        if (false) {
            ((CAFE24API) => {
                // CAFE24API 객체를 통해 SDK 메소드를 사용할 수 있습니다.
                console.log('mall Id', CAFE24API.MALL_ID);
                this.partnerId = CAFE24API.MALL_ID;
    
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
        }

        this.fetchFloatingComment(this.itemId, this.chatUserId, this.type)
            .then(floatingComment => {
                console.log('comment', floatingComment[0]);
                if (floatingComment[0] !== '존재하지 않는 상품입니다.') {
                    this.floatingComment = floatingComment[0];
                    this.commentType = floatingComment[1];
                } else {
                    this.floatingComment = '베테랑 점원 젠투에게 물어보고 구매하세요';
                }
                // partnerId에 지금은 mallId가 들어가있음, 실제 partnerId로 변환해서 받아오는 과정 필요.
                this.chatUrl = `${this.hostSrc}/chatroute/${this.partnerType}?ptid=${this.partnerId}&cbid=${37}&ch=${this.isMobileDevice}&i=${false}&cuid=${this.chatUserId}`;
                this.fetchPosition(this.partnerId, this.chatbotId)
                    .then(pos => {
                        this.floatingPos.bottom = pos.bottom;
                        this.floatingPos.right = pos.right;
                        if (this.partnerType === 'cafe24') {this.itemId = this.getProductNo()};
                        if (!this.isDestroyed) this.init(this.itemId, this.type, this.chatUrl);
                });
            }).catch(error => {
                console.error(`Error while constructing FloatingButton: ${error}`);
            })

        this.prevPosition = null;
        this.scrollPosition = 0;
        this.scrollDir = '';
    }    
    
    init(itemId, type, chatUrl) {
        // window.gtag('event', 'GentooPopped', {
        //     event_category: 'SDKFloatingRendered',
        //     event_label: 'SDK floating button is rendered',
        //     itemId: this.itemId,
        //     partnerType: this.partnerType,
        //     type: this.type,
        // })
        console.log('init itemId', itemId);
        this.logEvent('SDKFloatingRendered');
        this.remove(this.button, this.expandedButton, this.iframeContainer);
        this.itemId = itemId;
        this.type = type;
        this.chatUrl = chatUrl;

        // Create UI elements after data is ready
        this.createUIElements();

        // Log when finishing UI rendering
        this.logEvent('SDKFloatingRendered');
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
        this.floatingContainer.style.bottom = `${this.floatingPos.bottom}px`;
        this.floatingContainer.style.right = `${this.floatingPos.right}px`;
        this.button = document.createElement('div');
        this.button.className = `floating-button-common button-image`;
        this.button.type = 'button';

        // Editable button position, need to get variables for pos data
        document.body.appendChild(this.iframeContainer);
        document.body.appendChild(this.floatingContainer);
        this.floatingContainer.appendChild(this.button);

        // Log when finishing UI rendering
        this.logEvent('SDKFloatingRendered');

        if(this.floatingCount < 2 && this.floatingComment.length > 0) {
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
                    if (i < this.floatingComment.length) {
                        this.expandedText.innerText += this.floatingComment[i];
                        i++;
                        setTimeout(addLetter, 1000/this.floatingComment.length); // 1초마다 호출
                    }
                };

                // 첫 호출 시작
                addLetter();
                this.floatingCount += 1;
            }, 3000);
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
                this.openChat(e, this.elems);
            } else {
                this.hideChat(this.elems.iframeContainer, this.elems.button, this.elems.expandedButton, this.elems.dimmedBackground);
            }
        }

        this.button.addEventListener('click', buttonClickHandler);

        var expandedButtonClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault(); 
            if (this.iframeContainer.classList.contains('iframe-container-hide')) {
                this.expandedButton.className = 'expanded-area hide';
                this.button.className = 'floating-button-common button-image-close-mr';
                this.openChat(e, this.elems);
            } else {
                this.hideChat(this.elems.iframeContainer, this.elems.button, this.elems.expandedButton, this.elems.dimmedBackground);
            }
        }

        this.expandedButton?.addEventListener('click', expandedButtonClickHandler);

        if (!this.isDestroyed && this.floatingComment.length > 0) {
            setTimeout(() => {
                if (this.expandedButton) {
                    this.expandedButton.innerText = '';
                    this.expandedButton.style.padding = 0;
                    this.expandedButton.style.border = 'none';
                    this.expandedButton.style.boxShadow = 'none';
                }
                if (this.iframeContainer.classList.contains('iframe-container-hide')) {
                    this.button.className = 'floating-button-common button-image';
                }
            }, [700000])
            if (this.type !== 'needs' && this.floatingComment.length < 1) {
                this.enableExpandTimer('on');
            }
        }

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

    updateParameter(props) {
        this.type = props.type;
        // this.floatingCount += 1;
        this.enableExpandTimer('off');
        // this.fetchFloatingComment(this.itemId, this.userId, props.type)
        //     .then(floatingComment => {
        //         if (floatingComment[0] !== '존재하지 않는 상품입니다.') {
        //             this.floatingComment = floatingComment[0];
        //             this.commentType = floatingComment[1];
        //             this.chatUrl = `${this.hostSrc}/dlst/sdk/${this.userId}?i=${this.itemId}&t=${this.type}&ch=${this.isMobileDevice}&fc=${this.floatingComment}`;
        //             if (!this.isDestroyed) this.init(this.itemId, this.type, this.chatUrl);
        //         } else {
        //             // client variable required in chatUrl for the future
        //             this.chatUrl = `${this.hostSrc}/dlst/${this.userId}?ch=${this.isMobileDevice}`;
        //             if (!this.isDestroyed) this.init('general', 'general', this.chatUrl);
        //         }
        //     }).catch(error => {
        //         console.error(`Error while constructing FloatingButton: ${error}`);
        //     })
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
        this.userId = null;
        this.floatingComment = null;
        this.floatingProduct = null;
        this.chatUrl = null;

        console.log('FloatingButton instance destroyed');
        // Any other cleanup operations
    }

    // async handleAuth(udid, authCode) {
    //     if (udid === 'test') {
    //         return parseInt(Math.random()*1e9);
    //     }
    //     try {
    //         const response = await fetch(
    //             this.domains.auth, {
    //                 method: "POST",
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                     'x-api-key': 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
    //                     'udid': udid,
    //                     'authCode': authCode,
    //                 },
    //                 body: '',
    //             }
    //         );
    //         const result = await response.json();
    //         return result.body.randomId
    //     } catch (error) {
    //         console.error(`Error while calling auth API: ${error.message}`);
    //         return null
    //     }
    // }

    async fetchFloatingComment(itemId, userId, type) {
        console.log('type, ', type);
        try {
            // URL에 itemId를 포함시켜 GET 요청 보내기
            const url = `${this.domains.recommend}?itemId=${itemId}&userId=${userId}&commentType=${type}`;
            
            const response = await fetch(url, {
                method: "GET",
                headers: {}
            });
    
            const res = await response.json(); // JSON 형태의 응답 데이터 파싱
            return [res.message, res.case];
        } catch (error) {
            console.error(`Error while calling fetchFloatingComment API: ${error}`);
        }
    }    

    async fetchFloatingProduct(itemId, userId, target, isMobileDevice) {
        try {
            const url = this.domains.recommend;
            
            const payload = {
                itemId: itemId,
                userId: userId,
                target: target, // this or needs
                channelId: isMobileDevice ? 'mobile' : 'web',
            };

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json' // Specify content type as JSON
                },
                body: JSON.stringify(payload),
            })

            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling fetchFloatingProduct API: ${error}`);
        }
    }

    async fetchPosition(partnerId, chatbotId) {
        console.log('fetchPosition called');
        try {
            const url = `https://slch7uufzk.execute-api.ap-northeast-2.amazonaws.com/api/chatbot/v1/${partnerId}/${chatbotId}`;
            const payload = {
                partnerId: partnerId,
                chatbotId: chatbotId,
            }
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                // body: JSON.stringify(payload),
            })
            const res = await response.json();
            return res.position;
        } catch (error) {
            console.error(`Error while calling fetchPosition API: ${error}`)
        }
    }

    async logEvent(event, loc) {
        try {
            const url = this.domains.log;

            const payload = {
                event_category: event,
                visitorId: this.userId,
                itemId: this.itemId,
                partnerType: `${this.partnerType}_${loc}`,
                channelId: this.isMobileDevice ? 'mobile' : 'web',
            }

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.keys.log,
                },
                body: JSON.stringify(payload),
            });
    
            const res = await response.json(); // JSON 형태의 응답 데이터 파싱
            return [res.this, res.needs, res.case];
        } catch (error) {
            console.error(`Error while calling logEvent API: ${error}`);
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
        this.logEvent('SDKFloatingClicked');
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
        console.log('urlString: ', urlString)
        
        if (urlString.includes('/product')) {this.displayLocation = 'PRODUCT_DETAIL'}
        else if (urlString.includes('/category')) {this.displayLocation === 'PRODUCT_LIST'}
        else {this.displayLocation === 'HOME'}

        try {
            // URL 객체 생성
            const url = new URL(urlString);
    
            // 1. 쿼리 파라미터에서 product_no 추출 시도
            const productNoFromQuery = url.searchParams.get('product_no');
            console.log('productNoFromQuery', productNoFromQuery);
            if (productNoFromQuery) {
                return productNoFromQuery;
            }
    
            // 2. 경로 기반 URL에서 product_no 추출 시도
            const path = url.pathname;
            console.log('path', path);
    
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