import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteViewport, injectViewport } from '../src/utils/floatingSdkUtils.js';

function createElement() {
    const attributes = new Map();
    return {
        name: '',
        content: '',
        parentNode: null,
        setAttribute(name, value) {
            attributes.set(name, value);
        },
        getAttribute(name) {
            return attributes.get(name) ?? null;
        },
        remove() {
            this.parentNode?.removeChild(this);
        },
    };
}

function createDocument() {
    const hostViewport = createElement();
    hostViewport.name = 'viewport';
    hostViewport.content = 'width=device-width, initial-scale=1';

    const children = [];
    const head = {
        appendChild(element) {
            element.parentNode = this;
            children.push(element);
        },
        removeChild(element) {
            const index = children.indexOf(element);
            if (index !== -1) children.splice(index, 1);
            element.parentNode = null;
        },
    };
    head.appendChild(hostViewport);

    return {
        children,
        head,
        hostViewport,
        document: {
            head,
            createElement,
            querySelector(selector) {
                if (selector === 'meta[name="viewport"][data-gentoo-injected="true"]') {
                    return children.find((element) =>
                        element.name === 'viewport'
                        && element.getAttribute('data-gentoo-injected') === 'true'
                    ) ?? null;
                }
                return null;
            },
        },
    };
}

test('preserves the host viewport node through chat open and close', () => {
    const { children, document, hostViewport } = createDocument();
    const context = { viewportInjected: false, injectedViewport: null };

    injectViewport(context, document);
    injectViewport(context, document);

    assert.equal(children[0], hostViewport);
    assert.equal(hostViewport.parentNode, document.head);
    assert.equal(children.length, 2);
    assert.equal(context.injectedViewport, children[1]);

    deleteViewport(context, document);

    assert.deepEqual(children, [hostViewport]);
    assert.equal(hostViewport.parentNode, document.head);
    assert.equal(context.injectedViewport, null);
    assert.equal(context.viewportInjected, false);
});
