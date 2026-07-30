import test from 'node:test';
import assert from 'node:assert/strict';
import { getBootConfig } from '../src/apis/chatConfig.js';

test('preserves the full current URL in the Boot Config request', async () => {
    const currentUrl = 'https://injurypro.co.kr/18/?q=board&bmode=view&idx=172315019&t=board';
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.API_CHAT_BASE_URL;
    const originalEndpoint = process.env.API_BOOTCONFIG_ENDPOINT;
    let requestedUrl;

    process.env.API_CHAT_BASE_URL = 'https://api.example.com/chat';
    process.env.API_BOOTCONFIG_ENDPOINT = '/api/sdk/boot';
    globalThis.fetch = async (url) => {
        requestedUrl = url;
        return { json: async () => ({}) };
    };

    try {
        await getBootConfig(
            'chat-user',
            currentUrl,
            'PRODUCT_DETAIL',
            '172315019',
            'partner-id',
        );

        const requestUrl = new URL(requestedUrl);
        assert.equal(requestUrl.searchParams.get('url'), currentUrl);
        assert.equal(requestUrl.searchParams.get('displayLocation'), 'PRODUCT_DETAIL');
        assert.equal(requestUrl.searchParams.get('itemId'), '172315019');
    } finally {
        globalThis.fetch = originalFetch;
        if (originalBaseUrl === undefined) delete process.env.API_CHAT_BASE_URL;
        else process.env.API_CHAT_BASE_URL = originalBaseUrl;
        if (originalEndpoint === undefined) delete process.env.API_BOOTCONFIG_ENDPOINT;
        else process.env.API_BOOTCONFIG_ENDPOINT = originalEndpoint;
    }
});
