import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const wrapper = readFileSync(new URL('../sdk-cafe24-path.js', import.meta.url), 'utf8');
const bootstrap = readFileSync(new URL('../sdk-cafe24.js', import.meta.url), 'utf8');
const path = '/event/2026bfday_ager.html';

function page({ pathname = path, search = '?product_no=2178', configuredPrefix = '/event/', readyState = 'complete', mobile = false, existing = false, origin = 'https://sdk.gentooai.com' } = {}) {
    const events = {};
    const scripts = [];
    const currentScript = { src: `${origin}/sdk-cafe24-path.js?path_prefix=${encodeURIComponent(configuredPrefix)}&client_id=example` };
    if (existing) scripts.push({ src: 'https://sdk.gentooai.com/sdk-cafe24.js?client_id=example' });
    const document = {
        currentScript,
        baseURI: 'https://themedicube.co.kr/',
        readyState,
        createElement: () => ({ dataset: {} }),
        getElementsByTagName: () => scripts,
        querySelector: () => scripts.find((script) => script.dataset?.gentooCafe24PathLoader),
        head: { appendChild: (script) => scripts.push(script) },
    };
    const window = {
        document,
        location: { pathname, search },
        innerWidth: mobile ? 390 : 1280,
        console,
        addEventListener: (name, fn) => (events[name] ||= []).push(fn),
    };
    window.window = window;
    window.URL = URL;
    window.navigator = { userAgent: mobile ? 'iPhone' : 'Desktop' };
    const context = vm.createContext(window);
    return {
        scripts, window, document, context,
        run: () => vm.runInContext(wrapper, context),
        load: () => { document.readyState = 'complete'; for (const fn of events.load || []) fn(); },
        boot: () => {
            scripts[0].parentNode = { insertBefore: (script) => scripts.push(script) };
            vm.runInContext(bootstrap, context);
        },
    };
}

test('loads on the configured directory and its descendants regardless of page query', () => {
    for (const pathname of ['/event/', path, '/event/2026bfday_beauty.html', '/event/list.html', '/event/archive/offer.html']) {
        const p = page({ pathname });
        p.run();
        assert.equal(p.scripts.length, 1);
        assert.equal(p.scripts[0].src, 'https://sdk.gentooai.com/sdk-cafe24.js');
    }
    const custom = page({ pathname: '/promo/list.html', configuredPrefix: '/promo/' });
    custom.run();
    assert.equal(custom.scripts.length, 1);
});

test('skips unrelated paths and rejects missing or overly broad configuration', () => {
    for (const pathname of ['/event', '/events/list.html', '/event-old/offer.html', '/shopinfo/event/list.html', '/shopinfo/membership.html']) {
        const p = page({ pathname, search: '?next=/event/list.html' });
        p.run();
        assert.equal(p.scripts.length, 0);
    }
    for (const configuredPrefix of ['', '/', '/event', 'https://example.com/event/', '/event/other/']) {
        const p = page({ configuredPrefix });
        p.run();
        assert.equal(p.scripts.length, 0);
    }
});

test('loads the dev bootstrap only from the dev CDN and respects an existing bootstrap', () => {
    const origin = 'https://dev-sdk.gentooai.com';
    const dev = page({ origin });
    dev.run();
    assert.equal(dev.scripts[0].src, origin + '/sdk-cafe24.js');

    const existing = page({ origin, existing: true });
    existing.run();
    assert.equal(existing.scripts.length, 1);

    const lookalike = page({ origin: 'https://dev-sdk.gentooai.com.example.com' });
    lookalike.run();
    assert.equal(lookalike.scripts[0].src, 'https://sdk.gentooai.com/sdk-cafe24.js');
});

test('waits for load when injected during loading or interactive state', () => {
    for (const readyState of ['loading', 'interactive']) {
        const p = page({ readyState }); p.run(); assert.equal(p.scripts.length, 0);
        p.load(); assert.equal(p.scripts.length, 1);
        p.boot(); assert.equal(p.scripts.length, 2);
        assert.equal(p.window.GentooIO.q.length, 2);
    }
});

test('existing or repeated loader does not insert a duplicate', () => {
    const existing = page({ existing: true }); existing.run(); assert.equal(existing.scripts.length, 1);
    const repeated = page(); repeated.run(); repeated.run(); assert.equal(repeated.scripts.length, 1);
    const queued = page({ readyState: 'interactive' }); queued.run(); queued.run(); queued.load(); assert.equal(queued.scripts.length, 1);
    const initialized = page(); initialized.window.GentooIO = () => {}; initialized.run(); assert.equal(initialized.scripts.length, 0);
    const unrelated = page(); unrelated.scripts.push({ src: 'https://other.example/sdk-cafe24.js' }); unrelated.run(); assert.equal(unrelated.scripts.length, 2);
    const missing = page(); missing.document.currentScript = null; missing.run(); assert.equal(missing.scripts.length, 0);
});

test('existing SDK selects its desktop and mobile scripts and queues boot and init', () => {
    for (const [mobile, suffix] of [[false, '/floating-button-sdk-cafe24.js'], [true, '/dist/cafe24-modal/floating-cafe24-modal.js']]) {
        const p = page({ mobile }); p.run(); p.boot();
        assert.equal(p.scripts.length, 2);
        assert.ok(p.scripts[1].src.endsWith(suffix));
        assert.deepEqual(Array.from(p.window.GentooIO.q, (args) => args[0]), ['boot', 'init']);
    }
});
