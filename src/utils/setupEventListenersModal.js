import { postChatEventLog, postChatEventLogLegacy } from "../apis/chatConfig";
import { 
    updateFloatingContainerPosition, 
    addLetter,
    logWindowWidth
} from "./floatingSdkUtils";

export const setupEventListenersModal = (context, position) => {
    // Button click event
    var buttonClickHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        context.floatingClicked = true;

        if (context.messageExistence || context.displayLocation === 'PRODUCT_DETAIL') {
            context.openChat();
        } else if (context.inputContainer.classList.contains("hide")) {
            if (context.dimmedBackground) context.dimmedBackground.classList.remove("hide");
            context.inputContainer.classList.remove("hide");
            context.inputWrapper.classList.remove("shrink-hide");
            context.input.classList.remove("shrink-hide");
            context.examFloatingGroup.classList.add("slide-up");
            context.examFloatingGroup.classList.remove("hide");
            context.sendButton.classList.remove("hide");
            context.profileImage.classList.remove("hide");
            if (context.expandedButton)
                context.expandedButton.classList.add('hide');
            if (context.button) {
                if (context.isSmallResolution) {
                    context.button.className =
                        "floating-button-common button-image-close-mr hide";
                } else {
                    context.button.className =
                        "floating-button-common button-image-close hide";
                }
            }
            if (context.dotLottiePlayer) {
                context.dotLottiePlayer.classList.add('hide');
            }
            context.input.focus();
        }
    };

    const performInputBlur = () => {
        if (context.dimmedBackground) context.dimmedBackground.classList.add('hide');
        context.inputContainer.classList.add("hide");
        context.inputWrapper.classList.add("shrink-hide");
        context.input.classList.add("shrink-hide");
        context.examFloatingGroup.classList.remove("slide-up");
        context.examFloatingGroup.classList.add("hide");
        context.sendButton.classList.add("hide");
        context.profileImage.classList.add("hide");

        context.inputContainerTimeout = setTimeout(() => {
            if (context.iframeContainer.classList.contains("iframe-container-shrink")) return;
            if (context.button) {
                if (context.isSmallResolution) {
                    context.button.className = "floating-button-common button-image-md";
                } else {
                    context.button.className = `floating-button-common ${context.floatingZoom ? 'button-image-zoom' : 'button-image'}`;
                }
                context.button.style.backgroundImage = `url(${context.bootConfig?.floating?.button?.imageUrl || context.floatingData.imageUrl})`;
            }
            if (context.dotLottiePlayer) {
                context.dotLottiePlayer.classList.remove('hide');
                context.dotLottiePlayer.setAttribute('src', context.bootConfig?.floating?.button?.imageUrl || context.floatingData.imageUrl);
            }
        }, 100);
        context.inputContainerTimeout = null;
    };

    context.input?.addEventListener("blur", () => {
        if (context.isInteractingWithSend) {
            setTimeout(() => {
                context.isInteractingWithSend = false;
                performInputBlur();
            }, 0);
            return;
        }
        performInputBlur();
    });

    window?.addEventListener("message", (e) => {
        if (e.data.redirectState) {
            if (!context.isSmallResolution) {
                context.gentooSessionData.redirectState = true;
                sessionStorage.setItem('gentoo', JSON.stringify(context.gentooSessionData));
            }
            context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'carouselRedirect', currentPage: e.data.redirectUrl });
            window.location.href = e.data.redirectUrl;
        }
        if (e.data.formSubmittedState) {
            const params = { p1: e.data.firstAnswer, p2: e.data.secondAnswer };
            if (context.eventCallback.formSubmitted !== null) {
                context.eventCallback?.formSubmitted(params);
            }
        }
        if (context.isSmallResolution && e.data.inputFocusState) {
            // context.enableChat("full");
        }
        if (e.data.resetState) {
            if (context.isMobileDevice && context.iframeContainer) {
                context.hideChat();
                // open modal 로 묶어야 됨
                if (context.inputContainer.classList.contains("hide")) {
                    context.inputContainer.classList.remove("hide");
                    context.inputWrapper.classList.remove("shrink-hide");
                    context.input.classList.remove("shrink-hide");
                    context.examFloatingGroup.classList.add("slide-up");
                    context.examFloatingGroup.classList.remove("hide");
                    // context.examFloatingButton.classList.remove("slide-down");
                    // context.examFloatingButton.classList.remove("hide");
                    context.sendButton.classList.remove("hide");
                    context.profileImage.classList.remove("hide");
                    if (context.dimmedBackground) context.dimmedBackground.classList.remove('hide');
                    if (context.expandedButton)
                        context.expandedButton.classList.add('hide');
                    if (context.button) {
                        if (context.isSmallResolution) {
                            context.button.className =
                                "floating-button-common button-image-close-mr hide";
                        } else {
                            context.button.className =
                                "floating-button-common button-image-close hide";
                        }
                    }
                    if (context.dotLottiePlayer) {
                        context.dotLottiePlayer.classList.add('hide');
                    }
                    context.input.focus();
                }
            }
        }
        if (e.data.closeRequestState) {
            context.hideChat();
        }
        if (e.data.addProductToCart) {
            context.addProductToCart(e.data.addProductToCart);
        }
        if (e.data.addProductWithOptionsToCart) {
            context.addProductWithOptionsToCart(e.data.addProductWithOptionsToCart);
        }

        if (e.data.floatingMessage) {
            if (!context.gentooSessionData?.redirectState && context.floatingCount < 2 && e.data.floatingMessage?.length > 0) {
                // Check if component is destroyed or clicked
                if (context.floatingClicked || context.isDestroyed || !context.floatingContainer)
                    return;
                context.floatingMessage = e.data.floatingMessage;
                context.expandedButton = document.createElement("div");
                context.expandedText = document.createElement("p");
                if (context.isSmallResolution) {
                    context.expandedButton.className =
                        !context.floatingAvatar || context.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                            "expanded-area-md" :
                            "expanded-area-md expanded-area-neutral-md";
                    context.expandedText.className = "expanded-area-text-md";
                } else {
                    context.expandedButton.className =
                        !context.floatingAvatar || context.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                            "expanded-area" :
                            "expanded-area expanded-area-neutral";
                    context.expandedText.className = `${context.floatingZoom ? 'expanded-area-text-zoom' : 'expanded-area-text'}`;
                }
                context.expandedButton.appendChild(context.expandedText);

                // Double check if floatingContainer still exists before appending
                if (context.floatingContainer && context.floatingContainer.parentNode) {
                    context.floatingContainer.appendChild(context.expandedButton);

                    addLetter(context, context.bootConfig?.floating?.button?.comment || context.floatingData.comment, context.expandedText, () => context.isDestroyed);
                    context.floatingCount += 1;

                    setTimeout(() => {
                        if (
                            context.floatingContainer &&
                            context.expandedButton &&
                            context.expandedButton.parentNode === context.floatingContainer
                        ) {
                            context.floatingContainer.removeChild(context.expandedButton);
                        }
                    }, 7000);
                }
            }
        }

        if (e.data.connectionId) {
            window?.GentooLogListener?.log({ type: 'healthCheck', event: 'registered', connectionId: e.data.connectionId });
        }
        if (e.data.type === 'messageExistence') {
            context.messageExistence = e.data.messageExistenceState;
            sessionStorage.setItem('gentoo', JSON.stringify({ ...context.gentooSessionData, messageExistence: e.data.messageExistenceState }));
        }
    });

    context.floatingContainer?.addEventListener("click", buttonClickHandler);
    context.floatingContainer?.addEventListener("click", (e) => {
        context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href });
        window?.GentooLogListener?.log({ type: 'floatingEvent', event: 'floatingButtonClick', floatingMessage: context.floatingMessage });
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
            eventCategory: "gentoo_clicked",
            context: {
                autoChatOpen: Boolean(context.bootConfig?.floating?.autoChatOpen),
                floatingText: context.bootConfig?.floating?.button?.comment,
            },
        }, context.isMobileDevice);
        postChatEventLogLegacy({
            eventCategory: 'SDKFloatingClicked',
            partnerId: context.partnerId,
            chatUserId: context.chatUserId,
            products: [],
        }, context.isMobileDevice);
    });
    context.closeButtonContainer?.addEventListener("click", buttonClickHandler);
    context.closeButtonContainer?.addEventListener("click", (e) => context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeButtonContainer', currentPage: window?.location?.href }));
    context.closeButtonIcon?.addEventListener("click", buttonClickHandler);
    context.closeActionArea?.addEventListener("click", (e) => {
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
            eventCategory: "chat_close_requested",
        });
        context.hideChat();
        context.redirectToCartPage();
        // add letter 관련 묶어야 됨
        setTimeout(() => {
            context.floatingMessage = '궁금한 게 있으시면 언제든 다시 눌러주세요!';
            context.expandedButton = document.createElement("div");
            context.expandedText = document.createElement("p");
            if (context.isSmallResolution) {
                context.expandedButton.className =
                    !context.floatingAvatar || context.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                        "expanded-area-md" :
                        "expanded-area-md expanded-area-neutral-md";
                context.expandedText.className = "expanded-area-text-md";
            } else {
                context.expandedButton.className =
                    !context.floatingAvatar || context.floatingAvatar?.floatingAsset.includes('default.lottie') ?
                        "expanded-area" :
                        "expanded-area expanded-area-neutral";
                context.expandedText.className = `${context.floatingZoom ? 'expanded-area-text-zoom' : 'expanded-area-text'}`;
            }
            context.expandedButton.appendChild(context.expandedText);
            if (context.floatingContainer && context.floatingContainer.parentNode) {
                context.floatingContainer.appendChild(context.expandedButton);

                addLetter(context, context.floatingMessage, context.expandedText, () => context.isDestroyed);
                context.floatingCount += 1;

                setTimeout(() => {
                    if (
                        context.floatingContainer &&
                        context.expandedButton &&
                        context.expandedButton.parentNode === context.floatingContainer
                    ) {
                        context.floatingContainer.removeChild(context.expandedButton);
                    }
                }, 7000);
            }
        }, 500);
    });
    context.closeActionArea?.addEventListener("click", (e) => context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeActionArea', currentPage: window?.location?.href }));
    context.customButton?.addEventListener("click", buttonClickHandler);
    context.customButton?.addEventListener("click", (e) => context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'floatingContainer', currentPage: window?.location?.href }));
    context.sendButton?.addEventListener("pointerdown", () => { context.isInteractingWithSend = true; });
    context.sendButton?.addEventListener("mousedown", () => { context.isInteractingWithSend = true; });
    context.sendButton?.addEventListener("touchstart", () => { context.isInteractingWithSend = true; }, { passive: true });
    context.sendButton?.addEventListener("click", (e) => {
        context.iframeContainer.style.height = "400px";
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
            eventCategory: "chat_input_started",
            context: {
                dialogueId: context.dialogueId,
                inputType: "manual_input",
                messageText: context.input.value,
                messageLength: context.input.value.length,
            },
        });
        context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'sendButton', currentPage: window?.location?.href, requestMessage: context.input.value });
        context.openChat();
        context.input.value = "";
        context.input.blur();
    });

    // 예시 버튼 클릭 이벤트 추가
    context.examFloatingGroup?.addEventListener("pointerdown", () => { context.isInteractingWithSend = true; });
    context.examFloatingGroup?.addEventListener("mousedown", () => { context.isInteractingWithSend = true; });
    context.examFloatingGroup?.addEventListener("touchstart", () => { context.isInteractingWithSend = true; }, { passive: true });
    context.examFloatingGroup.addEventListener("click", (e) => {
        const button = e.target.closest('.exam-floating-button');
        if (button) {
            context.iframeContainer.style.height = "400px";
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
                eventCategory: "chat_input_started",
                context: {
                    dialogueId: context.dialogueId,
                    inputType: "example_click",
                    messageText: button.innerText,
                    messageLength: button.innerText.length,
                },
            });
            context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'sendButton', currentPage: window?.location?.href, requestMessage: button.innerText });
            context.openChat();
            context.input.blur();
        }
    });

    // 엔터키 이벤트 추가
    context.input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.keyCode === 13) {
            e.preventDefault(); // 기본 엔터 동작 방지
            context.iframeContainer.style.height = "400px";
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
                eventCategory: "chat_input_started",
                context: {
                    dialogueId: context.dialogueId,
                    inputType: "manual_input",
                    messageText: context.input.value,
                    messageLength: context.input.value.length,
                },
            });
            context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'sendButton', currentPage: window?.location?.href, requestMessage: context.input.value });
            context.openChat();
            context.input.value = "";
            context.input.blur();
        }
    });
    // this.testButton?.addEventListener("click", testButtonClickHandler);
    // Add event listener for the resize event
    window?.addEventListener("resize", () => {
        context.browserWidth = logWindowWidth(window);
        context.isSmallResolution = context.browserWidth < 601;
        updateFloatingContainerPosition(context, position); // Update position on resize
    });

    window?.addEventListener('popstate', () => {
        if (context.isMobileDevice) {
            context.hideChat();
        }
    });
};


