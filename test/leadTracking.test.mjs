import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLeadDeviceType, resolveLeadTracking } from '../src/utils/leadTracking.mjs';

test('keeps session acquisition data and updates SPA conversion pages', () => {
    const firstPage = resolveLeadTracking(
        undefined,
        { pathname: '/landing', search: '?gclid=google-click-id' },
        'https://www.google.com/',
    );
    const conversionPage = resolveLeadTracking(
        firstPage,
        { pathname: '/office/yeoksam', search: '' },
        '',
    );

    assert.deepEqual(conversionPage, {
        landing: '/landing',
        conversionPage: '/office/yeoksam',
        prevConversionPage: '/landing',
        referrer: 'https://www.google.com/',
        gclid: 'google-click-id',
    });
});

test('classifies supported FastFive lead device types', () => {
    assert.equal(resolveLeadDeviceType({ userAgent: 'Mozilla/5.0 (iPhone; Mobile)' }), 'mobile');
    assert.equal(resolveLeadDeviceType({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Tablet)' }), 'tablet');
    assert.equal(resolveLeadDeviceType({ userAgent: 'Mozilla/5.0', platform: 'MacIntel', maxTouchPoints: 5 }), 'tablet');
    assert.equal(resolveLeadDeviceType({ userAgent: 'Mozilla/5.0 (Macintosh)' }), 'pc');
});
