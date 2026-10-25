import { useEffect, useState } from 'react';
import type { LiveStatus } from '../lib/api';
import { LogoMark } from './ui';

const STATUS_COPY: Record<LiveStatus, { label: string; title: string }> = {
  checking: { label: 'Checking engine', title: 'Checking whether live Qloo access is configured.' },
  configured: { label: 'Live engine ready', title: 'A Qloo key is configured on this server. Results come from the live Qloo API.' },
  offline: { label: 'Live engine offline', title: 'No Qloo key is configured on this deployment. You will see an honest error instead of invented results.' },
  unknown: { label: 'Engine status unknown', title: 'The status endpoint could not be reached.' }
};

export function LiveBadge({ status }: { status: LiveStatus }) {
  const copy = STATUS_COPY[status];
  return (
    <span className={'live-badge live-badge--' + status} title={copy.title}>
      <span className="live-badge__dot" aria-hidden />
      {copy.label}
    </span>
  );
}

export default function Nav({ status, savedCount, onOpenCollection }: { status: LiveStatus; savedCount: number; onOpenCollection: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={'nav' + (scrolled ? ' nav--scrolled' : '')}>
      <a className="brand" href="#top" aria-label="TasteAtlas AI home">
        <LogoMark />
        <span>TasteAtlas<sup>AI</sup></span>
      </a>
      <nav className="nav__links" aria-label="Primary">
        <a href="#how">How it works</a>
        <a href="#why">Why it works</a>
        <a href="#chart">Chart yours</a>
      </nav>
      <div className="nav__actions">
        <LiveBadge status={status} />
        <button type="button" className="nav__collection" onClick={onOpenCollection} aria-label={'Open saved discoveries (' + savedCount + ')'}>
          <span aria-hidden>✦</span> {savedCount}
        </button>
        <a className="btn btn--gold btn--sm" href="#chart">Chart my taste</a>
      </div>
    </header>
  );
}
