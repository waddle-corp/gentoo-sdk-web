import test from 'node:test';
import assert from 'node:assert/strict';
import { findCustomButton } from '../src/utils/customButton.mjs';

test('finds a replaced custom button from a nested click target', () => {
    const customButton = {};
    const target = {
        closest(selector) {
            assert.equal(selector, '#gentoo-custom-button, .gentoo-custom-button');
            return customButton;
        },
    };

    assert.equal(findCustomButton(target), customButton);
});

test('ignores clicks outside the custom button', () => {
    assert.equal(findCustomButton({ closest: () => null }), null);
});
