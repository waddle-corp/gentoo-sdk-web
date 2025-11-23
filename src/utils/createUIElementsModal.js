import { postChatEventLog, postChatEventLogLegacy, getInstagramProfile } from "../apis/chatConfig";
import '../floating-sdk-cafe24-modal.css';

// Separate UI creation into its own method for clarity
export const createUIElementsModal = async (
    context, // this 객체를 받는 인자
    position, 
    showGentooButton, 
    isCustomButton = false, 
    checkSDKExists = false,
    customButton,
    chatbotData,
    isRecommendationBanner = false,
) => {
    console.log('createUIElementsModal called', context, position, showGentooButton, isCustomButton, checkSDKExists, customButton, chatbotData);
    // Check if any SDK elements exist in document
    if (checkSDKExists) {
        console.warn("GentooIO UI elements already exist in the document, skipping creation.");
        window.__GentooInited = 'created';
        return;
    }

    window.__GentooInited = 'creating';
    customButton = isCustomButton ? (document.getElementsByClassName("gentoo-custom-button")[0]) : null;
    // Add null checks before accessing properties
    if (
        !chatbotData ||
        !chatbotData.position ||
        !chatbotData.mobilePosition
    ) {
        console.error('Chatbot data is incomplete');
        return;
    }

    if (
        !context.bootConfig?.floating ||
        (!context.bootConfig?.floating?.button?.imageUrl && !context.floatingAvatar?.floatingAsset)
    ) {
        console.error("Floating data is incomplete");
        return;
    }

    context.dimmedBackground = document.createElement("div");
    context.dimmedBackground.className = "dimmed-background hide";
    context.dimmedBackground.setAttribute("data-gentoo-sdk", "true");
    context.dimmedBackground.appendChild(document.createTextNode('\u200B'));

    // Create iframe elements
    context.iframeContainer = document.createElement("div");
    context.iframeContainer.className = "iframe-container iframe-container-hide";
    context.iframeContainer.setAttribute("data-gentoo-sdk", "true");

    context.chatHeader = document.createElement("div");
    context.chatHandler = document.createElement("div");
    context.chatHeaderText = document.createElement("p");
    context.closeButtonContainer = document.createElement("div");
    context.closeButtonIcon = document.createElement("div");
    context.closeButtonText = document.createElement("p");
    context.chatHeaderText.innerText = "Gentoo";
    context.footer = document.createElement("div");
    context.footer.className = "chat-footer";
    context.footerText = document.createElement("p");
    context.footerText.className = "chat-footer-text";
    context.footer.appendChild(context.footerText);
    context.iframe = document.createElement("iframe");
    context.iframe.src = context.chatUrl;

    if (
        !context.bootConfig?.floating ||
        (!context.bootConfig?.floating?.button?.imageUrl && !context.floatingAvatar?.floatingAsset)
    ) {
        console.error("Floating data is incomplete");
        return;
    }

    // bootconfig floating imageurl OR floatingavatar floatingasset 중 하나
    const bootImage = context.bootConfig?.floating?.button?.imageUrl;
    const avatarAsset = context.floatingAvatar?.floatingAsset;
    context.useBootConfigFloatingImage = !!(bootImage && !bootImage.includes('default.lottie'));
    const selectedAsset = context.useBootConfigFloatingImage ? bootImage : avatarAsset;
    if (selectedAsset?.includes('lottie')) {
        const player = document.createElement('dotlottie-wc');
        player.setAttribute('autoplay', '');
        player.setAttribute('loop', '');
        player.setAttribute('mode', 'normal');
        // bootConfig 우선 순위로 변경 - 단, bootConfig가 default.lottie 라면 floatingAvatar 적용
        player.setAttribute('src', selectedAsset);
        player.style.width = context.floatingZoom ? '120px' : context.isSmallResolution ? '68px' : '94px';
        player.style.height = context.floatingZoom ? '120px' : context.isSmallResolution ? '68px' : '94px';
        player.style.cursor = 'pointer';
        player.appendChild(document.createTextNode('\u200B'));

        context.dotLottiePlayer = player;
    }

    if (context.isSmallResolution) {
        context.chatHeader.className = "chat-header-md";
        context.chatHandler.className = "chat-handler-md";
        context.chatHeaderText.className = "chat-header-text-md";
        context.closeButtonContainer.className = "chat-close-button-container-md";
        context.closeButtonIcon.className = "chat-close-button-icon-md";
        // context.closeButtonText.className = "chat-close-button-text-md";
        // context.closeButtonText.innerText = "접기";
        context.closeActionArea = document.createElement("div");
        context.closeActionArea.className = "chat-close-action-area-md";
        context.iframe.className = `chat-iframe-md ${context.warningActivated ? 'footer-add-height-md' : ''}`;
        context.closeButtonContainer.appendChild(context.closeButtonIcon);
        context.closeButtonContainer.appendChild(context.closeButtonText);
        // context.testButton = document.createElement("button");
        // context.testButton.className = "test-button";
        // context.testButton.innerText = "테스트";
        context.chatHeader.appendChild(context.chatHeaderText);
        context.chatHeader.appendChild(context.chatHandler);
        context.chatHeader.appendChild(context.closeButtonContainer);
        context.iframeContainer.appendChild(context.closeActionArea);
        // context.iframeContainer.appendChild(context.testButton);
        context.inputContainer = document.createElement("div");
        context.inputContainer.setAttribute("data-gentoo-sdk", "true");
        context.inputWrapper = document.createElement("div");
        context.inputWrapper.className = "chat-input-wrapper shrink-hide";
        context.input = document.createElement("input");
        context.sendButton = document.createElement("div");
        context.sendButton.className = "chat-send-button chat-send-button-active hide";
        context.input.className = "chat-input shrink-hide";
        context.input.placeholder = "상품 추천, 문의도 — 무엇이든 물어보세요";
        context.input.name = "gentoo-chat-input";
        context.input.type = "text";
        context.input.autocomplete = "off";
        context.input.spellcheck = "false";
        context.input.autocapitalize = "off";
        context.input.autocorrect = "off";
        context.profileImage = document.createElement("div");
        context.profileImage.className = "gentoo-profile-image hide";
        context.inputWrapper.appendChild(context.profileImage);
        context.inputWrapper.appendChild(context.input);
        context.inputWrapper.appendChild(context.sendButton);
        context.inputContainer.className = "chat-input-container hide";
        context.inputContainer.appendChild(context.inputWrapper);
        context.examFloatingGroup = document.createElement("div");
        context.examFloatingGroup.className = "exam-floating-group hide";
        
        // Build curation examples based on profileId
        let curationExamples = [];
        
        if (context.profileId) {
            try {
                const profileData = await getInstagramProfile(context.profileId);
                if (profileData) {
                    const displayName = profileData.full_name && profileData.full_name.trim() !== '' 
                        ? profileData.full_name 
                        : profileData.username;
                    curationExamples = [
                        {text: `${displayName} 인플루언서 Pick!`, id: 'influencerPick'},
                        {text: 'SNS 인기 상품', id: 'snsInfluencer'}
                    ];
                } else {
                    curationExamples = [{text: 'SNS 인기 상품', id: 'snsInfluencer'}];
                }
            } catch (error) {
                console.error('Failed to fetch Instagram profile:', error);
                curationExamples = [{text: 'SNS 인기 상품', id: 'snsInfluencer'}];
            }
        } else {
            curationExamples = [{text: 'SNS 인기 상품', id: 'snsInfluencer'}];
        }
        
        curationExamples.forEach(example => {
            const examFloatingButton = document.createElement("div");
            examFloatingButton.className = "exam-floating-button exam-floating-button-curation";
            examFloatingButton.innerText = example.text;
            examFloatingButton.setAttribute('data-curation-id', example.id);
            context.examFloatingGroup.appendChild(examFloatingButton);
        });
        chatbotData?.examples?.slice(0, 3).forEach(example => {
            const examFloatingButton = document.createElement("div");
            examFloatingButton.className = "exam-floating-button";
            examFloatingButton.innerText = example;
            context.examFloatingGroup.appendChild(examFloatingButton);
        });
        context.inputContainer.appendChild(context.examFloatingGroup);
        document.body.appendChild(context.inputContainer);
    } else {
        context.chatHeader.className = "chat-header";
        context.chatHeaderText.className = "chat-header-text";
        context.closeButtonContainer.className = "chat-close-button-container";
        context.closeButtonIcon.className = "chat-close-button-icon";
        context.closeButtonText.className = "chat-close-button-text";
        context.closeButtonText.innerText = "채팅창 축소";
        context.iframe.className = `chat-iframe ${context.warningActivated ? 'footer-add-height' : ''}`;
        context.closeButtonContainer.appendChild(context.closeButtonIcon);
        context.closeButtonContainer.appendChild(context.closeButtonText);
        context.chatHeader.appendChild(context.chatHeaderText);
        context.chatHeader.appendChild(context.closeButtonContainer);
    }

    context.iframeContainer.appendChild(context.chatHeader);
    context.iframeContainer.appendChild(context.iframe);
    if (context.warningActivated) {
        context.footerText.innerText = context.warningMessage;
        context.iframeContainer.appendChild(context.footer);
    }
    document.body.appendChild(context.dimmedBackground);
    document.body.appendChild(context.iframeContainer);

    postChatEventLog({
        experimentId: "flowlift_abctest_v1",
        partnerId: context.partnerId,
        variantId: context.variant,
        sessionId: context.sessionId || "sess-test",
        chatUserId: context.chatUserId,
        userType: context.userType,
        displayLocation: context.displayLocation,
        deviceType: context.isMobileDevice ? "mobile" : "web",
        timestamp: String(Date.now()),
        eventCategory: "gentoo_displayed",
        context: {
            autoChatOpen: Boolean(context.bootConfig?.floating?.autoChatOpen),
        },
    });

    postChatEventLogLegacy({
        eventCategory: "SDKFloatingRendered",
        partnerId: context.partnerId,
        chatUserId: context.chatUserId,
        products: [],
    }, context.isMobileDevice);
    window?.GentooLogListener?.log({ type: 'floatingEvent', event: 'floatingButtonRendered' });

    // Create floating button
    if (showGentooButton) {
        context.floatingContainer = document.createElement("div");
        context.floatingContainer.className = `floating-container`;
        context.floatingContainer.setAttribute("data-gentoo-sdk", "true");

        context.updateFloatingContainerPosition(position); // Set initial position
        context.button = document.createElement("div");
        if (context.isSmallResolution) {
            context.button.className = `floating-button-common ${context.floatingZoom ? 'button-image-zoom' : 'button-image-md'}`;
        } else {
            context.button.className = `floating-button-common ${context.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
        }
        context.button.type = "button";
        context.button.style.backgroundImage = `url(${context.useBootConfigFloatingImage ? context.bootConfig?.floating?.button?.imageUrl : context.floatingAvatar?.floatingAsset})`;
        document.body.appendChild(context.floatingContainer);
        if (context.dotLottiePlayer) {
            context.floatingContainer.appendChild(context.dotLottiePlayer);
        } else {
            context.floatingContainer.appendChild(context.button);
        }

        if (Boolean(context.bootConfig?.floating?.autoChatOpen)) context.openChat();
        else if (!context.gentooSessionData?.redirectState && context.floatingCount < 2 && context.bootConfig?.floating?.button?.comment?.length > 0) {
            // Check if component is destroyed or clicked
            if (context.floatingClicked || context.isDestroyed || !context.floatingContainer)
                return;

            context.expandedButtonWrapper = document.createElement("div");
            context.expandedButtonWrapper.className = `expanded-area-wrapper ${context.floatingZoom ? 'expanded-area-wrapper-zoom' : context.isSmallResolution ? 'expanded-area-wrapper-md' : ''}`;
            context.expandedButton = document.createElement("div");
            context.expandedText = document.createElement("p");
            if (context.isSmallResolution) {
                context.expandedButton.className =
                    context.useBootConfigFloatingImage ?
                        `expanded-area-md expanded-area-neutral-md` :
                        !context.floatingAvatar || context.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                            `expanded-area-md` :
                            `expanded-area-md expanded-area-neutral-md`;
                context.expandedText.className = `${context.floatingZoom ? 'expanded-area-text-zoom-md' : 'expanded-area-text-md'}`;
            } else {
                context.expandedButton.className =
                    context.useBootConfigFloatingImage ?
                        `expanded-area expanded-area-neutral` :
                        !context.floatingAvatar || context.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                            "expanded-area" :
                            `expanded-area expanded-area-neutral`;
                context.expandedText.className = `${context.floatingZoom ? 'expanded-area-text-zoom' : 'expanded-area-text'}`;
            }

            context.expandedButtonWrapper.appendChild(context.expandedButton);
            context.expandedButton.appendChild(context.expandedText);

            // Double check if floatingContainer still exists before appending
            if (context.floatingContainer && context.floatingContainer.parentNode) {
                context.floatingContainer.appendChild(context.expandedButtonWrapper);
                context.addLetter(context.bootConfig?.floating?.button?.comment, context.expandedText, () => context.isDestroyed);

                // Remove expanded button after delay
                setTimeout(() => {
                    if (
                        context.floatingContainer &&
                        context.expandedButtonWrapper &&
                        context.expandedButtonWrapper.parentNode === context.floatingContainer
                    ) {
                        context.floatingContainer.removeChild(context.expandedButtonWrapper);
                    }
                }, 7000);
            }
        }
    } else {
        if (Boolean(context.bootConfig?.floating?.autoChatOpen)) context.openChat();
    }

    context.elems = {
        iframeContainer: context.iframeContainer,
        iframe: context.iframe,
        chatHeader: context.chatHeader,
        button: context.button,
        expandedButton: context.expandedButton,
        customButton: customButton,
    }

    // Inject promotional banner above upsell widget if requested, before setting up listeners
    console.log('isRecommendationBanner', isRecommendationBanner);
    if (isRecommendationBanner && typeof context.injectRecommendationBanner === 'function') {
        context.injectRecommendationBanner();
    }

    // Add event listeners
    context.setupEventListeners(position, isCustomButton);
    if (context.gentooSessionData?.redirectState) {
        setTimeout(() => {
            if (context.expandedButton)
                context.expandedButton.classList.add('hide');
            if (context.button) {
                context.button.classList.add('hide');
            }
            if (context.dotLottiePlayer) {
                context.dotLottiePlayer.classList.add('hide');
            }
        }, 100);
        setTimeout(() => {
            context.openChat();
            context.gentooSessionData.redirectState = false;
            sessionStorage.setItem('gentoo', JSON.stringify(context.gentooSessionData));
        }, 500);
    }
    window.__GentooInited = 'created';

    // post message to iframe after all elements are created
    setTimeout(() => {
        context.sendPostMessageHandler({
            messageType: "gentoo-statics",
            contentData: {
                experimentId: "flowlift_abctest_v1",
                partnerId: context.partnerId,
                variantId: context.variant,
                sessionId: context.sessionId || "sess-test",
                chatUserId: context.chatUserId,
                userType: context.userType,
                displayLocation: context.displayLocation,
                deviceType: context.isMobileDevice ? "mobile" : "web",
            }
        });
    }, 1000);
}

export const postMessageToIframe = (iframe, payload) => {
    iframe.contentWindow.postMessage(payload, "*");
}