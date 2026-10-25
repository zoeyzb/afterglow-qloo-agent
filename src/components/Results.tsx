import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { DOMAIN_MAP, type DomainId } from '../lib/domains';
import type { Atlas, AtlasErrorCode } from '../lib/types';
import type { Collection } from '../lib/collection';
import { discoveryKey } from '../lib/keys';
import DiscoveryCard from './DiscoveryCard';
import { Eyebrow, hasWebGL, SceneBoundary } from './ui';

const AtlasGraph = lazy(() => import('../three/AtlasGraph'));

export type RunState =
  | { phase: 'idle' }
  | { phase: 'loading'; signalCount: number }
  | { phase: 'ready'; atlas: Atlas }
  | { phase: 'error'; code: AtlasErrorCode; message: string };

interface Props {
  run: RunState;
  collection: Collection;
  onRetry: () => void;
  onSample: () => void;
}

const PIPELINE = [
  { t: 'Resolving your signals', d: "Finding each one in Qloo's cultural graph" },
  { t: 'Reading shared patterns', d: 'Asking which traits sit at their intersection' },
  { t: 'Charting discoveries', d: 'Pulling aligned picks in your chosen domains' }
];

function Loading({ signalCount }: { signalCount: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => Math.min(v + 1, PIPELINE.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="state glass" role="status" aria-live="polite">
      <div className="state__orb state__orb--spin" aria-hidden><i /><i /><i /></div>
      <h3>Connecting {signalCount} favorites…</h3>
      <ol className="pipeline">
        {PIPELINE.map((p, n) => (
          <li key={p.t} className={n < i ? 'is-done' : n === i ? 'is-active' : ''}>
            <span className="pipeline__dot" aria-hidden />
            <span><strong>{p.t}</strong><small>{p.d}</small></span>
          </li>
        ))}
      </ol>
      <p className="fineprint">Live request to the Qloo API. Nothing here is precomputed.</p>
    </div>
  );
}

const ERROR_COPY: Record<AtlasErrorCode, { title: string; lead: string }> = {
  not_configured: { title: 'The live engine is offline on this deployment.', lead: "TasteAtlas only shows real Qloo results, so instead of inventing an atlas we're telling you plainly: no Qloo key is configured on this server yet." },
  unresolved: { title: "We couldn't find those in the cultural graph.", lead: 'Try exact titles and names, e.g. “Spirited Away” rather than “that Ghibli bathhouse film”, and check that each signal sits in the right domain.' },
  invalid: { title: "That request didn't quite add up.", lead: 'Check that you have 2–5 signals and 1–4 discovery domains.' },
  upstream: { title: 'Qloo returned an error.', lead: "The cultural graph didn't answer cleanly, so we're showing nothing rather than something made up." },
  network: { title: 'We could not reach the server.', lead: 'Check your connection and try again.' }
};

function ErrorState({ code, message, onRetry, onSample }: { code: AtlasErrorCode; message: string; onRetry: () => void; onSample: () => void }) {
  const copy = ERROR_COPY[code];
  return (
    <div className="state state--error glass" role="alert">
      <div className="state__orb state__orb--broken" aria-hidden><i /><i /></div>
      <h3>{copy.title}</h3>
      <p>{copy.lead}</p>
      <p className="state__detail"><span>Server said</span>{message}</p>
      <div className="state__actions">
        {code === 'not_configured' ? (
          <button type="button" className="btn btn--gold" onClick={onSample}>Explore the labelled sample atlas</button>
        ) : (
          <button type="button" className="btn btn--gold" onClick={onRetry}>Try again</button>
        )}
        <a href="#chart" className="btn btn--ghost">Edit my signals</a>
      </div>
    </div>
  );
}

function TasteDNA({ atlas }: { atlas: Atlas }) {
  const max = Math.max(...atlas.patterns.map(p => p.affinity ?? 0), 0);
  return (
    <div className="dna glass">
      <div className="panel-head">
        <span>Taste DNA</span>
        <span className="tag tag--muted">{atlas.source === 'sample' ? 'Sample' : 'Qloo tags'}</span>
      </div>
      <p className="dna__lead">Themes behind these picks. Sample scores are illustrative; live scores come from Qloo.</p>
      {atlas.patterns.length ? (
        <ol className="dna__list">
          {atlas.patterns.slice(0, 8).map((p, i) => (
            <li key={p.id}>
              <span className="dna__rank">{String(i + 1).padStart(2, '0')}</span>
              <span className="dna__name">{p.name}</span>
              {p.affinity !== null && max > 0 && (
                <span className="dna__bar"><motion.i initial={{ width: 0 }} whileInView={{ width: (p.affinity / max) * 100 + '%' }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.06 }} /></span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="card__muted">{atlas.patternsNote || 'No shared patterns were returned.'}</p>
      )}
    </div>
  );
}

function FocusPanel({ atlas, focus }: { atlas: Atlas; focus: string | null }) {
  const item = useMemo(() => {
    if (!focus) return null;
    for (const l of atlas.lenses) for (const d of l.items) if (discoveryKey(d) === focus) return d;
    return null;
  }, [atlas, focus]);
  const seed = focus?.startsWith('s:') ? atlas.resolved.find(r => 's:' + r.id === focus) : null;
  const pattern = focus?.startsWith('p:') ? atlas.patterns.find(p => 'p:' + p.name.toLowerCase() === focus) : null;
  let body = <p className="card__muted">Hover or tap any star to trace its connections.</p>;
  if (item) {
    const top = item.drivers[0];
    const topName = top ? atlas.resolved.find(r => r.id === top.id)?.name : null;
    body = <p><strong>{item.name}</strong> · {DOMAIN_MAP[item.domain].label}. {topName ? `Pulled in mostly by ${topName} (${Math.round(top.share * 100)}%).` : 'Aligned with your signals as a whole.'}{item.sharedPatterns.length ? ` Shares ${item.sharedPatterns.join(', ')}.` : ''}</p>;
  } else if (seed) {
    const count = atlas.lenses.reduce((n, l) => n + l.items.filter(d => d.drivers.some(x => x.id === seed.id && x.share >= 0.12)).length, 0);
    body = <p><strong>{seed.name}</strong> is one of your signals. It pulled in {count} discover{count === 1 ? 'y' : 'ies'} directly.</p>;
  } else if (pattern) {
    const count = atlas.lenses.reduce((n, l) => n + l.items.filter(d => d.sharedPatterns.some(p => p.toLowerCase() === pattern.name.toLowerCase())).length, 0);
    body = <p><strong>{pattern.name}</strong> is a shared pattern in your taste. It appears in {count} discover{count === 1 ? 'y' : 'ies'}.</p>;
  }
  return <div className="focus-panel" aria-live="polite">{body}</div>;
}

function Atlas3D({ atlas, focus, setFocus }: { atlas: Atlas; focus: string | null; setFocus: (k: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.1 });
  const reduce = Boolean(useReducedMotion());
  const [webgl] = useState(hasWebGL);
  const fallback = <div className="graph__fallback">The interactive 3D map needs WebGL. Your discoveries are listed below.</div>;
  return (
    <div className="graph glass" ref={ref}>
      <div className="panel-head">
        <span>Your taste map</span>
        <span className="graph__hint">Drag to orbit · hover to trace</span>
      </div>
      <div className="graph__canvas">
        {webgl ? (
          <SceneBoundary fallback={fallback}>
            <Suspense fallback={<div className="graph__fallback">Rendering your universe…</div>}>
              <AtlasGraph atlas={atlas} selected={focus} onSelect={setFocus} active={inView} reducedMotion={reduce} />
            </Suspense>
          </SceneBoundary>
        ) : fallback}
      </div>
      <ul className="graph__legend" aria-label="Map legend">
        <li><i className="lg lg--seed" />Your signals</li>
        <li><i className="lg lg--pattern" />Shared patterns</li>
        <li><i className="lg lg--find" />Discoveries <small>(further out = less mainstream)</small></li>
      </ul>
      <FocusPanel atlas={atlas} focus={focus} />
    </div>
  );
}

function Ready({ atlas, collection }: { atlas: Atlas; collection: Collection }) {
  const [focus, setFocus] = useState<string | null>(null);
  const [filter, setFilter] = useState<DomainId | 'all'>('all');
  const lenses = atlas.lenses;
  const items = lenses.filter(l => filter === 'all' || l.domain === filter).flatMap(l => l.items);
  const total = lenses.reduce((n, l) => n + l.items.length, 0);
  const isSample = atlas.source === 'sample';

  return (
    <>
      <header className="results__head">
        <div>
          <Eyebrow index="04">{isSample ? 'Illustrative sample' : 'Live from Qloo'}</Eyebrow>
          <h2 className="section-title">Your taste <em>atlas.</em></h2>
          <p className="section-lede">{total} discoveries across {lenses.filter(l => l.items.length).length} domains, drawn from {atlas.resolved.length} signals{atlas.orbit === 'far' ? ' in deep-space mode' : ''}.</p>
        </div>
        <ul className="resolved" aria-label="How your signals were matched">
          {atlas.resolved.map(r => (
            <li key={r.id} style={{ ['--hue' as string]: DOMAIN_MAP[r.domain].hue }}>
              <span className="resolved__ok" aria-hidden>✓</span>
              <span>{r.name}{r.subtitle ? <small> · {r.subtitle}</small> : null}</span>
              {!r.exact && <small className="resolved__note">matched from “{r.input}”</small>}
            </li>
          ))}
          {atlas.unresolved.map(u => (
            <li key={u.input} className="is-missing">
              <span aria-hidden>!</span><span>{u.input}</span><small className="resolved__note">not found in {DOMAIN_MAP[u.domain].label}, left out</small>
            </li>
          ))}
        </ul>
      </header>

      {isSample && (
        <div className="sample-banner" role="note">
          <strong>Example map — not your personal results.</strong> These preset favorites, recommendations and scores are illustrative. Live personalized discovery needs the event-issued Qloo key.
        </div>
      )}

      <div className="results__grid">
        <Atlas3D atlas={atlas} focus={focus} setFocus={setFocus} />
        <TasteDNA atlas={atlas} />
      </div>

      <div className="filters" role="tablist" aria-label="Filter discoveries by domain">
        <button role="tab" aria-selected={filter === 'all'} className={'chip' + (filter === 'all' ? ' is-on' : '')} onClick={() => setFilter('all')}>All <small>{total}</small></button>
        {lenses.map(l => (
          <button key={l.domain} role="tab" aria-selected={filter === l.domain} className={'chip' + (filter === l.domain ? ' is-on' : '')} style={{ ['--hue' as string]: DOMAIN_MAP[l.domain].hue }} onClick={() => setFilter(l.domain)}>
            <span className="chip__dot" aria-hidden />{DOMAIN_MAP[l.domain].label} <small>{l.items.length}</small>
          </button>
        ))}
      </div>

      {lenses.filter(l => l.error && (filter === 'all' || filter === l.domain)).map(l => (
        <p key={l.domain} className="lens-error" role="note"><strong>{DOMAIN_MAP[l.domain].label}:</strong> {l.error} We left this domain empty rather than guess.</p>
      ))}

      <motion.div layout className="cards">
        <AnimatePresence mode="popLayout">
          {items.map((item, i) => {
            const key = discoveryKey(item);
            return (
              <DiscoveryCard
                key={key}
                item={item}
                atlas={atlas}
                index={i}
                focusKey={key}
                selected={focus === key}
                saved={collection.has(key + ':' + atlas.source)}
                onFocus={setFocus}
                onToggleSave={() => collection.toggle({ key: key + ':' + atlas.source, name: item.name, domain: item.domain, source: atlas.source })}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>
      {!items.length && <p className="card__muted results__empty">No discoveries came back for this domain.</p>}
    </>
  );
}

export default function Results({ run, collection, onRetry, onSample }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (run.phase !== 'idle') ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [run.phase]);
  if (run.phase === 'idle') return null;
  return (
    <section className="results section" id="atlas" ref={ref} aria-busy={run.phase === 'loading'}>
      <div className="container">
        {run.phase === 'loading' && <Loading signalCount={run.signalCount} />}
        {run.phase === 'error' && <ErrorState code={run.code} message={run.message} onRetry={onRetry} onSample={onSample} />}
        {run.phase === 'ready' && <Ready key={run.atlas.generatedAt + run.atlas.source} atlas={run.atlas} collection={collection} />}
      </div>
    </section>
  );
}