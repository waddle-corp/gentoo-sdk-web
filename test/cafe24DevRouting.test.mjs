import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const source = readFileSync(process.env.CAFE24_SDK_SOURCE ?? new URL('../floating-button-sdk-cafe24.js', import.meta.url), 'utf8');
const scriptPath = '/floating-button-sdk-cafe24.js';
const devOrigin = 'https://dev-sdk.gentooai.com';
const prodOrigin = 'https://sdk.gentooai.com';
const qaHostname = 'waddlelab.cafe24.com';

test('Cafe24 avatar callback invokes the instance canvas fitter', (t) => {
    const frames = [];
    const createElement = () => ({
        style: {},
        setAttribute() {},
        appendChild(child) { child.parentNode = this; },
    });
    const document = {
        currentScript: { src: `${devOrigin}${scriptPath}` },
        querySelector: () => null,
        createElement,
        createTextNode: () => ({}),
        head: createElement(),
        body: createElement(),
    };
    const window = {};
    window.top = window;
    const context = createContext({
        window, document, URL,
        requestAnimationFrame: (callback) => frames.push(callback),
        setTimeout() {},
    });
    runInContext(source, context);
    const instance = Object.create(window.FloatingButton.prototype);
    Object.assign(instance, {
        chatUrl: `${devOrigin}/synthetic-chat`,
        chatbotData: { position: {}, mobilePosition: {} },
        bootConfig: { floating: { button: { imageUrl: 'qa-avatar.lottie' } } },
        gentooSessionData: {},
        logEvent() {},
        logEventLegacy() {},
        updateFloatingContainerPosition() {},
        setupEventListeners() {},
        applyCanvasObjectFit: t.mock.fn(function (player) {
            assert.equal(this, instance);
            assert.equal(player, instance.dotLottiePlayer);
        }),
    });

    instance.createUIElements({}, true);
    assert.equal(instance.iframeContainer.parentNode, document.body);
    assert.equal(instance.dotLottiePlayer.parentNode, instance.floatingContainer);
    assert.equal(instance.applyCanvasObjectFit.mock.callCount(), 0);
    frames.forEach((callback) => callback());
    assert.equal(instance.applyCanvasObjectFit.mock.callCount(), 1);
});

for (const [name, scriptOrigin, hostname, expected, laterOrigin] of [
    ['dev CDN survives deferred boot on waddlelab', devOrigin, qaHostname, 'dev-'],
    ['dev CDN survives another current script', devOrigin, qaHostname, 'dev-', prodOrigin],
    ['prod CDN retains prod routing', prodOrigin, qaHostname, ''],
    ['later dev script cannot change prod routing', prodOrigin, qaHostname, '', devOrigin],
    ['lookalike suffix is not dev', `${devOrigin}.example.com`, qaHostname, ''],
    ['lookalike prefix is not dev', 'https://other-dev-sdk.gentooai.com', qaHostname, ''],
    ['HTTP is not the trusted dev origin', 'http://dev-sdk.gentooai.com', qaHostname, ''],
    ['alternate port is not the trusted dev origin', `${devOrigin}:8443`, qaHostname, ''],
    ['missing script retains prod fallback', null, qaHostname, ''],
    ['stage CDN retains merchant routing', 'https://stage-sdk.gentooai.com', qaHostname, ''],
    ['existing stage hostname retains stage routing', prodOrigin, 'stage-demo.gentooai.com', 'stage-'],
    ['existing localhost retains local iframe', prodOrigin, 'localhost', 'dev-'],
    ['dev CDN retains localhost iframe', devOrigin, 'localhost', 'dev-'],
    ['existing dev demo retains dev routing', prodOrigin, 'dev-demo.gentooai.com', 'dev-'],
    ...['kickthefence', 'y6company', 'jintaebaek'].map((mall) =>
        [`existing ${mall} routing is unchanged`, prodOrigin, `${mall}.cafe24.com`, 'dev-']),
]) {
    test(name, async () => {
        const requests = [];
        const clientInitializations = [];
        const document = {
            currentScript: scriptOrigin ? { src: `${scriptOrigin}${scriptPath}?v=qa` } : null,
            querySelector: () => null,
            createElement: () => ({}),
            head: { appendChild() {} },
        };
        const window = { location: new URL(`https://${hostname}/`), innerWidth: 1024 };
        window.top = window;
        const context = createContext({
            window, document, URL, URLSearchParams, console,
            navigator: { userAgent: 'test' },
            sessionStorage: { getItem: () => null, setItem() {} },
            CAFE24API: { init(config) {
                clientInitializations.push({ ...config });
                return {
                    MALL_ID: 'waddlelab',
                    getCustomerIDInfo: (callback) => callback(null, { id: { guest_id: 'qa-guest' } }),
                };
            } },
            fetch: async (url) => {
                requests.push(new URL(url));
                return { json: async () => ({
                    partnerId: 'qa-partner', chatUserId: 'qa-user', experimentalData: [],
                }) };
            },
        });
        runInContext(source, context);
        await Promise.resolve();
        document.currentScript = laterOrigin ? { src: `${laterOrigin}${scriptPath}` } : null;
        const instance = runInContext('new FloatingButton({ partnerType: "cafe24" })', context);
        await instance.bootPromise;
        await instance.logEvent({ eventCategory: 'qa-test' });
        await instance.logEventLegacy({ eventCategory: 'qa-test' });

        const api = `https://${expected}api.gentooai.com`;
        assert.equal(instance.hostSrc, hostname === 'localhost'
            ? 'http://localhost:3000' : `https://${expected}demo.gentooai.com`);
        assert.deepEqual({ ...instance.domains }, {
            auth: `${api}/chat/api/v1/user`,
            log: `${api}/chat/api/v1/event/log`,
            logLegacy: `${api}/chat/api/v1/event/userEvent`,
            chatbot: `${api}/chat/api/v1/chat/chatbot`,
            floating: `${api}/chat/api/v1/chat/floating`,
            partnerId: `${api}/app/api/partner/v1/cafe24/mall`,
            cafe24Utils: `${api}/chat/api/cafe24/utils`,
            bootConfig: `${api}/chat/api/sdk/boot`,
        });
        assert.deepEqual(clientInitializations, [{
            client_id: expected === 'dev-' ? 'ckUs4MK3KhZixizocrCmTA' : 'QfNlFJBPD6mXVWkE8MybWD',
            version: '2024-09-01',
        }]);
        assert.equal(instance.partnerId, 'qa-partner');
        assert.equal(instance.chatUserId, 'qa-user');
        assert.deepEqual(requests.map((url) => url.pathname), [
            '/app/api/partner/v1/cafe24/mall/waddlelab',
            '/chat/api/v1/user',
            '/chat/api/v1/chat/chatbot/qa-partner',
            '/chat/api/sdk/boot',
            '/chat/api/v1/event/log/qa-partner',
            '/chat/api/v1/event/userEvent/qa-partner',
        ]);
        assert.ok(requests.every((url) => url.origin === api));
    });
}
