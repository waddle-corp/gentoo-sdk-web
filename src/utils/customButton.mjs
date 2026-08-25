const CUSTOM_BUTTON_SELECTOR = '#gentoo-custom-button, .gentoo-custom-button';

export function findCustomButton(target) {
    return target?.closest?.(CUSTOM_BUTTON_SELECTOR) || null;
}
