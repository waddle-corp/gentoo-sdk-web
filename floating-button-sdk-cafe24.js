class FloatingButton {
    constructor(props) {
        this.clientId = props.clientId;
        this.udid = props.udid;
        this.authCode = props.authCode;
        this.itemId = props.itemId || '23310';
        this.type = props.type || 'default';
        this.userId = '';
        this.floatingComment = [];
        this.floatingProduct = {};
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
                auth: 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/auth',
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
                auth: 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/auth',
                recommend: 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/dlst/recommend',
                log: 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/userEvent',
            }
            this.keys = {
                log: 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
            }
        }
        
        this.handleAuth(this.udid, this.authCode)
            .then(userId => {
                this.userId = userId;
                this.fetchFloatingComment(this.itemId, this.userId, this.type)
                    .then(floatingComment => {
                        console.log('comment', floatingComment[0]);
                        if (floatingComment[0] !== '존재하지 않는 상품입니다.') {
                            this.floatingComment = floatingComment[0];
                            this.commentType = floatingComment[1];
                            this.chatUrl = `${this.hostSrc}/dlst/sdk/${this.userId}?i=${this.itemId}&t=${this.type}&ch=${this.isMobileDevice}&fc=${this.floatingComment}`;
                            if (!this.isDestroyed) this.init(this.itemId, this.type, this.chatUrl);
                        } else {
                            // client variable required in chatUrl for the future
                            this.chatUrl = `${this.hostSrc}/dlst/${this.userId}?ch=${this.isMobileDevice}`;
                            if (!this.isDestroyed) this.init('general', 'general', this.chatUrl);
                        }
                    }).catch(error => {
                        console.error(`Error while constructing FloatingButton: ${error}`);
                    })
            }).catch(error => {
                console.error(`Error while calling handleAuth func: ${error}`);
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
        //     clientId: this.clientId,
        //     type: this.type,
        // })
        this.logEvent('SDKFloatingRendered');
        this.remove(this.button, this.expandedButton, this.iframeContainer);
        this.itemId = itemId;
        this.type = type;
        this.chatUrl = chatUrl;

        // Create iframe elements
        // this.targetElem = document.getElementsByClassName('floating-button-common')[0];
        this.dimmedBackground = document.createElement('div');
        this.dimmedBackground.className = 'dimmed-background hide';
        // this.dimmedBackground.className = 'dimmed-background';
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
        // this.iframeContainer.appendChild(this.dimmedBackground);
        document.body.appendChild(this.dimmedBackground);
        // this.targetElem.appendChild(this.iframeContainer);

        // Create floating button
        this.button = document.createElement('div');
        this.button.className = `floating-button-common ${this.floatingComment.length > 0 ? 'button-image-shrink' : 'button-image'}`;
        this.button.type = 'button';
        document.body.appendChild(this.iframeContainer);
        document.body.appendChild(this.button);

        // Log when finishing UI rendering
        this.logEvent('SDKFloatingRendered');

        if(this.floatingCount < 2 && this.floatingComment.length > 0) {
            this.expandedButton = document.createElement('div');
            this.expandedButton.className = 'expanded-button';
            this.expandedText = document.createElement('p');
            this.expandedButton.appendChild(this.expandedText);
            this.expandedText.innerText = this.floatingComment || '...';
            this.expandedText.className = 'expanded-text';
            document.body.appendChild(this.expandedButton);
            this.floatingCount += 1;
        }
        

        this.elems = {
            iframeContainer: this.iframeContainer,
            chatHeader: this.chatHeader,
            dimmedBackground: this.dimmedBackground,
            button: this.button,
            expandedButton: this.expandedButton,
        }

        // Button click event
        var buttonClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault(); 
            if (this.iframeContainer.classList.contains('iframe-container-hide')) {
                if (this.expandedButton) this.expandedButton.className = 'expanded-button hide';
                this.button.className = 'floating-button-common button-image-close';
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
                this.expandedButton.className = 'expanded-button hide';
                this.button.className = 'floating-button-common button-image-close';
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
                    this.expandedButton.style.width = '50px';
                    this.expandedButton.style.padding = 0;
                    this.expandedButton.style.border = 'none';
                    this.expandedButton.style.boxShadow = 'none';
                }
                if (this.iframeContainer.classList.contains('iframe-container-hide')) {
                    this.button.className = 'floating-button-common button-image';
                }
            }, [3000])
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
        this.fetchFloatingComment(this.itemId, this.userId, props.type)
            .then(floatingComment => {
                if (floatingComment[0] !== '존재하지 않는 상품입니다.') {
                    this.floatingComment = floatingComment[0];
                    this.commentType = floatingComment[1];
                    this.chatUrl = `${this.hostSrc}/dlst/sdk/${this.userId}?i=${this.itemId}&t=${this.type}&ch=${this.isMobileDevice}&fc=${this.floatingComment}`;
                    if (!this.isDestroyed) this.init(this.itemId, this.type, this.chatUrl);
                } else {
                    // client variable required in chatUrl for the future
                    this.chatUrl = `${this.hostSrc}/dlst/${this.userId}?ch=${this.isMobileDevice}`;
                    if (!this.isDestroyed) this.init('general', 'general', this.chatUrl);
                }
            }).catch(error => {
                console.error(`Error while constructing FloatingButton: ${error}`);
            })
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

    async handleAuth(udid, authCode) {
        if (udid === 'test') {
            return parseInt(Math.random()*1e9);
        }
        try {
            const response = await fetch(
                this.domains.auth, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': 'G4J2wPnd643wRoQiK52PO9ZAtaD6YNCAhGlfm1Oc',
                        'udid': udid,
                        'authCode': authCode,
                    },
                    body: '',
                }
            );
            const result = await response.json();
            return result.body.randomId
        } catch (error) {
            console.error(`Error while calling auth API: ${error.message}`);
            return null
        }
    }

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

    async logEvent(event, loc) {
        try {
            const url = this.domains.log;

            const payload = {
                event_category: event,
                visitorId: this.userId,
                itemId: this.itemId,
                clientId: `${this.clientId}_${loc}`,
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
        //     clientId: this.clientId,
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

    // replaceAmpersand(obj) {
    //     // 객체의 각 키에 대해 순회
    //     for (let key in obj) {
    //         if (typeof obj[key] === 'string') {
    //             // 값이 문자열인 경우 &를 @@으로 치환
    //             obj[key] = obj[key].replace(/&/g, '@@');
    //         } else if (typeof obj[key] === 'object' && obj[key] !== null) {
    //             // 값이 객체나 배열인 경우 재귀적으로 함수 호출
    //             this.replaceAmpersand(obj[key]);
    //         }
    //     }
    // }
}

// Export as a global variable
window.FloatingButton = FloatingButton;