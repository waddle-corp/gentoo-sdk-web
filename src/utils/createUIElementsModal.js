import { postChatEventLog, postChatEventLogLegacy } from "../apis/chatConfig";
import '../floating-sdk-modal.css';
import { setupEventListenersModal } from "./setupEventListenersModal";
import {
    updateFloatingContainerPosition,
    addLetter,
    checkSDKExists,
    applyCanvasObjectFit
} from "./floatingSdkUtils";

// --- Small helpers for readability ---
const hasValidChatbotData = (chatbotData) => {
    return Boolean(chatbotData && chatbotData.position && chatbotData.mobilePosition);
};

const hasValidFloatingData = (context) => {
    const bootImage = context.bootConfig?.floating?.button?.imageUrl;
    const avatarAsset = context.floatingAvatar?.floatingAsset;
    const fallbackImage = context.floatingData?.imageUrl;
    return Boolean(
        (context.bootConfig?.floating && (bootImage || avatarAsset || fallbackImage)) ||
        fallbackImage
    );
};

const selectFloatingAsset = (context) => {
    const bootImage = context.bootConfig?.floating?.button?.imageUrl;
    const avatarAsset = context.floatingAvatar?.floatingAsset;
    const floatingImage = context.floatingData?.imageUrl;
    const useBootImage = Boolean(bootImage && !bootImage.includes('default.lottie'));
    const selectedAsset = useBootImage ? bootImage : (avatarAsset || floatingImage);
    return { useBootImage, selectedAsset };
};

const createDotLottiePlayer = (src, sizePx) => {
    const player = document.createElement('dotlottie-wc');
    player.setAttribute('autoplay', '');
    player.setAttribute('loop', '');
    player.setAttribute('mode', 'normal');
    player.setAttribute('renderConfig', '{"devicePixelRatio": 2, "autoResize": true}');
    player.setAttribute('src', src);
    player.style.width = '100%';
    player.style.height = '100%';
    player.style.cursor = 'pointer';
    player.appendChild(document.createTextNode('\u200B'));

    const playerWrapper = document.createElement('div');
    playerWrapper.style.width = sizePx;
    playerWrapper.style.height = sizePx;
    playerWrapper.style.cursor = 'pointer';
    playerWrapper.style.aspectRatio = '1/1';
    playerWrapper.style.flexShrink = '0';
    playerWrapper.appendChild(player);
    playerWrapper._player = player;
    return playerWrapper;
};

