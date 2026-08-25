import test from 'node:test';
import assert from 'node:assert/strict';
import { findCustomButton, routeCustomButtonClick } from '../src/utils/customButton.mjs';

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

test('queues a custom button click until the active instance is ready', () => {
    const customButton = {};
    const target = { closest: () => customButton };
    const instance = {};

    assert.equal(routeCustomButtonClick(target, undefined, {}), 'queued');
    assert.equal(routeCustomButtonClick(target, instance, {}), 'queued');
    assert.equal(instance.customButton, customButton);
    assert.equal(instance.pendingCustomButtonClick, true);
});

test('routes a replaced custom button click to the active instance', () => {
    const customButton = {};
    const event = {};
    let receivedEvent;
    const instance = {
        customButtonReadyHandler(value) {
            receivedEvent = value;
        },
    };

    assert.equal(
        routeCustomButtonClick({ closest: () => customButton }, instance, event),
        'handled',
    );
    assert.equal(instance.customButton, customButton);
    assert.equal(receivedEvent, event);
});
