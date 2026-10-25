import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DOMAIN_MAP, type DomainId } from '../lib/domains';
import { Eyebrow, Reveal } from './ui';

const SIGNALS: { key: string; name: string; domain: DomainId; cx: number; cy: number }[] = [
  { key: 'i', name: 'Interstellar', domain: 'film', cx: 160, cy: 135 },
  { key: 'k', name: 'Khruangbin', domain: 'music', cx: 240, cy: 135 },
  { key: 'p', name: 'Piranesi', domain: 'book', cx: 200, cy: 205 }
];

const READINGS: Record<string, { verdict: string; overlap: string; body: string }> = {
  i: { verdict: 'Similar picks', overlap: 'More space epics', body: 'One favorite often leads to more of the same.' },
  k: { verdict: 'Similar picks', overlap: 'More psych-funk trios', body: 'One artist can point toward similar sounds.' },
  p: { verdict: 'Similar picks', overlap: 'More literary fantasy', body: 'One book can lead to another like it.' },
  ik: { verdict: 'Shared traits', overlap: 'Expansive · warm · meditative', body: 'Together, they reveal affinities beyond their genres.' },
  ip: { verdict: 'Shared traits', overlap: 'Vast spaces · solitude · quiet awe', body: 'Different categories can still share a feeling.' },
  kp: { verdict: 'Shared traits', overlap: 'Hypnotic · dreamlike · gently strange', body: 'Two favorites point to a more specific mood.' },
  ikp: { verdict: 'Taste profile', overlap: 'Solitary wonder · slow-burn awe · warm hypnotic calm', body: 'Use these shared themes to explore other cultural categories.' }
};

export default function Triangulation() {
  const [on, setOn] = useState<Record<string, boolean>>({ i: true, k: true, p: true });
  const comboKey = SIGNALS.filter(s => on[s.key]).map(s => s.key).join('');
  const reading = READINGS[comboKey];
  const count = comboKey.length;
  const toggle = (key: string) => setOn(prev => {
    const next = { ...prev, [key]: !prev[key] };
    return Object.values(next).some(Boolean) ? next : prev;
  });

  return (
    <section className="why section" id="why">
      <div className="container">
        <Reveal className="section-head">
          <Eyebrow index="02">Why combining loves works</Eyebrow>
          <h2 className="section-title">One favorite finds similar.<br />A few show <em>connections.</em></h2>
          <p className="section-lede">A film, a song and a book can share a mood. Toggle the examples to see how their overlap changes.</p>
        </Reveal>

        <div className="why__grid">
          <Reveal className="venn glass">
            <div className="venn__toggles" role="group" aria-label="Toggle example signals">
              {SIGNALS.map(s => (
                <button key={s.key} type="button" aria-pressed={on[s.key]} className={'chip' + (on[s.key] ? ' is-on' : '')} style={{ ['--hue' as string]: DOMAIN_MAP[s.domain].hue }} onClick={() => toggle(s.key)}>
                  <span className="chip__dot" aria-hidden />{s.name}<small>{DOMAIN_MAP[s.domain].label}</small>
                </button>
              ))}
            </div>
            <svg viewBox="0 0 400 320" className="venn__svg" aria-hidden>
              <defs>
                <radialGradient id="venn-core"><stop offset="0" stopColor="#fff2d6" /><stop offset="1" stopColor="#e3bd7c" stopOpacity="0" /></radialGradient>
              </defs>
              {SIGNALS.map(s => (
                <motion.circle
                  key={s.key}
                  cx={s.cx}
                  cy={s.cy}
                  r={78}
                  fill={DOMAIN_MAP[s.domain].hue}
                  stroke={DOMAIN_MAP[s.domain].hue}
                  animate={{ fillOpacity: on[s.key] ? 0.13 : 0.02, strokeOpacity: on[s.key] ? 0.75 : 0.12, scale: on[s.key] ? 1 : 0.92 }}
                  style={{ transformOrigin: `${s.cx}px ${s.cy}px`, mixBlendMode: 'screen' }}
                  strokeWidth={1.2}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
              <motion.circle cx={200} cy={158} fill="url(#venn-core)" animate={{ r: count === 3 ? 34 : count === 2 ? 22 : 0, opacity: count > 1 ? 1 : 0 }} transition={{ duration: 0.7 }} />
              {SIGNALS.map(s => (
                <motion.text key={s.key} x={s.key === 'i' ? s.cx - 40 : s.key === 'k' ? s.cx + 40 : s.cx} y={s.key === 'p' ? s.cy + 50 : s.cy - 32} textAnchor="middle" className="venn__label" animate={{ opacity: on[s.key] ? 1 : 0.3 }}>
                  {s.name}
                </motion.text>
              ))}
            </svg>
            <AnimatePresence mode="wait">
              <motion.div key={comboKey} className="venn__reading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} aria-live="polite">
                <span className={'tag' + (count === 3 ? ' tag--gold' : ' tag--muted')}>{count} signal{count > 1 ? 's' : ''} → {reading.verdict}</span>
                <strong>{reading.overlap}</strong>
                <p>{reading.body}</p>
              </motion.div>
            </AnimatePresence>
            <p className="fineprint">Example only. Tap a favorite above to change the highlighted step.</p>
          </Reveal>

          <div className="why__cards">
            {[
              { n: '1', t: 'One favorite', d: 'Find things similar to what you already like.' },
              { n: '2', t: 'Two favorites', d: 'Spot patterns that cross different categories.' },
              { n: '3–5', t: 'A clearer taste map', d: 'Use shared themes to find something less obvious.' }
            ].map((c, i) => (
              <Reveal key={c.n} delay={i * 0.08} className={'why__card glass' + (i === (count === 1 ? 0 : count === 2 ? 1 : 2) ? ' why__card--hero is-current' : '')}>
                <span className="why__n">{c.n}</span>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </Reveal>
            ))}
            <Reveal delay={0.24} className="why__engine">
              <p>
                <strong>Behind the map.</strong> Qloo uses aggregate cultural affinities across films, music, books and places.
                Results are recommendations, not claims about your personality.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
