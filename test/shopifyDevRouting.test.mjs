import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const source = readFileSync(new URL('../floating-button-sdk-shopifyTest.js', import.meta.url), 'utf8');
const scriptPath = '/floating-button-sdk-shopifyTest.js';
const qaHostname = 'arbitrary-qa.myshopify.com';

for (const [name, scriptHost, hostname, expected, laterScript] of [
    ['dev CDN survives deferred boot', 'dev-sdk.gentooai.com', qaHostname, 'dev-', null],
    ['dev CDN survives another current script', 'dev-sdk.gentooai.com', qaHostname, 'dev-', { src: `https://sdk.gentooai.com${scriptPath}` }],
    ['prod CDN retains prod routing', 'sdk.gentooai.com', qaHostname, ''],
    ['lookalike suffix is not dev', 'dev-sdk.gentooai.com.example.com', qaHostname, ''],
    ['lookalike prefix is not dev', 'other-dev-sdk.gentooai.com', qaHostname, ''],
    ['missing script retains prod fallback', null, qaHostname, ''],
    ['existing stage merchant retains stage routing', 'sdk.gentooai.com', 'stage-demo.gentooai.com', 'stage-'],
    ['existing dev merchant retains dev routing', 'sdk.gentooai.com', 'gentoo-bom-shop3.myshopify.com', 'dev-'],
]) {
    test(name, async () => {
        const requests = [];
        const document = {
            currentScript: scriptHost ? { src: `https://${scriptHost}${scriptPath}?v=qa` } : null,
            querySelector: () => null,
            createElement: () => ({}),
            head: { appendChild() {} },
        };
        const window = {
            location: new URL(`https://${hostname}/`),
            innerWidth: 1024,
            addEventListener() {},
        };
        window.top = window;
        const context = createContext({
            window, document, URL, URLSearchParams, console,
            navigator: { userAgent: 'test' },
            sessionStorage: { getItem: () => null, setItem() {} },
            fetch: async (url) => {
                requests.push(url);
                return { json: async () => ({
                    success: true, data: { status: 'success' },
                    chatUserId: 'qa-user', experimentalData: [],
                }) };
            },
        });
        runInContext(source, context);
        await Promise.resolve();
        document.currentScript = laterScript ?? null;
        const instance = runInContext('new FloatingButton({ partnerId: "qa", authCode: "qa" })', context);
        await instance.bootPromise;

        const api = `https://${expected}api.gentooai.com`;
        assert.equal(instance.hostSrc, `https://${expected}demo.gentooai.com`);
        assert.deepEqual({ ...instance.domains }, {
            auth: `${api}/chat/api/v1/user`,
            log: `${api}/chat/api/v1/event/log`,
            logLegacy: `${api}/chat/api/v1/event/userEvent`,
            chatbot: `${api}/chat/api/v1/chat/chatbot`,
            floating: `${api}/chat/api/v1/chat/floating`,
            console: api,
        });
        assert.equal(requests.length, 3);
        assert.ok(requests.every((url) => new URL(url).origin === api));
    });
}
