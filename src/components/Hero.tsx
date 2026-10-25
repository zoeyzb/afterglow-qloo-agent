import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { DOMAINS } from '../lib/domains';
import { hasWebGL, SceneBoundary } from './ui';

const HeroUniverse = lazy(() => import('../three/HeroUniverse'));

const READOUT = [
  { label: 'Your favorites', items: ['Blade Runner 2049', 'Frank Ocean', 'Norwegian Wood'] },
  { label: 'What connects them', items: ['Nocturnal', 'Melancholic', 'Lush minimalism'] },
  { label: 'What you could discover', items: ['Tokyo · place', 'Severance · TV', 'JBS listening bar · dining'] }
];

function useIsWide() {
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.05 });
  const reduce = Boolean(useReducedMotion());
  const wide = useIsWide();
  const [webgl] = useState(hasWebGL);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setStep(s => (s + 1) % 3), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  const ease = [0.16, 1, 0.3, 1] as const;
  const fade = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, delay, ease } });

  return (
    <section className="hero" id="top" ref={ref}>
      <div className="hero__scene" aria-hidden>
        <div className="hero__nebula" />
        {webgl && (
          <SceneBoundary fallback={null}>
            <Suspense fallback={null}>
              <HeroUniverse active={inView} reducedMotion={reduce} showLabels={wide} />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      <div className="hero__content">
        <motion.p className="eyebrow" {...fade(0.1)}>
          <span className="eyebrow__line" aria-hidden />
          Cultural intelligence · built on Qloo's taste graph
        </motion.p>
        <motion.h1 className="hero__title" {...fade(0.2)}>
          Your taste is a <em>universe.</em>
          <br />
          Here's the map.
        </motion.h1>
        <motion.p className="hero__lede" {...fade(0.35)}>
          Add 2–5 favorites — films, artists, books or places. See what connects them, then discover what else fits your taste.
        </motion.p>
        <motion.div className="hero__ctas" {...fade(0.5)}>
          <a className="btn btn--gold btn--lg" href="#chart">Chart my taste <span aria-hidden>→</span></a>
          <a className="btn btn--ghost btn--lg" href="#how">See how it works</a>
        </motion.div>
        <motion.ul className="hero__facts" {...fade(0.65)}>
          <li><strong>{DOMAINS.length}</strong> cultural domains</li>
          <li><strong>2–5</strong> favorites to start</li>
          <li><strong>Every</strong> pick explained</li>
        </motion.ul>
      </div>

      <motion.aside className="readout glass" aria-label="Example of how a reading works" {...fade(0.85)}>
        <div className="readout__head">
          <span>How a reading works</span>
          <span className="tag tag--muted">Illustrative</span>
        </div>
        <ol className="readout__rows">
          {READOUT.map((row, i) => (
            <li key={row.label} className={'readout__row' + (step === i ? ' is-active' : '')}>
              <span className="readout__label"><b>0{i + 1}</b>{row.label}</span>
              <span className="readout__items">{row.items.map(item => <span key={item}>{item}</span>)}</span>
            </li>
          ))}
        </ol>
      </motion.aside>

      <a className="hero__scroll" href="#how" aria-label="Scroll to how it works"><span /></a>
    </section>
  );
}
