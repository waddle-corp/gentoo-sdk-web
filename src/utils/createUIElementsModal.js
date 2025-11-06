import { postChatEventLog } from "../apis/chatConfig";
import '../floating-sdk-cafe24-modal.css';

// Separate UI creation into its own method for clarity
export const createUIElementsModal = (
    context, // this 객체를 받는 인자
    position, 
    showGentooButton, 
    isCustomButton = false, 
    checkSDKExists = false,
    customButton,
    chatbotData,
    floatingData,
) => {
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

    if (!floatingData || !floatingData.imageUrl) {
        console.error('Floating data is incomplete');
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
    if (context.floatingAvatar?.floatingAsset || context.floatingData.imageUrl.includes('gentoo-anime-web-default.lottie')) {
        const player = document.createElement('dotlottie-player');
        player.setAttribute('autoplay', '');
        player.setAttribute('loop', '');
        player.setAttribute('mode', 'normal');
        player.setAttribute('src', context.floatingAvatar?.floatingAsset || context.floatingData.imageUrl);
        player.style.width = context.isSmallResolution ? '68px' : context.floatingZoom ? '120px' : '94px';
        player.style.height = context.isSmallResolution ? '68px' : context.floatingZoom ? '120px' : '94px';
        player.style.cursor = 'pointer';
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
        context.input.placeholder = "메시지를 입력하세요";
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
        chatbotData?.examples?.forEach(example => {
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
    document.body.appendChild(context.iframeContainer);

    postChatEventLog({
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
            context.button.className = `floating-button-common button-image-md`;
        } else {
            context.button.className = `floating-button-common ${context.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
        }
        context.button.type = "button";
        context.button.style.backgroundImage = `url(${context.floatingData.imageUrl})`;
        document.body.appendChild(context.floatingContainer);
        if (context.dotLottiePlayer) {
            context.floatingContainer.appendChild(context.dotLottiePlayer);
        } else {
            context.floatingContainer.appendChild(context.button);
        }
    }

    context.elems = {
        iframeContainer: context.iframeContainer,
        iframe: context.iframe,
        chatHeader: context.chatHeader,
        button: context.button,
        expandedButton: context.expandedButton,
        customButton: customButton,
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
}

export const postMessageToIframe = (iframe, payload) => {
    iframe.contentWindow.postMessage(payload, "*");
}