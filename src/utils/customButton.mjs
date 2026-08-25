const CUSTOM_BUTTON_SELECTOR = '#gentoo-custom-button, .gentoo-custom-button';

export function findCustomButton(target) {
    return target?.closest?.(CUSTOM_BUTTON_SELECTOR) || null;
}

export function routeCustomButtonClick(target, instance, event) {
    const customButton = findCustomButton(target);
    if (!customButton) return 'ignored';
    if (!instance) return 'queued';

    instance.customButton = customButton;
    if (!instance.customButtonReadyHandler) {
        instance.pendingCustomButtonClick = true;
        return 'queued';
    }

    instance.customButtonReadyHandler(event);
    return 'handled';
}
