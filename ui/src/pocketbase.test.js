import test from 'node:test';
import assert from 'node:assert/strict';
import { getPocketBaseUrl } from './pocketbase.js';

test('getPocketBaseUrl returns fallback default when no env or global is set', () => {
    const url = getPocketBaseUrl();
    assert.match(url, /^https?:\/\//);
});
