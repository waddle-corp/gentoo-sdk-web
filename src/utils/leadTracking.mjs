export function resolveLeadDeviceType(navigatorLike = {}) {
    const userAgent = navigatorLike.userAgent || '';
    const isIPadOS = navigatorLike.platform === 'MacIntel' && navigatorLike.maxTouchPoints > 1;
    const isTablet = isIPadOS
        || /iPad|Tablet|PlayBook|Silk/i.test(userAgent)
        || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent));

    if (isTablet) return 'tablet';
    if (/iPhone|iPod|Android|Mobile/i.test(userAgent)) return 'mobile';
    return 'pc';
}

export function resolveLeadTracking(previousTracking = {}, locationLike = {}, referrer = '') {
    const currentPage = locationLike.pathname || '/';
    const searchParams = new URLSearchParams(locationLike.search || '');
    const previousPage = previousTracking.conversionPage;
    const leadTracking = {
        landing: previousTracking.landing || currentPage,
        conversionPage: currentPage,
        prevConversionPage: previousTracking.prevConversionPage || '',
        referrer: previousTracking.referrer ?? referrer ?? '',
        gclid: searchParams.get('gclid') || previousTracking.gclid || '',
    };

    if (previousPage && previousPage !== currentPage) {
        leadTracking.prevConversionPage = previousPage;
    }

    return leadTracking;
}
