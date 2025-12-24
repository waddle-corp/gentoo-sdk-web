export function updateFloatingContainerPosition(context, position) {
    if (context.floatingContainer) {
        context.floatingContainer.style.bottom = `${context.isSmallResolution
            ? (position?.mobile?.bottom || context.chatbotData.mobilePosition.bottom)
            : (position?.web?.bottom || context.chatbotData.position.bottom)
            }px`;
        context.floatingContainer.style.right = `${context.isSmallResolution
            ? (position?.mobile?.right || context.chatbotData.mobilePosition.right)
            : (position?.web?.right || context.chatbotData.position.right)
            }px`;
    }
}

export function addLetter(context, floatingMessage, expandedText, isDestroyed, i = 0) {
    if (!floatingMessage || floatingMessage.length === 0) return;
    context.floatingMessage = floatingMessage;
    if (i < floatingMessage.length && !isDestroyed()) {
        expandedText.innerText += floatingMessage[i];
        requestAnimationFrame(() => {
            const dotlottie = context.dotLottiePlayer?.dotLottie;
            if (dotlottie) {
                dotlottie.resize();
            }
        });
        setTimeout(() => addLetter(context, floatingMessage, expandedText, isDestroyed, i + 1), 1000 / floatingMessage.length);
    }
}   

export async function injectLottie(document) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js';
        script.onload = () => {
            resolve();
        };
        script.onerror = () => reject(new Error("DotLottiePlayer load failed"));
        document.head.appendChild(script);
    });
}

// Function to inject viewport meta tag
export function injectViewport(context, document) {
    if (context.viewportInjected) return;

    try {
        // Check for existing viewport meta tag
        const existingViewport = document.querySelector('meta[name="viewport"]');
        if (existingViewport) {
            context.originalViewport = existingViewport.cloneNode(true);
            existingViewport.remove();
        }

        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        meta.setAttribute('data-gentoo-injected', 'true');
        document.head.appendChild(meta);
        context.viewportInjected = true;
    } catch (error) {
        console.error('Failed to inject viewport meta tag:', error);
    }
}

// Function to delete viewport meta tag
export function deleteViewport(context, document) {
    if (!context.viewportInjected) return;

    try {
        const meta = document.querySelector('meta[name="viewport"][data-gentoo-injected="true"]');
        if (meta) {
            meta.remove();
        }

        // Restore original viewport tag if it exists
        if (context.originalViewport) {
            document.head.appendChild(context.originalViewport);
            context.originalViewport = null;
        }
    } catch (error) {
        console.error('Failed to delete viewport meta tag:', error);
    } finally {
        context.viewportInjected = false;
    }
}

// Function to log the current window width
export function logWindowWidth(window) {
    const width = window.innerWidth;
    return width;
}

// SDK가 이미 존재하는지 확인
export function checkSDKExists(window, document) {
    const isInIframe = window !== window.top;

    // 현재 document의 SDK set 
    const hasIframeContainer = document.querySelector('div[class^="iframe-container"][data-gentoo-sdk="true"]') !== null;
    const hasFloatingContainer = document.querySelector('div[class^="floating-container"][data-gentoo-sdk="true"]') !== null;

    if (hasIframeContainer || hasFloatingContainer) {
        return true;
    }

    if (isInIframe) {
        try {
            if (window.top.document) {
                if (window.top.__GentooInited !== null && window.top.__GentooInited !== undefined) {
                    return true;
                }

                // 부모 document의 SDK set 
                const parentHasIframeContainer = window.top.document.querySelector('div[class^="iframe-container"][data-gentoo-sdk="true"]') !== null;
                const parentHasFloatingContainer = window.top.document.querySelector('div[class^="floating-container"][data-gentoo-sdk="true"]') !== null;

                return parentHasIframeContainer || parentHasFloatingContainer;
            }
        } catch (e) {
            console.warn("Cannot access parent document due to same-origin policy.");
        }
    }

    return false;
}

export function isAllowedDomainPattern(context, hostname) {
    if (context.allowedDomainsForIframe.includes(hostname)) {
        return true;
    }

    // Check wildcard patterns
    for (const pattern of context.allowedDomainsForIframe) {
        if (pattern.startsWith('*.')) {
            const domain = pattern.substring(2);
            if (hostname.endsWith('.' + domain) || hostname === domain) {
                return true;
            }
        }
    }

    return false;
}

export function isAllowedDomainForIframe(context, window, document) {
    if (isAllowedDomainPattern(context, window.location.hostname)) {
        return true;
    }

    if (window !== window.top) {
        try {
            const parentDomain = window.top.location.hostname;
            if (isAllowedDomainPattern(context, parentDomain)) {
                return true;
            }
        } catch (e) {
            if (document.referrer) {
                try {
                    const referrerUrl = new URL(document.referrer);
                    if (isAllowedDomainPattern(context, referrerUrl.hostname)) {
                        return true;
                    }
                } catch (urlError) {
                    console.warn('Could not parse referrer URL:', document.referrer);
                }
            }
        }
    }
    return false;
}