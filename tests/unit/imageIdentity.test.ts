import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageIdentity } from '../../src/utils/imageIdentity.js';

test('same image resized by a CDN has the same identity', () => {
  assert.equal(imageIdentity('https://images.unsplash.com/photo-example?auto=format&fit=crop&w=100&q=80'),
    imageIdentity('https://images.unsplash.com/photo-example?q=90&w=800&fit=crop&auto=format'));
});
test('different source files and image identifiers remain distinct', () => {
  assert.notEqual(imageIdentity('/logo.png'), imageIdentity('/cover.png'));
  assert.notEqual(imageIdentity('/image?id=logo&w=100'), imageIdentity('/image?id=cover&w=100'));
});
