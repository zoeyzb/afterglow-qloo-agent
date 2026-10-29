import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DOMAIN_MAP, type DomainId } from '../lib/domains';
import { Eyebrow } from './ui';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    kicker: 'Signals',
    title: 'Pick your favorites.',
    body: 'Add 2–5 things you love: a film, an artist, a book or a place.'
  },
  {
    kicker: 'Patterns',
    title: 'Find the connections.',
    body: 'Qloo looks for cultural affinities across your choices.'
  },
  {
    kicker: 'Discoveries',
    title: 'Discover something new.',
    body: 'Explore related films, music, places and more — with an explanation for each pick.'
  }
];

const SEEDS: { x: number; y: number; label: string; domain: DomainId }[] = [
  { x: 92, y: 130, label: 'Blade Runner 2049', domain: 'film' },
  { x: 92, y: 260, label: 'Frank Ocean', domain: 'music' },
  { x: 92, y: 390, label: 'Norwegian Wood', domain: 'book' }
];
const PATTERNS = [
  { x: 320, y: 175, label: 'Nocturnal' },
  { x: 320, y: 260, label: 'Melancholic' },
  { x: 320, y: 345, label: 'Lush minimalism' }
];
const FINDS: { x: number; y: number; label: string; domain: DomainId; from: number[] }[] = [
  { x: 548, y: 105, label: 'Tokyo', domain: 'destination', from: [0, 1] },
  { x: 548, y: 215, label: 'Severance', domain: 'tv', from: [1, 2] },
  { x: 548, y: 315, label: 'JBS listening bar', domain: 'dining', from: [0, 2] },
  { x: 548, y: 415, label: 'Cocteau Twins', domain: 'music', from: [1, 2] }
];

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
};

function Diagram() {
  return (
    <svg className="story__svg" viewBox="0 0 640 520" role="img" aria-label="Diagram: three signals converge into shared patterns, which branch out into discoveries in other domains">
      <defs>
        <radialGradient id="st-halo">
          <stop offset="0" stopColor="#e9c88f" stopOpacity="0.45" />
          <stop offset="1" stopColor="#e9c88f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="st-halo" cx="320" cy="260" r="150" fill="url(#st-halo)" />
      <g className="st-links-a">
        {SEEDS.flatMap((s, i) => PATTERNS.map((p, j) => (
          <path key={i + '-' + j} d={curve(s.x, s.y, p.x, p.y)} pathLength={1} stroke={DOMAIN_MAP[s.domain].hue} />
        )))}
      </g>
      <g className="st-links-b">
        {FINDS.flatMap((f, i) => f.from.map(j => (
          <path key={i + '-' + j} d={curve(PATTERNS[j].x, PATTERNS[j].y, f.x, f.y)} pathLength={1} stroke={DOMAIN_MAP[f.domain].hue} />
        )))}
      </g>
      <g className="st-seeds">
        {SEEDS.map(s => (
          <g key={s.label} className="st-node" style={{ transformOrigin: `${s.x}px ${s.y}px` }}>
            <circle cx={s.x} cy={s.y} r="16" fill={DOMAIN_MAP[s.domain].hue} opacity="0.18" />
            <circle cx={s.x} cy={s.y} r="7" fill={DOMAIN_MAP[s.domain].hue} />
            <text x={s.x} y={s.y + 34} textAnchor="middle">{s.label}</text>
            <text x={s.x} y={s.y - 24} textAnchor="middle" className="st-domain">{DOMAIN_MAP[s.domain].label}</text>
          </g>
        ))}
      </g>
      <g className="st-patterns">
        {PATTERNS.map(p => (
          <g key={p.label} className="st-node" style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
            <rect x={p.x - 62} y={p.y - 15} width="124" height="30" rx="15" className="st-pill" />
            <text x={p.x} y={p.y + 4.5} textAnchor="middle" className="st-pill-text">{p.label}</text>
          </g>
        ))}
      </g>
      <g className="st-finds">
        {FINDS.map(f => (
          <g key={f.label} className="st-node" style={{ transformOrigin: `${f.x}px ${f.y}px` }}>
            <circle cx={f.x} cy={f.y} r="20" fill={DOMAIN_MAP[f.domain].hue} opacity="0.14" />
            <circle cx={f.x} cy={f.y} r="6" fill={DOMAIN_MAP[f.domain].hue} />
            <text x={f.x} y={f.y + 32} textAnchor="middle">{f.label}</text>
            <text x={f.x} y={f.y - 26} textAnchor="middle" className="st-domain">{DOMAIN_MAP[f.domain].label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function Story() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(-1);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(el);
      gsap.set(q('.st-links-a path, .st-links-b path'), { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(q('.st-patterns .st-node, .st-finds .st-node'), { opacity: 0, scale: 0.4 });
      setActive(0);
      gsap.set(q('.st-halo'), { opacity: 0, scale: 0.5, transformOrigin: '320px 260px' });
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '+=220%',
          pin: q('.story__stage')[0],
          scrub: 0.8,
          onUpdate: self => setActive(self.progress < 0.15 ? 0 : self.progress < 0.55 ? 1 : 2)
        }
      });
      tl.to(q('.st-seeds .st-node'), { scale: 1.25, yoyo: true, repeat: 1, stagger: 0.08, duration: 0.25 })
        .to(q('.st-links-a path'), { strokeDashoffset: 0, stagger: 0.02, duration: 0.8 }, '+=0.05')
        .to(q('.st-halo'), { opacity: 1, scale: 1, duration: 0.8 }, '<0.2')
        .to(q('.st-patterns .st-node'), { opacity: 1, scale: 1, stagger: 0.12, duration: 0.5 }, '<0.3')
        .to(q('.st-links-b path'), { strokeDashoffset: 0, stagger: 0.03, duration: 0.8 }, '+=0.35')
        .to(q('.st-finds .st-node'), { opacity: 1, scale: 1, stagger: 0.1, duration: 0.5 }, '<0.3')
        .to({}, { duration: 0.4 });
      return () => setActive(-1);
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="story" ref={root}>
      <div className="story__stage">
        <div className="story__copy">
          <Eyebrow index="01">How it works</Eyebrow>
          <h2 className="section-title">What you love leads<br />to <em>what’s next.</em></h2>
          <ol className="story__steps" data-active={active}>
            {STEPS.map((s, i) => (
              <li key={s.kicker} className={'story__step' + (active === -1 || active === i ? ' is-active' : '') + (active > i ? ' is-done' : '')}>
                <span className="story__num">0{i + 1}</span>
                <div>
                  <p className="story__kicker">{s.kicker}</p>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="story__visual glass">
          <span className="tag tag--muted story__tag">Illustrative reading</span>
          <Diagram />
          <p className="story__phase" aria-live="off"><span className="story__phase-light" aria-hidden />
            {active === 0 ? '01 · Start with your favorites' : active === 1 ? '02 · Find their shared connections' : active === 2 ? '03 · See what else matches' : 'Favorites → connections → discoveries'}
          </p>
          <div className="story__legend" aria-hidden>
            <span>Your favorites</span><span>Shared traits</span><span>New discoveries</span>
          </div>
        </div>
      </div>
    </section>
  );
}
