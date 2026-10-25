import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DOMAINS, DOMAIN_MAP, EXAMPLE_SETS, LIMITS, type DomainId, type SignalDraft } from '../lib/domains';
import type { AtlasRequest, Orbit } from '../lib/types';
import type { LiveStatus } from '../lib/api';
import { Eyebrow, Reveal } from './ui';

interface Props {
  busy: boolean;
  status: LiveStatus;
  example: { id: string; nonce: number } | null;
  onSubmit: (request: AtlasRequest) => void;
  onSample: () => void;
}

const LENS_PREFERENCE: DomainId[] = ['destination', 'dining', 'music', 'film', 'book', 'tv', 'podcast', 'game', 'creator', 'brand'];
let uid = 0;
const newId = () => 'sig-' + ++uid;

function hint(count: number) {
  if (count === 0) return 'Start with anything you would defend at a dinner party.';
  if (count === 1) return 'Add one more. The reading comes from the overlap between signals.';
  if (count === 2) return 'Good. A third signal from a different domain sharpens the pattern.';
  if (count < LIMITS.maxSignals) return 'Strong signature. Add another, or chart it now.';
  return 'Full constellation. Five signals is the maximum.';
}

function Constellation({ signals, lenses }: { signals: SignalDraft[]; lenses: DomainId[] }) {
  const pts = signals.map((s, i) => {
    const a = (i / Math.max(signals.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { ...s, x: 180 + Math.cos(a) * 92, y: 180 + Math.sin(a) * 92 };
  });
  const ready = signals.length >= LIMITS.minSignals;
  return (
    <svg viewBox="0 0 360 360" className="constellation" role="img" aria-label={'Your constellation: ' + signals.length + ' signals, ' + lenses.length + ' discovery domains'}>
      <circle cx="180" cy="180" r="92" className="constellation__ring" />
      <circle cx="180" cy="180" r="150" className="constellation__ring constellation__ring--outer" />
      {pts.flatMap((a, i) => pts.slice(i + 1).map(b => (
        <motion.line key={a.id + b.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="constellation__link" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1, x1: a.x, y1: a.y, x2: b.x, y2: b.y }} transition={{ duration: 0.8 }} />
      )))}
      {pts.map(p => (
        <motion.line key={'c' + p.id} x1={180} y1={180} x2={p.x} y2={p.y} stroke={DOMAIN_MAP[p.domain].hue} className="constellation__spoke" initial={{ opacity: 0 }} animate={{ opacity: 0.5, x2: p.x, y2: p.y }} />
      ))}
      <motion.circle cx="180" cy="180" className="constellation__core" animate={{ r: ready ? [16, 20, 16] : 9, opacity: ready ? 1 : 0.45 }} transition={ready ? { duration: 2.4, repeat: Infinity } : { duration: 0.4 }} />
      <AnimatePresence>
        {pts.map(p => (
          <motion.g key={p.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, x: p.x, y: p.y }} exit={{ opacity: 0, scale: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
            <circle r="18" fill={DOMAIN_MAP[p.domain].hue} opacity="0.16" />
            <circle r="6.5" fill={DOMAIN_MAP[p.domain].hue} />
            <text y="30" textAnchor="middle" className="constellation__label">{p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name}</text>
          </motion.g>
        ))}
      </AnimatePresence>
      {lenses.map((l, i) => {
        const a = (i / lenses.length) * Math.PI * 2 + Math.PI / 4;
        const x = 180 + Math.cos(a) * 150, y = 180 + Math.sin(a) * 150;
        return (
          <motion.g key={l} initial={{ opacity: 0 }} animate={{ opacity: 1, x, y }} transition={{ duration: 0.6 }}>
            <circle r="9" fill="none" stroke={DOMAIN_MAP[l].hue} strokeDasharray="2 3" />
            <text y="-15" textAnchor="middle" className="constellation__lens">{DOMAIN_MAP[l].label}</text>
          </motion.g>
        );
      })}
      {!signals.length && <text x="180" y="186" textAnchor="middle" className="constellation__empty">Your constellation forms here</text>}
    </svg>
  );
}

export default function Builder({ busy, status, example, onSubmit, onSample }: Props) {
  const [signals, setSignals] = useState<SignalDraft[]>([]);
  const [domain, setDomain] = useState<DomainId>('film');
  const [text, setText] = useState('');
  const [chosenLenses, setChosenLenses] = useState<DomainId[] | null>(null);
  const [orbit, setOrbit] = useState<Orbit>('near');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const autoLenses = useMemo(() => {
    const used = new Set(signals.map(s => s.domain));
    return LENS_PREFERENCE.filter(d => !used.has(d)).slice(0, 3);
  }, [signals]);
  const lenses = chosenLenses ?? autoLenses;

  useEffect(() => {
    if (!example) return;
    const set = EXAMPLE_SETS.find(e => e.id === example.id);
    if (!set) return;
    setSignals(set.signals.map(s => ({ ...s, id: newId() })));
    setChosenLenses(set.lenses);
    setError(null);
  }, [example]);

  const full = signals.length >= LIMITS.maxSignals;
  const add = () => {
    const name = text.trim();
    if (!name) return;
    if (full) { setError('Five signals is the limit. Remove one to add another.'); return; }
    if (signals.some(s => s.name.toLowerCase() === name.toLowerCase() && s.domain === domain)) { setError('That one is already in your constellation.'); return; }
    setSignals(prev => [...prev, { id: newId(), domain, name: name.slice(0, 80) }]);
    setText('');
    setError(null);
    inputRef.current?.focus();
  };
  const toggleLens = (id: DomainId) => {
    const next = lenses.includes(id) ? lenses.filter(l => l !== id) : lenses.length >= LIMITS.maxLenses ? lenses : [...lenses, id];
    setChosenLenses(next);
  };
  const canSubmit = signals.length >= LIMITS.minSignals && lenses.length > 0 && !busy;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) { add(); return; }
    if (signals.length < LIMITS.minSignals) { setError('Add at least two signals. The reading needs an overlap.'); return; }
    if (!lenses.length) { setError('Choose at least one domain to chart discoveries in.'); return; }
    onSubmit({ signals: signals.map(({ domain: d, name }) => ({ domain: d, name })), lenses, orbit });
  };
  const active = DOMAIN_MAP[domain];

  return (
    <section className="builder section" id="chart">
      <div className="container">
        <Reveal className="section-head section-head--center">
          <Eyebrow index="03">Chart yours</Eyebrow>
          <h2 className="section-title">Name what you love.<br />We'll map the <em>rest.</em></h2>
          <p className="section-lede">Mix domains freely: a film, an album, a restaurant, a city. Different signals that share a feeling make the best readings.</p>
        </Reveal>

        <Reveal className="builder__shell glass">
          <form className="builder__form" onSubmit={submit} noValidate>
            <fieldset className="builder__step">
              <legend><span className="step-n">1</span> What do you love? <span className="builder__count">{signals.length} / {LIMITS.maxSignals}</span></legend>
              <div className="domain-picker" role="radiogroup" aria-label="Domain of your next signal">
                {DOMAINS.map(d => (
                  <button key={d.id} type="button" role="radio" aria-checked={domain === d.id} className={'chip chip--domain' + (domain === d.id ? ' is-on' : '')} style={{ ['--hue' as string]: d.hue }} onClick={() => { setDomain(d.id); inputRef.current?.focus(); }}>
                    <span aria-hidden className="chip__glyph">{d.glyph}</span>{d.label}
                  </button>
                ))}
              </div>
              <div className="signal-input" style={{ ['--hue' as string]: active.hue }}>
                <label htmlFor="signal-text" className="sr-only">A {active.noun} you love</label>
                <input id="signal-text" ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder={active.placeholder} maxLength={80} autoComplete="off" disabled={full} />
                <button type="button" className="btn btn--soft" onClick={add} disabled={!text.trim() || full}>Add <span aria-hidden>↵</span></button>
              </div>
              <ul className="signal-list" aria-label="Your signals">
                <AnimatePresence initial={false}>
                  {signals.map(s => (
                    <motion.li key={s.id} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} className="signal-pill" style={{ ['--hue' as string]: DOMAIN_MAP[s.domain].hue }}>
                      <span className="signal-pill__domain">{DOMAIN_MAP[s.domain].label}</span>
                      <span className="signal-pill__name">{s.name}</span>
                      <button type="button" aria-label={'Remove ' + s.name} onClick={() => setSignals(prev => prev.filter(x => x.id !== s.id))}>×</button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <p className="builder__hint">{hint(signals.length)}</p>
              <div className="examples">
                <span>Or load a constellation:</span>
                {EXAMPLE_SETS.map(set => (
                  <button key={set.id} type="button" className="example" onClick={() => { setSignals(set.signals.map(s => ({ ...s, id: newId() }))); setChosenLenses(set.lenses); setError(null); }}>
                    <strong>{set.title}</strong><small>{set.mood}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="builder__step">
              <legend><span className="step-n">2</span> Where should we look? <span className="builder__count">{lenses.length} / {LIMITS.maxLenses}</span></legend>
              <div className="lens-picker" role="group" aria-label="Discovery domains">
                {DOMAINS.map(d => (
                  <button key={d.id} type="button" aria-pressed={lenses.includes(d.id)} className={'chip chip--lens' + (lenses.includes(d.id) ? ' is-on' : '')} style={{ ['--hue' as string]: d.hue }} onClick={() => toggleLens(d.id)} disabled={!lenses.includes(d.id) && lenses.length >= LIMITS.maxLenses}>
                    <span className="chip__dot" aria-hidden />{d.label}
                  </button>
                ))}
              </div>
              <p className="builder__hint">{chosenLenses ? 'Cross-domain picks are where the surprises live.' : "We've pre-selected domains you didn't mention, since that's where the surprises live. Change them freely."}</p>
            </fieldset>

            <fieldset className="builder__step">
              <legend><span className="step-n">3</span> How far should we travel?</legend>
              <div className="orbit-toggle" role="radiogroup" aria-label="Discovery distance">
                {([
                  ['near', 'Close orbit', "Qloo's strongest matches for your combined taste."],
                  ['far', 'Deep space', 'Skips the obvious top matches and favors lesser-known picks.']
                ] as const).map(([value, title, desc]) => (
                  <button key={value} type="button" role="radio" aria-checked={orbit === value} className={'orbit-option' + (orbit === value ? ' is-on' : '')} onClick={() => setOrbit(value)}>
                    <span className={'orbit-icon orbit-icon--' + value} aria-hidden><i /></span>
                    <span><strong>{title}</strong><small>{desc}</small></span>
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <p className="builder__error" role="alert">{error}</p>}

            <div className="builder__submit">
              <button type="submit" className="btn btn--gold btn--lg btn--block" disabled={!canSubmit} aria-disabled={!canSubmit}>
                {busy ? 'Charting your atlas…' : 'Chart my atlas'} <span aria-hidden>✦</span>
              </button>
              <p className="builder__live">
                {status === 'configured' && <>Live: your signals go to the Qloo API through our server. No account needed.</>}
                {status === 'offline' && <>The live engine isn't connected on this deployment, so charting will return an honest error. You can still <button type="button" className="link" onClick={onSample}>explore a labelled sample atlas</button>.</>}
                {(status === 'checking' || status === 'unknown') && <>Results come only from the live Qloo API. We never fill gaps with invented picks.</>}
              </p>
            </div>
          </form>

          <aside className="builder__preview" aria-label="Live preview of your constellation">
            <div className="builder__preview-head">
              <span>Live constellation</span>
              <span className={'tag ' + (signals.length >= LIMITS.minSignals ? 'tag--gold' : 'tag--muted')}>
                {signals.length >= LIMITS.minSignals ? 'Ready to triangulate' : `${LIMITS.minSignals - signals.length} more to begin`}
              </span>
            </div>
            <Constellation signals={signals} lenses={lenses} />
            <dl className="builder__summary">
              <div><dt>Signals</dt><dd>{signals.length ? [...new Set(signals.map(s => DOMAIN_MAP[s.domain].label))].join(' · ') : '—'}</dd></div>
              <div><dt>Charting</dt><dd>{lenses.map(l => DOMAIN_MAP[l].label).join(' · ') || '—'}</dd></div>
              <div><dt>Distance</dt><dd>{orbit === 'near' ? 'Close orbit' : 'Deep space'}</dd></div>
            </dl>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
