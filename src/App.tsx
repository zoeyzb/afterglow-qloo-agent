import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Triangulation from './components/Triangulation';
import Builder from './components/Builder';
import Results, { type RunState } from './components/Results';
import { CollectionDrawer, FinalCTA, Footer, Principles } from './components/Closing';
import { AtlasError, chartAtlas, fetchStatus, type LiveStatus } from './lib/api';
import { useCollection } from './lib/collection';
import { SAMPLE_ATLAS } from './lib/sample';
import type { AtlasRequest } from './lib/types';

const Story = lazy(() => import('./components/Story'));

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  });
}

function DeferredStory() {
  const host = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element || loaded) return;
    if (typeof IntersectionObserver === 'undefined') { setLoaded(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setLoaded(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loaded]);

  return (
    <div className="story-deferred" id="how" ref={host}>
      {loaded ? (
        <Suspense fallback={<div className="story-placeholder" aria-hidden="true" />}>
          <Story />
        </Suspense>
      ) : <div className="story-placeholder" aria-hidden="true" />}
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<LiveStatus>('checking');
  const [run, setRun] = useState<RunState>({ phase: 'idle' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [example, setExample] = useState<{ id: string; nonce: number } | null>(null);
  const openCollection = useCallback(() => setDrawerOpen(true), []);
  const closeCollection = useCallback(() => setDrawerOpen(false), []);
  const collection = useCollection();
  const lastRequest = useRef<AtlasRequest | null>(null);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => { fetchStatus().then(setStatus); }, []);

  const chart = useCallback(async (request: AtlasRequest) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    lastRequest.current = request;
    setRun({ phase: 'loading', signalCount: request.signals.length });
    try {
      const atlas = await chartAtlas(request, controller.signal);
      setRun({ phase: 'ready', atlas });
      setStatus('configured');
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      const e = error instanceof AtlasError ? error : new AtlasError('Something went wrong while charting.', 'upstream');
      if (e.code === 'not_configured') setStatus('offline');
      setRun({ phase: 'error', code: e.code, message: e.message });
    } finally {
      if (inflight.current === controller) inflight.current = null;
    }
  }, []);

  const retry = useCallback(() => { if (lastRequest.current) chart(lastRequest.current); }, [chart]);
  const showSample = useCallback(() => {
    inflight.current?.abort();
    lastRequest.current = null;
    setRun({ phase: 'ready', atlas: SAMPLE_ATLAS });
    scrollToSection('atlas');
  }, []);
  const loadExample = useCallback((id: string) => {
    setExample({ id, nonce: Date.now() });
    scrollToSection('chart');
  }, []);

  return (
    <>
      <a className="skip-link" href="#chart">Skip to the atlas builder</a>
      <Nav status={status} savedCount={collection.items.length} onOpenCollection={openCollection} onSample={showSample} />
      <main>
        <Hero status={status} onSample={showSample} />
        <DeferredStory />
        <Triangulation />
        <Builder busy={run.phase === 'loading'} status={status} example={example} onSubmit={chart} onSample={showSample} />
        <Results run={run} collection={collection} onRetry={retry} onSample={showSample} />
        <Principles />
        <FinalCTA onExample={loadExample} />
      </main>
      <Footer />
      <CollectionDrawer open={drawerOpen} onClose={closeCollection} collection={collection} />
    </>
  );
}
