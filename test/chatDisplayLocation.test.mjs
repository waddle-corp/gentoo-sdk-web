import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveChatDisplayLocation } from '../src/utils/chatDisplayLocation.mjs';

test('uses a supported Admin chat display-location override', () => {
    for (const displayLocation of ['HOME', 'PRODUCT_LIST', 'PRODUCT_DETAIL']) {
        assert.equal(
            resolveChatDisplayLocation(
                { chat: { displayLocation } },
                'PRODUCT_DETAIL',
            ),
            displayLocation,
        );
    }
});

test('keeps the SDK classification when the override is absent', () => {
    assert.equal(
        resolveChatDisplayLocation({}, 'PRODUCT_DETAIL'),
        'PRODUCT_DETAIL',
    );
});

test('keeps the SDK classification for a custom display-location value', () => {
    assert.equal(
        resolveChatDisplayLocation(
            { chat: { displayLocation: 'PRODUCT_DETAIL_SD' } },
            'PRODUCT_DETAIL',
        ),
        'PRODUCT_DETAIL',
    );
});
