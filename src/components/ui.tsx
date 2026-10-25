import { Component, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function Reveal({ children, delay = 0, y = 28, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'li' | 'article' | 'header' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}

export function Eyebrow({ children, index }: { children: ReactNode; index?: string }) {
  return (
    <p className="eyebrow">
      {index && <span className="eyebrow__index">{index}</span>}
      <span className="eyebrow__line" aria-hidden />
      {children}
    </p>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo-mark">
      <defs>
        <radialGradient id="lm-core" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff4dc" />
          <stop offset="0.6" stopColor="#e3bd7c" />
          <stop offset="1" stopColor="#a8783f" />
        </radialGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="14" ry="6" fill="none" stroke="#e3c48f" strokeOpacity="0.55" strokeWidth="1" transform="rotate(-28 16 16)" />
      <ellipse cx="16" cy="16" rx="14" ry="6" fill="none" stroke="#a98bff" strokeOpacity="0.45" strokeWidth="1" transform="rotate(32 16 16)" />
      <circle cx="16" cy="16" r="4.6" fill="url(#lm-core)" />
      <circle cx="27.4" cy="9.6" r="1.6" fill="#5fd0bd" />
      <circle cx="5.2" cy="21.8" r="1.3" fill="#f2a65a" />
    </svg>
  );
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
