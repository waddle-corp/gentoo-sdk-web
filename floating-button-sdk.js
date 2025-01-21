class FloatingButton {
    constructor(props) {
        // Validate required props
        if (!props.partnerId || !props.authCode) {
            throw new Error('Missing required parameters: partnerId, authCode are required');
        }
        this.partnerType = props.partnerType || 'gentoo';
        this.partnerId = props.partnerId;
        this.authCode = props.authCode;
        this.displayLocation = props.displayLocation || 'HOME';
        this.udid = props.udid || '';
        this.utm = props.utm;
        this.chatUserId;
        this.chatbotData;
        this.browserWidth = this.logWindowWidth();
        this.isSmallResolution = this.browserWidth < 601;
        this.isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.hostSrc;
        this.domains;
        this.isDestroyed = false;
        this.isInitialized = false;  // Add flag to track initialization
        this.floatingCount = 0;
        this.floatingClicked = false;
        this.floatingData;
        this.pageList = [];
        
        if (window.location.hostname === 'dailyshot.co' || window.location.hostname === 'dev-demo.gentooai.com') {
            this.hostSrc = 'https://dev-demo.gentooai.com';
            this.domains = {
                auth: 'https://dev-api.gentooai.com/chat/api/v1/user',
                log: '  https://dev-api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://dev-api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://dev-api.gentooai.com/chat/api/v1/chat/floating',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        } else {
            this.hostSrc = 'https://demo.gentooai.com';
            this.domains = {
                auth: 'https://api.gentooai.com/chat/api/v1/user',
                log: 'https://api.gentooai.com/chat/api/v1/event/userEvent',
                chatbot: 'https://api.gentooai.com/chat/api/v1/chat/chatbot',
                floating: 'https://api.gentooai.com/chat/api/v1/chat/floating',
            }
            this.keys = {
                log: 'EYOmgqkSmm55kxojN6ck7a4SKlvKltpd9X5r898k',
            }
        }
        
        // Add a promise to track initialization status
        this.bootPromise = Promise.all([
            this.fetchChatUserId(this.authCode, this.udid)
                .then(res => {
                    if (!res) throw new Error('Failed to fetch chat user ID');
                    this.chatUserId = res;
                }),
            this.fetchChatbotData(this.partnerId)
                .then(res => {
                    if (!res) throw new Error('Failed to fetch chatbot data');
                    this.chatbotData = res;
                })
        ]).catch(error => {
            console.error(`Error during initialization: ${error}`);
            throw error;
        });
    }    
    
    async init() {
        console.log('init called', this.pageList);
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
            
            this.chatUrl = `${this.hostSrc}/chatroute/${this.partnerType}?ptid=${this.partnerId}&ch=${this.isMobileDevice}&cuid=${this.chatUserId}&utms=${this.utm.utms}&utmm=${this.utm.utmm}&utmca=${this.utm.utmcp}&utmco=${this.utm.utmct}&utmt=${this.utm.utmt}&tp=${this.utm.tp}`;

            // Create UI elements after data is ready
            if (
                !this.isDestroyed || 
                this.pageList.length === 0
            ) {
                console.log('createUIElements called1', this.pageList, window.location.pathname);
                this.createUIElements();
            } else if (this.pageList.includes(window.location.pathname)) {
                console.log('createUIElements called2', this.pageList, window.location.pathname);
                this.createUIElements();
            } else {
                console.log('destroy called', this.pageList, window.location.pathname);
                this.destroy();
            }

        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }

    // Separate UI creation into its own method for clarity
    createUIElements() {
        // Add null checks before accessing properties
        if (!this.chatbotData || !this.chatbotData.position || !this.chatbotData.mobilePosition ) {
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
        this.floatingContainer.style.bottom = `${this.isSmallResolution ? this.chatbotData.mobilePosition.bottom : this.chatbotData.position.bottom}px`;
        this.floatingContainer.style.right = `${this.isSmallResolution ? this.chatbotData.mobilePosition.right : this.chatbotData.position.right}px`;
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
            }, 3000)

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
                // this.button.style.backgroundImage = `url(''https://d32xcphivq9687.cloudfront.net/public/img/units/sdk-floating-close.png')`;
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
        this.isDestroyed = true;

        console.log('Destroying FloatingButton instance');
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
        this.floatingData = null;
        this.chatbotData = null;
        this.chatUrl = null;

        console.log('FloatingButton instance destroyed');
        // Any other cleanup operations
        this.isInitialized = false;
    }

    setPageList(pageList) {
        console.log('setPageList called', pageList);
        this.pageList = pageList;
    }

    async logEvent(payload) {
        try {
            const params = {
                eventCategory: String(payload.eventCategory),
                chatUserId: String(payload.chatUserId),
                partnerId: String(payload.partnerId),
                channelId: this.isMobileDevice ? 'mobile' : 'web',
                products: payload?.products,
            }

            const response = await fetch(`${this.domains.log}/${this.partnerId}`, {
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
            const response = await fetch(`${this.domains.chatbot}/${partnerId}`, {
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
            const response = await fetch(`${this.domains.floating}/${partnerId}?displayLocation=${this.displayLocation}`, {
                method: "GET",
                headers: {}
            });

            const res = await response.json();
            return res;
        } catch (error) {
            console.error(`Error while calling fetchFloatingData API: ${error}`)
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

    async sendLog(input) {
        try {
            await this.bootPromise;
            // Wait for fetchChatUserId to complete before proceeding
            this.chatUserId = await this.fetchChatUserId(input.chatUserId);
            
            const payload = {
                eventCategory: input.eventCategory,
                partnerId: String(input.partnerId),
                chatUserId: String(this.chatUserId),
                products: input.products,
            }

            return this.logEvent(payload);
        } catch (error) {
            console.error('Failed to send log:', error);
            throw error;
        }
    }
}

// Export as a global variable
window.FloatingButton = FloatingButton;

(function (global, document) { 
    var w = global;
    var fb;

    // Function to inject CSS
    function injectCSS(href) {
        // Check if the CSS is already injected
        var existingLink = document.querySelector('link[href="' + href + '"]');
        if (existingLink) {
        return;
        }

        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.type = "text/css";
        link.onload = function() {
        console.log("GentooIO CSS loaded successfully.");
        };
        link.onerror = function() {
        console.error("Failed to load GentooIO CSS.");
        };
        document.head.appendChild(link);
    }

    // Inject the CSS automatically
    injectCSS("https://d3qrvyizob9ouf.cloudfront.net/floating-button-sdk.css");

    GentooIO.process = function (args) { 
        console.log('GentooIO.process called', args);
        var method = args[0]; 
        var params = args[1]; 
        const parsedUrl = new URL(window.location.href);
        const pathSegments = parsedUrl.pathname.split('/');
        const transitionPage = '/' + pathSegments[1];
        const searchParams = new URLSearchParams(window.location.search);
        const utm = { utms: searchParams.get('utm_source'), utmm: searchParams.get('utm_medium'), utmcp: searchParams.get('utm_campaign'), utmct: searchParams.get('utm_content'), utmt: searchParams.get('utm_term'), tp: transitionPage };
        params.utm = utm;

        // Allow boot method anytime
        if (method === 'boot') { 
            try {
                console.log('params', params);
                fb = new FloatingButton(params); 
            } catch (error) {
                console.error('Failed to create FloatingButton instance:', error);
            }
            return;
        }
        
        // For all other methods, ensure FloatingButton instance exists
        if (!fb) {
            console.error('GentooIO: Must call boot() before using this method');
            return;
        }

        // Process other methods
        switch (method) {
            case 'init':
                if (typeof fb.init === 'function') {
                    Promise.resolve(fb.init()).catch(error => {
                        console.error('Failed to initialize GentooIO:', error);
                    });
                }
                break;
            case 'update':
                if (typeof fb.updateParameter === 'function') {
                    Promise.resolve(fb.updateParameter(params)).catch(error => {
                        console.error('Failed to update GentooIO parameters:', error);
                    });
                }
                break;
            case 'unmount':
                if (typeof fb.destroy === 'function') {
                    Promise.resolve(fb.destroy()).catch(error => {
                        console.error('Failed to unmount GentooIO:', error);
                    });
                }
                break;
            case 'sendLog':
                if (typeof fb.sendLog === 'function') {
                    Promise.resolve(fb.sendLog(params)).catch(error => {
                        console.error('Failed to send GentooIO log:', error);
                    });
                }
                break;
            case 'setPageList':
                if (typeof fb.setPageList === 'function') {
                    Promise.resolve(fb.setPageList(params)).catch(error => {
                        console.error('Failed to set GentooIO page list:', error);
                    });
                }
                break;
            default:
                console.error('GentooIO: Unknown method', method);
        }
    }; 

    while (GentooIO.q.length) { 
        console.log('GentooIO.q.length', GentooIO.q.length, 'GentooIO.q', GentooIO.q);
        var args = GentooIO.q.shift();
        GentooIO.process(args); 
    };  
    w.addEventListener("message", ()=>{})
})(window, document);