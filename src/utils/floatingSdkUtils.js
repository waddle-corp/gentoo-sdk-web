export function updateFloatingContainerPosition(context, position) {
    if (context.floatingContainer) {
        const directions = ['top', 'bottom', 'left', 'right'];
        const platformPos = context.isSmallResolution ? position?.mobile : position?.web;
        const fallback = context.isSmallResolution ? context.chatbotData.mobilePosition : context.chatbotData.position;

        directions.forEach((dir) => {
            const value = platformPos?.[dir] ?? fallback?.[dir];
            context.floatingContainer.style[dir] = value != null ? `${value}px` : 'auto';
        });
    }
}

export function updateIframeHeightByFooter(context) {
    if (!context?.warningActivated || !context?.iframe || !context?.footer || !context?.chatHeader) return;

    const headerHeight = context.chatHeader.offsetHeight || (context.isSmallResolution ? 44 : 56);
    const footerHeight = context.footer.offsetHeight;

    if (!footerHeight) {
        requestAnimationFrame(() => updateIframeHeightByFooter(context));
        return;
    }

    context.iframe.style.height = `calc(100% - ${headerHeight + footerHeight}px)`;
}

export function setupWarningLayoutObserver(context, document) {
    if (!context?.warningActivated || !context?.footer || !context?.chatHeader) return;

    if (context.warningLayoutObserver) {
        context.warningLayoutObserver.disconnect();
    }

    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => updateIframeHeightByFooter(context));
        observer.observe(context.footer);
        observer.observe(context.chatHeader);
        if (context.footerText) observer.observe(context.footerText);
        context.warningLayoutObserver = observer;
    }

    if (document?.fonts?.ready) {
        document.fonts.ready
            .then(() => updateIframeHeightByFooter(context))
            .catch(() => {});
    }

    requestAnimationFrame(() => updateIframeHeightByFooter(context));
    setTimeout(() => updateIframeHeightByFooter(context), 120);
    setTimeout(() => updateIframeHeightByFooter(context), 320);
}

export function addLetter(context, floatingMessage, expandedText, isDestroyed, i = 0) {
    if (!floatingMessage || floatingMessage.length === 0) return;
    context.floatingMessage = floatingMessage;
    if (i < floatingMessage.length && !isDestroyed()) {
        expandedText.innerText += floatingMessage[i];
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

// Pinned version for Shopify - v0.9.0+ breaks due to bare import of lit/decorators.js
export async function injectLottiePinned(document) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.3/dist/dotlottie-wc.js';
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

// Function to apply object-fit: cover to canvas in shadow-root
export function applyCanvasObjectFit(dotLottiePlayer) {
    if (!dotLottiePlayer) return;

    const tryApplyStyle = (dotLottiePlayer, retries = 10) => {
        if (retries <= 0) {
            console.warn('Failed to apply object-fit to dotLottiePlayer canvas: shadowRoot not ready');
            return;
        }

        const shadowRoot = dotLottiePlayer.shadowRoot;
        if (shadowRoot) {
            const canvas = shadowRoot.querySelector('canvas');
            if (canvas) {
                canvas.style.objectFit = 'cover';
                canvas.style.width = '100%';
                canvas.style.height = '100%';
            } else {
                // Canvas might not be ready yet, retry
                setTimeout(() => tryApplyStyle(retries - 1), 50);
            }
        } else {
            // ShadowRoot not ready yet, retry
            setTimeout(() => tryApplyStyle(retries - 1), 50);
        }
    };

    // Wait for shadowRoot to be ready
    requestAnimationFrame(() => {
        tryApplyStyle(dotLottiePlayer);
    });
}