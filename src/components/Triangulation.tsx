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
  i: { verdict: 'Similarity', overlap: 'More space epics', body: 'One favorite only tells us what resembles it. Accurate, predictable, and stuck in one genre.' },
  k: { verdict: 'Similarity', overlap: 'More psych-funk trios', body: 'Great if you want the same thing again. It never leaves the record shop.' },
  p: { verdict: 'Similarity', overlap: 'More literary fantasy', body: 'Same shelf, same aisle. One signal can only point sideways.' },
  ik: { verdict: 'Intersection', overlap: 'Expansive · warm · meditative', body: 'Two signals from different domains cancel out the genre and leave the sensibility behind.' },
  ip: { verdict: 'Intersection', overlap: 'Vast spaces · solitude · quiet awe', body: 'Now we are describing how something feels, not what shelf it sits on.' },
  kp: { verdict: 'Intersection', overlap: 'Hypnotic · dreamlike · gently strange', body: 'The overlap is narrower and far more personal than either signal alone.' },
  ikp: { verdict: 'Signature', overlap: 'Solitary wonder · slow-burn awe · warm hypnotic calm', body: "Specific enough to find things you would never think to search for, in domains you didn't mention." }
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
          <h2 className="section-title">One favorite finds lookalikes.<br />Three find <em>you.</em></h2>
          <p className="section-lede">
            Recommendation engines usually take one thing you liked and stay in its lane. TasteAtlas reads your signals
            <em> together</em>. What matters is the space where they overlap, and that space crosses domains.
          </p>
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
            <p className="fineprint">Illustrative reasoning. Toggle signals to see how the overlap changes.</p>
          </Reveal>

          <div className="why__cards">
            {[
              { n: '1', t: 'Signal → similarity', d: 'Finds lookalikes inside one domain. Useful, but predictable.' },
              { n: '2', t: 'Signals → intersection', d: 'Genre cancels out and the sensibility the two share is left behind.' },
              { n: '3–5', t: 'Signals → signature', d: 'A taste fingerprint precise enough to travel across film, food, places and sound.' }
            ].map((c, i) => (
              <Reveal key={c.n} delay={i * 0.08} className={'why__card glass' + (i === 2 ? ' why__card--hero' : '')}>
                <span className="why__n">{c.n}</span>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </Reveal>
            ))}
            <Reveal delay={0.24} className="why__engine">
              <p>
                <strong>Under the hood.</strong> Qloo's cultural graph links entities across film, TV, music, books,
                podcasts, games, places, destinations and brands using anonymized, privacy-safe affinity data.
                TasteAtlas sends your signals together, so every result comes from the space they share.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
