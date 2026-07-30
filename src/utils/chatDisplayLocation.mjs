export const CHAT_DISPLAY_LOCATIONS = new Set([
    'HOME',
    'PRODUCT_LIST',
    'PRODUCT_DETAIL',
]);

export function resolveChatDisplayLocation(bootConfig, fallbackDisplayLocation) {
    const override = bootConfig?.chat?.displayLocation;
    return CHAT_DISPLAY_LOCATIONS.has(override) ? override : fallbackDisplayLocation;
}
