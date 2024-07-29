class FloatingButton {
    constructor(clientId, udid = undefined, authCode = undefined, itemId = '3873', type = 'this') {
        this.clientId = clientId;
        this.udid = udid;
        this.authCode = authCode;
        this.itemId = itemId;
        this.type = type;
        this.userId = '';
        this.floatingComment = [];
        this.floatingProduct = {};
        this.chatUrl = '';
        this.browserWidth = this.logWindowWidth();
        this.isSmallResolution = this.browserWidth < 601;
        this.typeArr = ['this'];

        Promise.all([
            this.handleAuth(this.udid, this.authCode),
            this.fetchFloatingComment(this.itemId),
        ]).then(([userId, floatingComment]) => {
            this.userId = userId;
            if (floatingComment[0]) {
                this.floatingComment = floatingComment;
                this.fetchFloatingProduct(this.itemId, userId, type)
                    .then(floatingProduct => {
                        this.floatingProduct = floatingProduct
                        this.chatUrl = `https://accio-webclient-git-test-sdk-waddle.vercel.app/${this.clientId}/sdk/${this.userId}?product=${JSON.stringify(this.floatingProduct)}`;
                        this.init(this.itemId, this.type, this.chatUrl);
                    });
            }
        }).catch(error => {
            console.error(`Error while constructing FloatingButton: ${error}`);
        })
        
        this.prevPosition = null;
        this.scrollPosition = 0;
        this.scrollDir = '';
    }    
    
    init(itemId, type, chatUrl) {
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
        this.chatHandler = document.createElement('img');
        this.chatHandler.src = 'public/img/units/sdk-bs-handler.png';
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
        this.button.className = 'floating-button-common button-image-shrink';
        this.button.type = 'button';
        document.body.appendChild(this.iframeContainer);
        document.body.appendChild(this.button);
        if(this.typeArr.length < 2) {
            this.expandedButton = document.createElement('div');
            this.expandedButton.className = 'expanded-button';
            this.expandedText = document.createElement('p');
            this.expandedButton.appendChild(this.expandedText);
            this.expandedText.innerText = this.floatingComment[type === 'needs' ? 1 : 0] || '...';
            this.expandedText.className = 'expanded-text';
            document.body.appendChild(this.expandedButton);
        }
        

        this.elems = {
            iframeContainer: this.iframeContainer,
            chatHeader: this.chatHeader,
            dimmedBackground: this.dimmedBackground,
            button: this.button,
            expandedButton: this.expandedButton,
        }

        // Button click event
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); 
            if (this.iframeContainer.classList.contains('iframe-container-hide')) {
                this.expandedButton.className = 'expanded-button hide';
                this.button.className = 'floating-button-common button-image-close';
                this.openChat(e, this.elems);
            } else {
                this.expandedButton.className = 'expanded-button';
                this.button.className = 'floating-button-common button-image';
                this.iframeContainer.className = 'iframe-container iframe-container-hide';
            }
        });

        setTimeout(() => {
            this.expandedButton.innerText = '';
            this.expandedButton.style.width = '50px';
            this.expandedButton.style.padding = 0;
            if (this.iframeContainer.classList.contains('iframe-container-hide')) {
                this.button.className = 'floating-button-common button-image';
            }
        }, [3000])

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
            this.hideChat(iframeContainer, button, expandedButton);
        })

        window.addEventListener('message', (e) => {
            if (this.isSmallResolution) {
                this.enableChat(iframeContainer, button, expandedButton, dimmedBackground, 'full');
            }
        })

        chatHeader.addEventListener('touchmove', (e) => {this.handleTouchMove(e, iframeContainer)});
        chatHeader.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e, iframeContainer, button, expandedButton, dimmedBackground)
        });
    }

    log(data) {
        if (data === 'needs') {
            this.type = 'needs';
            this.init();
        }
    }

    updateParameter(itemId, type) {
        this.type = type;
        this.fetchFloatingProduct(itemId, this.userId, type)
            .then(floatingProduct => {
                this.floatingProduct = floatingProduct
                this.chatUrl = `https://accio-webclient-git-test-sdk-waddle.vercel.app/${this.clientId}/sdk/${this.userId}?product=${JSON.stringify(this.floatingProduct)}`;
                this.init(itemId, type, this.chatUrl);
                if (type === 'needs') {this.typeArr.push('needs')}
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

    async handleAuth(udid, authCode) {
        if (udid === 'test') {
            return parseInt(Math.random()*1e9);
        }
        try {
            const response = await fetch(
                'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/auth', {
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

    async fetchFloatingComment(itemId) {
        try {
            // URL에 itemId를 포함시켜 GET 요청 보내기
            const url = `https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/recommend?itemId=${itemId}`;
            
            const response = await fetch(url, {
                method: "GET",
                headers: {}
            });
    
            const res = await response.json(); // JSON 형태의 응답 데이터 파싱
            return [res.this, res.needs];
        } catch (error) {
            console.error(`Error while calling fetchFloatingComment API: ${error}`);
        }
    }    

    async fetchFloatingProduct(itemId, userId, target) {
        try {
            const url = 'https://hg5eey52l4.execute-api.ap-northeast-2.amazonaws.com/dev/recommend';
            
            const payload = {
                itemId: itemId,
                userId: userId,
                target: target, // this or needs
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

    enableChat(iframeContainer, button, expandedButton, dimmedBackground, type) {
        if (this.isSmallResolution) {
            dimmedBackground.className = 'dimmed-background';
            button.className = 'floating-button-common hide';
            expandedButton.className = 'expanded-button hide';
        }
        if (type === 'shrink') {
            iframeContainer.className = 'iframe-container-shrink';
        } else if (type === 'full') {
            iframeContainer.className = 'iframe-container';
            iframeContainer.style.height = '100%';
        } else {
            return;
        }
    }

    hideChat(iframeContainer, button, expandedButton, dimmedBackground) {
        button.className = 'floating-button-common button-image';
        expandedButton.className = 'expanded-button hide';
        iframeContainer.className = 'iframe-container iframe-container-hide';
        dimmedBackground.className = 'dimmed-background hide';
    }

    // Function to log the current window width
    logWindowWidth() {
        const width = window.innerWidth;
        return width;
    }
}

// Export as a global variable
window.FloatingButton = FloatingButton;