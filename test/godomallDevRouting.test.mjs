import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const source = readFileSync(new URL('../sdk-godomall.js', import.meta.url), 'utf8');
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
    test(name, () => {
        const inserted = [];
        const listeners = {};
        const document = {
            currentScript: origin ? { src: `${origin}/sdk-godomall.js?v=qa` } : null,
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
        const target = modal ? 'godomall-modal' : 'godomall';
        assert.equal(inserted.length, 1);
        assert.equal(inserted[0].src, `${expected}/dist/${target}/floating-${target}.js`);
        assert.equal(inserted[0].async, true);
        assert.deepEqual(Array.from(sandbox.GentooIO.q, (args) => args[0]), ['boot', 'init']);
        assert.equal(sandbox.GentooIO.q[0][1].partnerType, 'godomall');
    });
}
