class RecommendSection {
    constructor(props) {
        this.partnerType = props.partnerType;
        this.partnerId;
        this.chatUserId;
        this.udid = props.udid;
        this.authCode = props.authCode;
        this.itemId = props.itemId || 'general';
        this.type = props.type || 'default';
        this.container = props.container;
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
        this.chatUserId = '123947385';

        this.init(this.chatUserId);
    }    
    
    init(chatUserId) {
        // window.gtag('event', 'GentooPopped', {
        //     event_category: 'SDKFloatingRendered',
        //     event_label: 'SDK floating button is rendered',
        //     itemId: this.itemId,
        //     partnerType: this.partnerType,
        //     type: this.type,
        // })
        this.remove(this.iframeContainer);
        this.chatUserId = chatUserId;

        // Create iframe elements
        this.iframeContainer = document.createElement('div');
        this.iframeContainer.className = 'iframe-container';

        this.iframe = document.createElement('iframe');
        this.iframe.src = 'https://dev-demo.gentooai.com/recs/102039487';
        this.iframe.className = 'section-iframe';

        this.iframeContainer.appendChild(this.iframe);
        this.targetElem = document.getElementById(this.container);
        this.targetElem.appendChild(this.iframeContainer);
        
        this.elems = {
            iframeContainer: this.iframeContainer,
        }

        // Add event listener for the resize event
        window.addEventListener('resize', () => {
            this.browserWidth = this.logWindowWidth();
            this.isSmallResolution = this.browserWidth < 601;
        });
    }

    remove() {
        if (this.iframeContainer) {document.body.removeChild(this.iframeContainer)};
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

    // async logEvent(event, loc) {
    //     try {
    //         const url = this.domains.log;

    //         const payload = {
    //             event_category: event,
    //             visitorId: this.userId,
    //             itemId: this.itemId,
    //             partnerType: `${this.partnerType}_${loc}`,
    //             channelId: this.isMobileDevice ? 'mobile' : 'web',
    //         }

    //         const response = await fetch(url, {
    //             method: "POST",
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'x-api-key': this.keys.log,
    //             },
    //             body: JSON.stringify(payload),
    //         });
    
    //         const res = await response.json(); // JSON 형태의 응답 데이터 파싱
    //         return [res.this, res.needs, res.case];
    //     } catch (error) {
    //         console.error(`Error while calling logEvent API: ${error}`);
    //     }
    // } 

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
window.RecommendSection = RecommendSection;