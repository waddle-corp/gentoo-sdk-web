import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const source = readFileSync(process.env.FLOATING_UTILS_SOURCE ?? new URL('../src/utils/floatingSdkUtils.js', import.meta.url), 'utf8');

for (const readiness of ['ready', 'shadow later', 'canvas later', 'never ready', 'missing player']) {
    test(`avatar canvas: ${readiness}`, () => {
        const frames = [];
        const timers = [];
        const warnings = [];
        const canvas = { style: {} };
        let canvasReady = readiness === 'ready';
        const shadowRoot = { querySelector: () => canvasReady ? canvas : null };
        const player = { shadowRoot: readiness === 'shadow later' || readiness === 'never ready' ? null : shadowRoot };
        const sandbox = {
            requestAnimationFrame: (callback) => frames.push(callback),
            setTimeout: (callback, delay) => { assert.equal(delay, 50); timers.push(callback); },
            console: { warn: (message) => warnings.push(message) },
        };
        const context = createContext(sandbox);
        runInContext(source.replaceAll('export ', ''), context);
        const fit = runInContext('applyCanvasObjectFit', context);
        fit(readiness === 'missing player' ? null : player);
        assert.equal(frames.length, readiness === 'missing player' ? 0 : 1);
        frames.shift()?.();

        if (readiness === 'shadow later' || readiness === 'canvas later') {
            assert.equal(timers.length, 1);
            player.shadowRoot = shadowRoot;
            canvasReady = true;
            timers.shift()();
        }
        if (readiness === 'never ready') {
            let attempts = 0;
            while (timers.length && attempts < 20) {
                timers.shift()();
                attempts++;
            }
            assert.equal(attempts, 10);
            assert.equal(warnings.length, 1);
        } else if (readiness !== 'missing player') {
            assert.deepEqual(canvas.style, { objectFit: 'cover', width: '100%', height: '100%' });
        }
        assert.equal(timers.length, 0);
    });
}
