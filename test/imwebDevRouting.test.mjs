import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const source = readFileSync(new URL('../sdk-imweb.js', import.meta.url), 'utf8');
const devOrigin = 'https://dev-sdk.gentooai.com';
const prodOrigin = 'https://sdk.gentooai.com';

for (const [name, origin, expected, userAgent, width, readyState, laterOrigin] of [
    ['dev desktop survives deferred load', devOrigin, devOrigin],
    ['dev mobile survives deferred load', devOrigin, devOrigin, 'iPhone'],
    ['dev narrow viewport selects modal', devOrigin, devOrigin, 'desktop', 600],
    ['dev immediate load', devOrigin, devOrigin, 'desktop', 1024, 'complete'],
    ['prod desktop ignores a later dev script', prodOrigin, prodOrigin, 'desktop', 1024, 'loading', devOrigin],
    ['prod mobile stays production', prodOrigin, prodOrigin, 'Android'],
    ['lookalike suffix stays production', `${devOrigin}.example.com`, prodOrigin],
    ['lookalike prefix stays production', 'https://other-dev-sdk.gentooai.com', prodOrigin],
    ['HTTP stays production', 'http://dev-sdk.gentooai.com', prodOrigin],
    ['alternate port stays production', `${devOrigin}:8443`, prodOrigin],
    ['missing current script retains fallback', null, prodOrigin],
    ['stage retains existing production fallback', 'https://stage-sdk.gentooai.com', prodOrigin],
]) {
    test(`Imweb: ${name}`, () => {
        const inserted = [];
        const listeners = {};
        const document = {
            currentScript: origin ? { src: `${origin}/sdk-imweb.js?v=qa` } : null,
            readyState: readyState ?? 'loading',
            createElement: () => ({}),
            getElementsByTagName: () => [{ parentNode: { insertBefore: (script) => inserted.push(script) } }],
        };
        const sandbox = {
            document, URL, console,
            navigator: { userAgent: userAgent ?? 'desktop' },
            innerWidth: width ?? 1024,
            addEventListener: (name, callback) => { listeners[name] = callback; },
        };
        sandbox.window = sandbox;
        runInContext(source, createContext(sandbox));
        document.currentScript = laterOrigin ? { src: `${laterOrigin}/other.js` } : null;
        listeners.DOMContentLoaded?.();
        listeners.load?.();

        const modal = /iPhone|iPad|iPod|Android/i.test(sandbox.navigator.userAgent) || sandbox.innerWidth < 601;
        const target = modal ? 'imweb-modal' : 'imweb';
        assert.equal(inserted.length, 1);
        assert.equal(inserted[0].src, `${expected}/dist/${target}/floating-${target}.js`);
        assert.equal(inserted[0].async, true);
        assert.deepEqual(Array.from(sandbox.GentooIO.q, (args) => args[0]), ['boot', 'init']);
        assert.equal(sandbox.GentooIO.q[0][1].partnerType, 'imweb');
    });
}

for (const target of ['imweb', 'imweb-modal']) {
    test(`Imweb dev build: ${target} embeds complete dev configuration`, async () => {
        const bundle = readFileSync(new URL(`../dist/${target}/floating-${target}.js`, import.meta.url), 'utf8');
        for (const required of [
            '/api/partner/v1/imweb/mall',
            'https://dev-api.gentooai.com',
            'https://dev-tracking.gentooai.com',
            'https://dev-demo.gentooai.com',
            'tryApplyStyle(dotLottiePlayer, retries - 1)',
        ]) {
            assert.ok(bundle.includes(required), `${target} missing ${required}; run npm run build:dev`);
        }
        assert.equal((bundle.match(/process\.env\.API_\w+/g) ?? []).length, 0, 'Unreplaced API environment reference');
        assert.ok(!bundle.includes('tryApplyStyle(retries - 1)'), 'Old avatar retry bug remains');

        const modules = Array.from(bundle.matchAll(/\beval\(("(?:[^"\\]|\\.)*")\)/g), (match) => JSON.parse(match[1]));
        const api = modules.find((code) => /\/\/# sourceURL=[^\n]+\/src\/apis\/chatConfig\.js\?/.test(code));
        assert.ok(api, 'Missing compiled Chat API module');
        const exports = {};
        const requests = [];
        runInContext(api, createContext({
            __webpack_exports__: exports,
            __webpack_require__: {
                r() {},
                d(object, getters) {
                    for (const [name, get] of Object.entries(getters)) Object.defineProperty(object, name, { get });
                },
            },
            console,
            fetch: async (url) => {
                requests.push(url);
                return { json: async () => ({ partnerId: 'synthetic-partner' }) };
            },
        }));
        assert.equal(await exports.getImwebPartnerId('synthetic-unit'), 'synthetic-partner');
        assert.deepEqual(requests, ['https://dev-api.gentooai.com/app/api/partner/v1/imweb/mall/synthetic-unit']);
    });
}
