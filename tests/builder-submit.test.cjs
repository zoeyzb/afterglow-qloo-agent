'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareSignalAddition, prepareAtlasSubmission } = require('../src/lib/builder-submit.cjs');

const signals = [
  { id: 'one', domain: 'film', name: 'Interstellar' },
  { id: 'two', domain: 'music', name: 'Khruangbin' }
];

test('pending favorite is included in the submission signal list', () => {
  const result = prepareSignalAddition(signals, '  Piranesi  ', 'book', 5, () => 'three');
  assert.equal(result.status, 'ready');
  assert.equal(result.name, 'Piranesi');
  assert.deepEqual(result.signals, [...signals, { id: 'three', domain: 'book', name: 'Piranesi' }]);
});

test('pending favorite detects case-insensitive duplicates in the same domain', () => {
  const result = prepareSignalAddition(signals, ' interstellar ', 'film', 5, () => 'unused');
  assert.equal(result.status, 'duplicate');
  assert.deepEqual(result.signals, signals);
});

test('same title in a different domain remains a valid signal', () => {
  const result = prepareSignalAddition(signals, 'Interstellar', 'book', 5, () => 'three');
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.signals.at(-1), { id: 'three', domain: 'book', name: 'Interstellar' });
});

test('blank input does not create a signal', () => {
  const result = prepareSignalAddition(signals, '  ', 'book', 5, () => 'unused');
  assert.equal(result.status, 'empty');
  assert.deepEqual(result.signals, signals);
});

test('capacity is enforced before adding a pending signal', () => {
  const full = [...signals, ...Array.from({ length: 3 }, (_, i) => ({ id: String(i), domain: 'book', name: `Book ${i}` }))];
  const result = prepareSignalAddition(full, 'One more', 'film', 5, () => 'unused');
  assert.equal(result.status, 'full');
  assert.deepEqual(result.signals, full);
});


test('Find my matches includes the typed favorite in the actual atlas request', () => {
  const result = prepareAtlasSubmission({
    signals: [signals[0]], text: '  Khruangbin  ', domain: 'music',
    lenses: ['destination'], orbit: 'near', minSignals: 2, maxSignals: 5,
    createId: () => 'two'
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.added, true);
  assert.deepEqual(result.request, {
    signals: [{ domain: 'film', name: 'Interstellar' }, { domain: 'music', name: 'Khruangbin' }],
    lenses: ['destination'], orbit: 'near'
  });
});

test('Find my matches does not silently submit a duplicate favorite', () => {
  const result = prepareAtlasSubmission({
    signals, text: 'INTERSTELLAR', domain: 'film', lenses: ['destination'], orbit: 'near',
    createId: () => 'unused'
  });
  assert.equal(result.status, 'duplicate');
  assert.equal(result.request, undefined);
  assert.deepEqual(result.signals, signals);
});

test('Find my matches still requires two favorites when the pending text is blank', () => {
  const result = prepareAtlasSubmission({
    signals: [signals[0]], text: '  ', domain: 'book', lenses: ['destination'], orbit: 'near'
  });
  assert.equal(result.status, 'minimum');
  assert.equal(result.request, undefined);
});

test('Find my matches requires a discovery lens', () => {
  const result = prepareAtlasSubmission({ signals, text: '', domain: 'book', lenses: [], orbit: 'near' });
  assert.equal(result.status, 'no_lenses');
  assert.equal(result.request, undefined);
});