const logFloatingRendered = (context) => {
    const deviceType = context.isMobileDevice ? "mobile" : "web";
    postChatEventLog({
        experimentId: "flowlift_abctest_v1",
        partnerId: context.partnerId,
        variantId: context.variant,
        sessionId: context.sessionId || "sess-test",
        chatUserId: context.chatUserId,
        userType: context.userType,
        displayLocation: context.displayLocation,
        deviceType,
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
};

const getCurrentFloatingPosition = (context, position) => {
    const storedFloatingPosition = context.gentooSessionData?.floatingPosition || {};
    let currentFloatingPosition = position ? JSON.parse(JSON.stringify(position)) : {};
    if (!currentFloatingPosition.web) currentFloatingPosition.web = {};
    if (!currentFloatingPosition.mobile) currentFloatingPosition.mobile = {};
    if (context.isSmallResolution) {
        if (storedFloatingPosition?.mobile) {
            if (typeof storedFloatingPosition.mobile.bottom === 'number') currentFloatingPosition.mobile.bottom = storedFloatingPosition.mobile.bottom;
            if (typeof storedFloatingPosition.mobile.right === 'number') currentFloatingPosition.mobile.right = storedFloatingPosition.mobile.right;
        }
    } else {
        if (storedFloatingPosition?.web) {
            if (typeof storedFloatingPosition.web.bottom === 'number') currentFloatingPosition.web.bottom = storedFloatingPosition.web.bottom;
            if (typeof storedFloatingPosition.web.right === 'number') currentFloatingPosition.web.right = storedFloatingPosition.web.right;
        }
    }
    return currentFloatingPosition;
}

// ------------------------------ Modal UI Creation ------------------------------
export const createUIElementsModal = (
    context, // this 객체를 받는 인자
    position,
    showGentooButton,
    isCustomButton = false,
    customButton,
    chatbotData,
) => {
    // Check if any SDK elements exist in document
    if (checkSDKExists(window, document)) {
        console.warn("GentooIO UI elements already exist in the document, skipping creation.");
        window.__GentooInited = 'created';
        return;
    }

    window.__GentooInited = 'creating';
    customButton = isCustomButton ? (document.getElementsByClassName("gentoo-custom-button")[0]) : null;
    // Add null checks before accessing properties
    if (!hasValidChatbotData(chatbotData)) {
        console.error('Chatbot data is incomplete');
        return;
    }

    if (!hasValidFloatingData(context)) {
        console.error("Floating data is incomplete");
        return;
    }

    // Fire "show" callback if provided (parity with legacy)
    if (context?.eventCallback?.show) {
        try { context.eventCallback.show(); } catch { }
    }

    /* [Dimmed Background] */
    context.dimmedBackground = document.createElement("div");
    context.dimmedBackground.className = "dimmed-background hide";
    context.dimmedBackground.setAttribute("data-gentoo-sdk", "true");
    context.dimmedBackground.appendChild(document.createTextNode('\u200B'));

    /* [Iframe Container] */
    context.iframeContainer = document.createElement("div");
    context.iframeContainer.className = "iframe-container iframe-container-hide";
    context.iframeContainer.setAttribute("data-gentoo-sdk", "true");

    /* [Iframe] */
    context.iframe = document.createElement("iframe");
    context.iframe.src = context.chatUrl;

    /* [Chat Header] */
    context.chatHeader = document.createElement("div");
    context.chatHandler = document.createElement("div");
    context.chatHeaderProfile = document.createElement("div");
    context.chatHeaderImage = document.createElement("img");
    context.chatHeaderText = document.createElement("p");
    context.chatHeaderText.innerText = context.chatbotData?.name || "Gentoo";

    context.closeButtonContainer = document.createElement("div");
    context.closeButtonIcon = document.createElement("div");
    context.closeButtonText = document.createElement("p");

    /* [Chat Footer] */
    context.footer = document.createElement("div");
    context.footer.className = "chat-footer";
    context.footerText = document.createElement("p");
    context.footerText.className = "chat-footer-text";
    context.footer.appendChild(context.footerText);

    // Reuse pre-validated floating data
    const { useBootImage, selectedAsset } = selectFloatingAsset(context);
    context.useBootConfigFloatingImage = useBootImage;
    context.selectedFloatingImage = selectedAsset;

    /* [DotLottie Player] */
    if (selectedAsset?.includes('lottie')) {
        let lottieSize = '';
        if (context.partnerType === 'cafe24') {
            lottieSize = context.isSmallResolution ? '68px' : (context.floatingZoom ? '120px' : '94px');
        } else {
            lottieSize = context.floatingZoom ? '120px' : (context.isSmallResolution ? '68px' : '94px');
        }
        context.dotLottiePlayer = createDotLottiePlayer(selectedAsset, lottieSize);
    }

    /* 모바일 채팅창 Modal UI 생성 */
    if (context.isSmallResolution || context.isMobileDevice) {
        /* [Iframe] */
        context.iframe.className = `chat-iframe-md ${context.warningActivated ? 'footer-add-height-md' : ''}`;

        /* [Chat Header] */
        context.chatHeader.className = "chat-header-md";
        context.chatHandler.className = "chat-handler-md";
        context.chatHeaderText.className = "chat-header-text-md";
        context.chatHeaderProfile.className = "chat-header-profile-md";
        context.chatHeaderImage.className = "chat-header-image-md";
        context.chatHeaderImage.style.setProperty('--gentoo-profile-image', `url(${context.floatingAvatar?.profileAsset})`);

        context.closeButtonContainer.className = "chat-close-button-container-md";
        context.closeButtonIcon.className = "chat-close-button-icon-md";
        context.closeActionArea = document.createElement("div");
        context.closeActionArea.className = "chat-close-action-area-md";
        context.closeButtonContainer.appendChild(context.closeButtonIcon);
        context.closeButtonContainer.appendChild(context.closeButtonText);

        context.chatHeaderProfile.appendChild(context.chatHeaderImage);
        context.chatHeaderProfile.appendChild(context.chatHeaderText);
        context.chatHeader.appendChild(context.chatHeaderProfile);
        context.chatHeader.appendChild(context.chatHandler);
        context.chatHeader.appendChild(context.closeButtonContainer);
        context.iframeContainer.appendChild(context.closeActionArea);

        /* [Input Container] */
        context.inputContainer = document.createElement("div");
        context.inputContainer.setAttribute("data-gentoo-sdk", "true");
        context.inputWrapper = document.createElement("div");
        context.inputWrapper.className = "chat-input-wrapper shrink-hide";
        context.input = document.createElement("input");
        context.sendButton = document.createElement("div");
        context.sendButton.className = "chat-send-button chat-send-button-active hide";
        context.input.className = "chat-input shrink-hide";
        context.input.placeholder = context.lang === 'ko' ? "무엇이든 물어보세요" : "Ask me anything";
        context.input.name = "gentoo-chat-input";
        context.input.type = "text";
        context.input.autocomplete = "off";
        context.input.spellcheck = "false";
        context.input.autocapitalize = "off";
        context.input.autocorrect = "off";
        context.profileImage = document.createElement("div");
        context.profileImage.style.setProperty('--gentoo-profile-image', `url(${context.floatingAvatar?.profileAsset})`);
        context.profileImage.className = "gentoo-profile-image hide";
        context.inputWrapper.appendChild(context.profileImage);
        context.inputWrapper.appendChild(context.input);
        context.inputWrapper.appendChild(context.sendButton);
        context.inputContainer.className = "chat-input-container hide";
        context.inputContainer.appendChild(context.inputWrapper);

        /* [Exam Floating Group] */
        context.examFloatingGroup = document.createElement("div");
        context.examFloatingGroup.className = "exam-floating-group hide";
        chatbotData?.examples?.forEach(example => {
            const examFloatingButton = document.createElement("div");
            examFloatingButton.className = "exam-floating-button";
            examFloatingButton.innerText = example;
            examFloatingButton.style.setProperty('--gentoo-color-3', context.chatbotData?.colorCode[2]?.hex);
            examFloatingButton.style.setProperty('--gentoo-color-1', context.chatbotData?.colorCode[0]?.hex);
            context.examFloatingGroup.appendChild(examFloatingButton);
        });
        context.inputContainer.appendChild(context.examFloatingGroup);
        document.body.appendChild(context.inputContainer);
    } else {
        /* 데스크탑 채팅창 일반 UI 생성 */
        /* [Iframe] */
        context.iframe.className = `chat-iframe ${context.warningActivated ? 'footer-add-height' : ''}`;
        /* [Chat Header] */
        context.chatHeader.className = "chat-header";
        context.chatHeaderText.className = "chat-header-text";
        context.chatHeaderText.innerText = "Gentoo";
        context.closeButtonContainer.className = "chat-close-button-container";
        context.closeButtonIcon.className = "chat-close-button-icon";
        context.closeButtonText.className = "chat-close-button-text";
        context.closeButtonText.innerText = "채팅창 축소";
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

    logFloatingRendered(context);

    /* 젠투 플로팅 버튼 UI 생성 */
    if (showGentooButton) {
        /* [Floating Container] */
        context.floatingContainer = document.createElement("div");
        context.floatingContainer.className = `floating-container`;
        context.floatingContainer.setAttribute("data-gentoo-sdk", "true");
        document.body.appendChild(context.floatingContainer);

        /* [Floating Position] */
        context.currentFloatingPosition = getCurrentFloatingPosition(context, position);
        updateFloatingContainerPosition(context, context.currentFloatingPosition); // Set initial position

        /* [non-lottie Floating Button] */
        context.button = document.createElement("div");
        if (context.isSmallResolution && context.partnerType === 'cafe24') {
            context.button.className = `floating-button-common button-image-md`;
        } else if (context.isSmallResolution) {
            context.button.className = `floating-button-common ${context.floatingZoom ? 'button-image-zoom' : 'button-image-md'}`;
        } else {
            context.button.className = `floating-button-common ${context.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
        }
        context.button.type = "button";
        context.button.style.backgroundImage =
            `url(${context.selectedFloatingImage})`;

        if (Boolean(context.bootConfig?.floating?.autoChatOpen)) context.openChat();
        else if (!context.gentooSessionData?.redirectState && context.floatingCount < 2 && context.bootConfig?.floating?.button?.comment?.length > 0) {
            // Check if component is destroyed or clicked
            if (context.floatingClicked || context.isDestroyed || !context.floatingContainer)
                return;

            /* [Floating Message] */
            context.expandedButtonWrapper = document.createElement("div");
            if (context.partnerType === 'cafe24') {
                context.expandedButtonWrapper.className = `expanded-area-wrapper ${context.isSmallResolution ? 'expanded-area-wrapper-md' : context.floatingZoom ? 'expanded-area-wrapper-zoom' : ''}`;
            } else {
                context.expandedButtonWrapper.className = `expanded-area-wrapper ${context.floatingZoom ? 'expanded-area-wrapper-zoom' : context.isSmallResolution ? 'expanded-area-wrapper-md' : ''}`;
            }
            context.expandedButton = document.createElement("div");
            context.expandedText = document.createElement("p");

            if (context.isSmallResolution) {
                context.expandedButton.className =
                    context.useBootConfigFloatingImage ?
                        `expanded-area-md expanded-area-neutral-md` :
                        !context.floatingAvatar || context.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                            `expanded-area-md` :
                            `expanded-area-md expanded-area-neutral-md`;
                if (context.partnerType === 'cafe24') {
                    context.expandedText.className = "expanded-area-text-md"; // 추후 아가방 노티 후에 다른 SDK들과 동일하게 업데이트 필요
                } else {
                    context.expandedText.className = `${context.floatingZoom ? 'expanded-area-text-zoom-md' : 'expanded-area-text-md'}`;
                }
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
                // expandedButtonWrapper를 먼저 append (왼쪽에 위치)
                context.floatingContainer.appendChild(context.expandedButtonWrapper);
                addLetter(context, context.bootConfig?.floating?.button?.comment, context.expandedText, () => context.isDestroyed);

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

            // Start repeating interval for experiment target (every 10 seconds)
            if (context?.isExperimentTarget && context?.availableComments && context?.availableComments?.length > 0) {
                context.floatingMessageIntervalId = setInterval(() => {
                    context.showRandomFloatingMessage();
                }, context.FLOATING_MESSAGE_INTERVAL_MS);
            }
        }

        /* [Lottie Floating Button] */
        if (context.dotLottiePlayer) {
            // expandedButtonWrapper가 먼저 append된 후, dotLottiePlayer를 append (오른쪽에 위치)
            if (context.floatingContainer && context.floatingContainer.parentNode) {
                // Remove button if it exists, then append dotLottiePlayer
                if (context.button && context.button.parentNode === context.floatingContainer) {
                    context.floatingContainer.removeChild(context.button);
                }
                context.floatingContainer.appendChild(context.dotLottiePlayer);
            }
            
            // Use requestAnimationFrame to ensure layout is calculated before applying canvas styles
            requestAnimationFrame(() => {
                // Apply object-fit: cover to canvas in shadow-root
                applyCanvasObjectFit(context.dotLottiePlayer);
            });
        } else {
            context.floatingContainer.appendChild(context.button);
        }
    }

    /* [UI Elements] */
    context.elems = {
        iframeContainer: context.iframeContainer,
        iframe: context.iframe,
        chatHeader: context.chatHeader,
        button: context.button,
        expandedButton: context.expandedButton,
        customButton: customButton,
    }

    /* [Event Listeners] */
    context.currentFloatingPosition = getCurrentFloatingPosition(context, position);
    setupEventListenersModal(context, context.currentFloatingPosition);

    /* 캐러셀 리다이렉트 시 채팅창 자동 열림 */
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

    /* Post Static-Info Message to Chat after all elements are created */
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
                godomallCVID: context.sessionId,
                cafe24CVID: context?.cvid,
                cafe24CVIDY: context?.cvid_y,
                fbclid: context?.fbclid,
            }
        });
    }, 1000);
}

export const postMessageToIframe = (iframe, payload) => {
    iframe.contentWindow.postMessage(payload, "*");
}