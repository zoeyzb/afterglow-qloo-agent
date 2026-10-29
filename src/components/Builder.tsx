import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DOMAINS, DOMAIN_MAP, EXAMPLE_SETS, LIMITS, type DomainId, type SignalDraft } from '../lib/domains';
import type { AtlasRequest, Orbit } from '../lib/types';
import type { LiveStatus } from '../lib/api';
import { Eyebrow, Reveal } from './ui';
import { prepareAtlasSubmission, prepareSignalAddition } from '../lib/builder-submit.cjs';

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
  if (count === 0) return 'Pick a category, enter a title or name, and tap Add.';
  if (count === 1) return 'Add one more favorite to find connections.';
  if (count === 2) return 'Ready to explore. Add more favorites for a broader mix.';
  if (count < LIMITS.maxSignals) return 'Ready to explore, or add one more favorite.';
  return 'Five favorites added. You’re ready to explore.';
}

function Constellation({ signals, lenses }: { signals: SignalDraft[]; lenses: DomainId[] }) {
  const pts = signals.map((s, i) => {
    const a = (i / Math.max(signals.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { ...s, x: 180 + Math.cos(a) * 92, y: 180 + Math.sin(a) * 92 };
  });
  const ready = signals.length >= LIMITS.minSignals;
  return (
    <svg viewBox="0 0 360 360" className="constellation" role="img" aria-label={'Preview: ' + signals.length + ' chosen favorites, ' + lenses.length + ' types of discoveries'}>
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
  const pendingPreview = prepareSignalAddition(signals, text, domain, LIMITS.maxSignals);
  const add = () => {
    const addition = prepareSignalAddition(signals, text, domain, LIMITS.maxSignals, newId);
    if (addition.status === 'empty') return;
    if (addition.status === 'full') { setError('You can add up to five favorites. Remove one to add another.'); return; }
    if (addition.status === 'duplicate') { setError('You already added that favorite.'); return; }
    setSignals(addition.signals);
    setText('');
    setError(null);
    inputRef.current?.focus();
  };
  const toggleLens = (id: DomainId) => {
    const next = lenses.includes(id) ? lenses.filter(l => l !== id) : lenses.length >= LIMITS.maxLenses ? lenses : [...lenses, id];
    setChosenLenses(next);
  };
  const readyCount = pendingPreview.status === 'ready' ? pendingPreview.signals.length : signals.length;
  const canSubmit = readyCount >= LIMITS.minSignals && lenses.length > 0 && !busy;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const submission = prepareAtlasSubmission({
      signals, text, domain, lenses, orbit,
      minSignals: LIMITS.minSignals,
      maxSignals: LIMITS.maxSignals,
      createId: newId
    });
    if (submission.added) {
      setSignals(submission.signals);
      setText('');
    }
    if (submission.status === 'full') { setError('You can add up to five favorites. Remove one to add another.'); return; }
    if (submission.status === 'duplicate') { setError('You already added that favorite.'); return; }
    if (submission.status === 'minimum') { setError('Add at least two favorites to find their connections.'); return; }
    if (submission.status === 'no_lenses') { setError('Choose at least one type of result you want to discover.'); return; }
    setError(null);
    onSubmit(submission.request!);
  };
  const active = DOMAIN_MAP[domain];

  return (
    <section className="builder section" id="chart">
      <div className="container">
        <Reveal className="section-head section-head--center">
          <Eyebrow index="03">Chart yours</Eyebrow>
          <h2 className="section-title">Start with what you love.<br />Find <em>what’s next.</em></h2>
          <p className="section-lede">Add 2–5 favorites. Choose what you want to discover. Explore your matches.</p>
        </Reveal>

        <Reveal className="builder__shell glass">
          <form className="builder__form" onSubmit={submit} noValidate>
            <fieldset className="builder__step">
              <legend><span className="step-n">1</span> Add your favorites <span className="builder__count">{signals.length} / {LIMITS.maxSignals} added</span></legend>
              <div className="domain-picker" role="radiogroup" aria-label="Domain of your next signal">
                {DOMAINS.map(d => (
                  <button key={d.id} id={'domain-' + d.id} type="button" role="radio" tabIndex={domain === d.id ? 0 : -1} aria-checked={domain === d.id} className={'chip chip--domain' + (domain === d.id ? ' is-on' : '')} style={{ ['--hue' as string]: d.hue }} onClick={() => { setDomain(d.id); inputRef.current?.focus(); }} onKeyDown={e => {
                    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
                    const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
                    if (!forward && !backward) return;
                    e.preventDefault();
                    const index = DOMAINS.findIndex(item => item.id === d.id);
                    const next = DOMAINS[(index + (forward ? 1 : -1) + DOMAINS.length) % DOMAINS.length];
                    setDomain(next.id);
                    document.getElementById('domain-' + next.id)?.focus();
                  }}>
                    <span aria-hidden className="chip__glyph">{d.glyph}</span>{d.label}
                  </button>
                ))}
              </div>
              <div className="signal-input" style={{ ['--hue' as string]: active.hue }}>
                <label htmlFor="signal-text" className="sr-only">A {active.noun} you love</label>
                <input id="signal-text" ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={active.placeholder} maxLength={80} autoComplete="off" disabled={full} />
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
              <legend><span className="step-n">2</span> What do you want to find? <span className="builder__count">{lenses.length} / {LIMITS.maxLenses} selected</span></legend>
              <div className="lens-picker" role="group" aria-label="Discovery domains">
                {DOMAINS.map(d => (
                  <button key={d.id} type="button" aria-pressed={lenses.includes(d.id)} className={'chip chip--lens' + (lenses.includes(d.id) ? ' is-on' : '')} style={{ ['--hue' as string]: d.hue }} onClick={() => toggleLens(d.id)} disabled={!lenses.includes(d.id) && lenses.length >= LIMITS.maxLenses}>
                    <span className="chip__dot" aria-hidden />{d.label}
                  </button>
                ))}
              </div>
              <p className="builder__hint">{chosenLenses ? 'Choose up to four types of recommendations. Music results are artists, not playable tracks.' : 'We picked three types to start. Choose up to four — these are results to find, not more favorites. Music means artists.'}</p>
            </fieldset>

            <fieldset className="builder__step">
              <legend><span className="step-n">3</span> Familiar or surprising?</legend>
              <div className="orbit-toggle" role="radiogroup" aria-label="Discovery distance">
                {([
                  ['near', 'Closest matches', 'Start with the most relevant results.'],
                  ['far', 'Surprise me', 'Skip obvious picks and explore less mainstream results.']
                ] as const).map(([value, title, desc]) => (
                  <button key={value} id={'orbit-' + value} type="button" role="radio" tabIndex={orbit === value ? 0 : -1} aria-checked={orbit === value} className={'orbit-option' + (orbit === value ? ' is-on' : '')} onClick={() => setOrbit(value)} onKeyDown={e => {
                    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
                    e.preventDefault();
                    const next = value === 'near' ? 'far' : 'near';
                    setOrbit(next);
                    document.getElementById('orbit-' + next)?.focus();
                  }}>
                    <span className={'orbit-icon orbit-icon--' + value} aria-hidden><i /></span>
                    <span><strong>{title}</strong><small>{desc}</small></span>
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <p className="builder__error" role="alert">{error}</p>}

            <div className="builder__submit">
              {status === 'offline'
                ? <button type="button" className="btn btn--gold btn--lg btn--block" onClick={onSample}>Explore the sample map <span aria-hidden>✦</span></button>
                : <button type="submit" className="btn btn--gold btn--lg btn--block" disabled={!canSubmit} aria-disabled={!canSubmit}>{busy ? 'Finding connections…' : 'Find my matches'} <span aria-hidden>✦</span></button>}
              <p className="builder__live">
                {status === 'configured' && <>Live: your signals go to the Qloo API through our server. No account needed.</>}
                {status === 'offline' && <>Demo mode uses preset favorites, not the ones you type above. Custom matches require an event-issued Qloo key.</>}
                {(status === 'checking' || status === 'unknown') && <>Live picks require Qloo access. Samples are always labelled.</>}
              </p>
            </div>
          </form>

          <aside className="builder__preview" aria-label="Live preview of your constellation">
            <div className="builder__preview-head">
              <span>Your favorites · live preview</span>
              <span className={'tag ' + (signals.length >= LIMITS.minSignals ? 'tag--gold' : 'tag--muted')}>
                {signals.length >= LIMITS.minSignals ? 'Ready to explore' : `${LIMITS.minSignals - signals.length} more to start`}
              </span>
            </div>
            <Constellation signals={signals} lenses={lenses} />
            <p className="builder__visual-hint">Solid dots: things you love · Outlined dots: what to discover</p>
            <dl className="builder__summary">
              <div><dt>Favorites</dt><dd>{signals.length ? [...new Set(signals.map(s => DOMAIN_MAP[s.domain].label))].join(' · ') : '—'}</dd></div>
              <div><dt>Looking for</dt><dd>{lenses.map(l => DOMAIN_MAP[l].label).join(' · ') || '—'}</dd></div>
              <div><dt>Style</dt><dd>{orbit === 'near' ? 'Closest matches' : 'Surprise me'}</dd></div>
            </dl>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}