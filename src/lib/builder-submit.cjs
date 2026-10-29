'use strict';

function prepareSignalAddition(signals, text, domain, maxSignals = 5, createId = () => 'pending') {
  const name = String(text ?? '').trim().slice(0, 80);
  if (!name) return { status: 'empty', name: '', signals };
  if (signals.length >= maxSignals) return { status: 'full', name, signals };
  if (signals.some(signal => signal.domain === domain && signal.name.toLowerCase() === name.toLowerCase())) {
    return { status: 'duplicate', name, signals };
  }
  return { status: 'ready', name, signals: [...signals, { id: createId(), domain, name }] };
}

function prepareAtlasSubmission({ signals, text, domain, lenses, orbit, minSignals = 2, maxSignals = 5, createId }) {
  const addition = prepareSignalAddition(signals, text, domain, maxSignals, createId);
  if (addition.status === 'full' || addition.status === 'duplicate') {
    return { status: addition.status, signals, added: false };
  }
  const submissionSignals = addition.status === 'ready' ? addition.signals : signals;
  const added = addition.status === 'ready';
  if (submissionSignals.length < minSignals) return { status: 'minimum', signals: submissionSignals, added };
  if (!Array.isArray(lenses) || lenses.length === 0) return { status: 'no_lenses', signals: submissionSignals, added };
  return {
    status: 'ready',
    signals: submissionSignals,
    added,
    request: {
      signals: submissionSignals.map(({ domain: signalDomain, name }) => ({ domain: signalDomain, name })),
      lenses,
      orbit
    }
  };
}

module.exports = { prepareSignalAddition, prepareAtlasSubmission };
