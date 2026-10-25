import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DOMAINS, DOMAIN_MAP, EXAMPLE_SETS } from '../lib/domains';
import type { Collection } from '../lib/collection';
import { Eyebrow, LogoMark, Reveal } from './ui';

const PRINCIPLES = [
  { glyph: '⟡', title: 'See why it fits', body: 'Explore the affinities behind each recommendation.' },
  { glyph: '◎', title: 'No made-up results', body: 'Live picks come from Qloo. Samples are clearly marked.' },
  { glyph: '⌘', title: 'Go beyond your category', body: 'From a favorite film to music, books or places.' },
  { glyph: '◌', title: 'Your collection, your browser', body: 'No account. Your saved discoveries stay on this device.' }
];

export function Principles() {
  return (
    <section className="principles section" id="principles">
      <div className="container">
        <Reveal className="section-head">
          <Eyebrow index="05">Principles</Eyebrow>
          <h2 className="section-title">Cultural intelligence<br />you can <em>trust.</em></h2>
        </Reveal>
        <div className="principles__grid">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.07} className="principle glass" as="article">
              <span className="principle__glyph" aria-hidden>{p.glyph}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="principle__connector" aria-hidden="true" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA({ onExample }: { onExample: (id: string) => void }) {
  const rings = DOMAINS.slice(0, 6);
  return (
    <section className="finale" id="start">
      <div className="finale__orrery" aria-hidden>
        {rings.map((d, i) => (
          <div key={d.id} className="finale__ring" style={{ ['--i' as string]: i, ['--hue' as string]: d.hue }}>
            <span className="finale__planet" />
          </div>
        ))}
        <div className="finale__core" />
      </div>
      <div className="finale__content">
        <Reveal>
          <p className="eyebrow eyebrow--center"><span className="eyebrow__line" aria-hidden />Your move</p>
          <h2 className="finale__title">Everything you love<br />is connected. <em>Go see how.</em></h2>
          <p className="section-lede">Choose a few favorites. Find their connections. Save what you discover.</p>
          <div className="finale__ctas">
            <a className="btn btn--gold btn--lg" href="#chart">Chart my taste universe <span aria-hidden>→</span></a>
          </div>
          <div className="finale__examples">
            <span>Not sure where to start? Load one:</span>
            {EXAMPLE_SETS.map(e => (
              <button key={e.id} type="button" className="chip" onClick={() => onExample(e.id)}>{e.title}</button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <a className="brand" href="#top"><LogoMark /><span>TasteAtlas<sup>AI</sup></span></a>
        <p>A 3D map of what you love and what to discover next. Live recommendations use Qloo's cultural affinity data.</p>
        <nav aria-label="Footer">
          <a href="#how">How it works</a>
          <a href="#chart">Chart yours</a>
          <a href="https://github.com/zoeyzb/afterglow-qloo-agent" target="_blank" rel="noreferrer">Source ↗</a>
        </nav>
      </div>
      <div className="container footer__base">
        <span>© 2026 TasteAtlas AI · Sierra Byrd · MIT licensed</span>
        <span>Built for the Qloo Agentic Hackathon</span>
      </div>
    </footer>
  );
}

export function CollectionDrawer({ open, onClose, collection }: { open: boolean; onClose: () => void; collection: Collection }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  const copy = async () => {
    const text = 'My TasteAtlas collection\n' + collection.items.map((x, i) => `${i + 1}. ${x.name} (${DOMAIN_MAP[x.domain]?.label ?? x.domain}${x.source === 'sample' ? ', sample' : ''})`).join('\n');
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="drawer-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
            <header className="drawer__head">
              <div>
                <p className="eyebrow">Saved in this browser</p>
                <h2 id="drawer-title">Your <em>collection</em></h2>
              </div>
              <button ref={closeRef} type="button" className="drawer__close" onClick={onClose} aria-label="Close collection">×</button>
            </header>
            {collection.items.length ? (
              <ul className="drawer__list">
                {collection.items.map(item => (
                  <li key={item.key} style={{ ['--hue' as string]: DOMAIN_MAP[item.domain]?.hue }}>
                    <span className="chip__dot" aria-hidden />
                    <span><strong>{item.name}</strong><small>{DOMAIN_MAP[item.domain]?.label}{item.source === 'sample' ? ' · sample' : ' · Qloo'}</small></span>
                    <button type="button" onClick={() => collection.remove(item.key)} aria-label={'Remove ' + item.name}>×</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card__muted drawer__empty">Nothing saved yet. Tap ✧ on any discovery to keep it here.</p>
            )}
            <footer className="drawer__foot">
              <button type="button" className="btn btn--gold" onClick={copy} disabled={!collection.items.length}>Copy as list</button>
              <button type="button" className="btn btn--ghost" onClick={collection.clear} disabled={!collection.items.length}>Clear</button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
