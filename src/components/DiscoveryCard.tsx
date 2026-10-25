import { motion } from 'framer-motion';
import { DOMAIN_MAP } from '../lib/domains';
import type { Atlas, Discovery } from '../lib/types';

interface Props {
  item: Discovery;
  atlas: Atlas;
  index: number;
  selected: boolean;
  saved: boolean;
  onFocus: (key: string | null) => void;
  onToggleSave: () => void;
  focusKey: string;
}

const pct = (n: number) => Math.round(n * 100) + '%';

function orbitLabel(popularity: number | null) {
  if (popularity === null) return null;
  if (popularity >= 0.85) return 'Well-known';
  if (popularity >= 0.6) return 'Familiar';
  if (popularity >= 0.35) return 'Under the radar';
  return 'Deep cut';
}

export default function DiscoveryCard({ item, atlas, index, selected, saved, onFocus, onToggleSave, focusKey }: Props) {
  const domain = DOMAIN_MAP[item.domain];
  const seedName = (id: string) => atlas.resolved.find(r => r.id === id)?.name ?? 'One of your signals';
  const seedHue = (id: string) => DOMAIN_MAP[atlas.resolved.find(r => r.id === id)?.domain ?? 'film']?.hue;
  const reach = orbitLabel(item.popularity);
  const isSample = atlas.source === 'sample';

  return (
    <motion.article
      layout
      className={'card' + (selected ? ' is-selected' : '')}
      style={{ ['--hue' as string]: domain.hue }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => onFocus(focusKey)}
      onMouseLeave={() => onFocus(null)}
      onFocus={() => onFocus(focusKey)}
      tabIndex={0}
      aria-label={item.name + ', ' + domain.label}
    >
      <header className="card__head">
        <div className="card__planet" aria-hidden>
          {item.image ? <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>{domain.glyph}</span>}
        </div>
        <div className="card__title">
          <p className="card__domain">{domain.label} <span>· #{item.rank + 1}</span></p>
          <h3>{item.name}</h3>
          {item.subtitle && <p className="card__sub">{item.subtitle}</p>}
        </div>
        <button type="button" className={'card__save' + (saved ? ' is-saved' : '')} onClick={onToggleSave} aria-pressed={saved} aria-label={(saved ? 'Remove ' : 'Save ') + item.name}>
          {saved ? '✦' : '✧'}
        </button>
      </header>

      <div className="card__why">
        <p className="card__why-title">Why it's in your atlas</p>
        {item.drivers.length > 0 ? (
          <ul className="drivers" aria-label="Which of your signals pulled this in">
            {item.drivers.slice(0, 3).map(d => (
              <li key={d.id}>
                <span className="drivers__name">{seedName(d.id)}</span>
                <span className="drivers__bar"><motion.i style={{ background: seedHue(d.id) }} initial={{ width: 0 }} whileInView={{ width: pct(d.share) }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} /></span>
                <span className="drivers__pct">{pct(d.share)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card__muted">Qloo didn't return per-signal attribution for this pick. It's aligned with your signals as a whole.</p>
        )}
        {item.sharedPatterns.length > 0 && (
          <div className="card__patterns">
            <span>Shares</span>
            {item.sharedPatterns.map(p => <em key={p}>{p}</em>)}
          </div>
        )}
        {item.note && <p className="card__note">“{item.note}”</p>}
      </div>

      <footer className="card__meta">
        {item.affinity !== null && (
          <span className="meter" title="Qloo affinity score for your combined signals">
            <span>Affinity</span>
            <span className="meter__track"><i style={{ width: pct(Math.min(Math.max(item.affinity, 0), 1)) }} /></span>
            <b>{item.affinity.toFixed(2)}</b>
          </span>
        )}
        {reach && <span className="tag tag--muted" title="Based on Qloo popularity">{reach}</span>}
        <span className={'tag ' + (isSample ? 'tag--warn' : 'tag--live')}>{isSample ? 'Sample' : 'Qloo'}</span>
      </footer>
    </motion.article>
  );
}
