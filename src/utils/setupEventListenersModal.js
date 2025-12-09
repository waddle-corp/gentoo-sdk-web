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
        if (context.isDraggingFloating || context._dragMoved) {
            // Suppress click when drag just happened
            return;
        }
        context.floatingClicked = true;

        if (context.messageExistence || context.displayLocation === 'PRODUCT_DETAIL') {
            context.openChat();
            if (context?.eventCallback?.click) {
                try { context.eventCallback.click(); } catch {}
            }
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
            if (context?.eventCallback?.click) {
                try { context.eventCallback.click(); } catch {}
            }
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
                context.button.style.backgroundImage = `url(${context.selectedFloatingImage})`;
            }
            if (context.dotLottiePlayer) {
                context.dotLottiePlayer.classList.remove('hide');
                context.dotLottiePlayer.setAttribute('src', context.selectedFloatingImage);
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
        if (e.data.preInputSubmittedState) {
            if (context.eventCallback.preInputSubmitted !== null) {
                if (e.data.step1) {
                    context.eventCallback?.preInputSubmitted({ step1: e.data.step1 });
                } else if (e.data.step2) {
                    context.eventCallback?.preInputSubmitted({ step2: e.data.step2 });
                }
            }
        }
        if (context.isSmallResolution && e.data.inputFocusState) {
            // context.enableChat("full");
        }
        if (e.data.resetState) {
            if ((context.isMobileDevice || context.isSmallResolution) && context.iframeContainer) {
                context.hideChat();
                // open modal 로 묶어야 됨
                if (context.inputContainer.classList.contains("hide")) {
                    context.inputContainer.classList.remove("hide");
                    context.inputWrapper.classList.remove("shrink-hide");
                    context.input.classList.remove("shrink-hide");
                    context.examFloatingGroup.classList.add("slide-up");
                    context.examFloatingGroup.classList.remove("hide");
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
        if (e.data.userSentMessageState) {
            if (context.eventCallback.userSentMessage !== null) {
                try { context.eventCallback?.userSentMessage(); } catch {}
            }
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
    /* Mobile touch-drag for floatingContainer */
    const onTouchStart = (e) => {
        if (!context.isSmallResolution || !context.floatingContainer) return;
        const touch = e.touches && e.touches[0];
        if (!touch) return;
        const cs = window.getComputedStyle(context.floatingContainer);
        const right = parseFloat(cs.right) || 0;
        const bottom = parseFloat(cs.bottom) || 0;
        context._dragStart = { x: touch.clientX, y: touch.clientY, right, bottom };
        context._dragMoved = false;
    };
    const onTouchMove = (e) => {
        if (!context.isSmallResolution || !context.floatingContainer) return;
        const touch = e.touches && e.touches[0];
        if (!touch) return;
        context.isDraggingFloating = true;
        context._dragMoved = true;
        // Prevent page scroll while dragging
        e.preventDefault();
        const dx = context._dragStart.x - touch.clientX;
        const dy = context._dragStart.y - touch.clientY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const rect = context.floatingContainer.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        const maxRight = Math.max(vw - cw, 0);
        const maxBottom = Math.max(vh - ch, 0);
        let newRight = context._dragStart.right + dx;
        let newBottom = context._dragStart.bottom + dy;
        newRight = Math.min(Math.max(newRight, 0), maxRight);
        newBottom = Math.min(Math.max(newBottom, 0), maxBottom);
        context.floatingContainer.style.right = `${Math.round(newRight)}px`;
        context.floatingContainer.style.bottom = `${Math.round(newBottom)}px`;
        // Persist to position object and session
        position.mobile = position.mobile || {};
        position.mobile.right = Math.round(newRight);
        position.mobile.bottom = Math.round(newBottom);
        context.gentooSessionData = JSON.parse(sessionStorage.getItem('gentoo')) || context.gentooSessionData || {};
        context.gentooSessionData.floatingPosition = context.gentooSessionData.floatingPosition || {};
        context.gentooSessionData.floatingPosition.mobile = { right: position.mobile.right, bottom: position.mobile.bottom };
        sessionStorage.setItem('gentoo', JSON.stringify(context.gentooSessionData));
    };
    const onTouchEnd = (e) => {
        if (!context.isSmallResolution) return;
        if (context._dragMoved) {
            e.preventDefault();
        }
        context.isDraggingFloating = false;
        context._dragMoved = false;
    };
    context.floatingContainer?.addEventListener("touchstart", onTouchStart, { passive: true });
    context.floatingContainer?.addEventListener("touchmove", onTouchMove, { passive: false });
    context.floatingContainer?.addEventListener("touchend", onTouchEnd);
    context.floatingContainer?.addEventListener("touchcancel", onTouchEnd);

    context.closeActionArea?.addEventListener("click", (e) => {
        context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeButtonContainer', currentPage: window?.location?.href })
        context.sendPostMessageHandler({ buttonClickState: true, clickedElement: 'closeActionArea', currentPage: window?.location?.href })
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
            context.floatingMessage = context.lang === 'ko' ? '궁금한 게 있으시면 언제든 다시 눌러주세요!' : 'Click me again anytime if you have any questions!';
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
        //const button = e.target.closest('.exam-floating-button');
        const raw = e.target;
        const el = raw.nodeType === Node.TEXT_NODE ? raw.parentElement : raw; // Text면 부모 Element로 승격
        const button = el?.closest?.('.exam-floating-button');
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
        if (context.isMobileDevice || context.isSmallResolution) {
            context.hideChat();
        }
    });
};


