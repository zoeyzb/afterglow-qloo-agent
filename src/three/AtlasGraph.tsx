import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { DOMAIN_MAP } from '../lib/domains';
import type { Atlas } from '../lib/types';
import { discoveryKey } from '../lib/keys';
import { glowTexture } from './glow';

interface Props {
  atlas: Atlas;
  selected: string | null;
  onSelect: (key: string | null) => void;
  active: boolean;
  reducedMotion: boolean;
}

type Kind = 'seed' | 'pattern' | 'discovery';
interface GraphNode { key: string; kind: Kind; label: string; color: string; pos: THREE.Vector3; size: number }
interface GraphEdge { from: string; to: string; color: string; strength: number }

const PATTERN_GOLD = '#e9c88f';
// On touch screens, drag-to-rotate would trap vertical page scrolling; tapping stars still works.
const coarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

function layout(atlas: Atlas) {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seedCount = atlas.resolved.length;
  atlas.resolved.forEach((s, i) => {
    const a = (i / seedCount) * Math.PI * 2 + Math.PI / 2;
    nodes.push({ key: 's:' + s.id, kind: 'seed', label: s.name, color: DOMAIN_MAP[s.domain]?.hue ?? '#fff', pos: new THREE.Vector3(Math.cos(a) * 1.5, Math.sin(a) * 1.5, Math.sin(i * 2.1) * 0.4), size: 0.15 });
    edges.push({ from: 'core', to: 's:' + s.id, color: PATTERN_GOLD, strength: 0.5 });
  });
  const patterns = atlas.patterns.slice(0, 10);
  patterns.forEach((p, i) => {
    const a = (i / Math.max(patterns.length, 1)) * Math.PI * 2 + 0.3;
    const z = Math.cos(i * 1.9) * 0.9;
    nodes.push({ key: 'p:' + p.name.toLowerCase(), kind: 'pattern', label: p.name, color: PATTERN_GOLD, pos: new THREE.Vector3(Math.cos(a) * 2.75, Math.sin(a) * 2.75, z), size: 0.07 });
  });
  const lenses = atlas.lenses.filter(l => l.items.length);
  const sector = (Math.PI * 2) / Math.max(lenses.length, 1);
  lenses.forEach((lens, li) => {
    const hue = DOMAIN_MAP[lens.domain]?.hue ?? '#fff';
    lens.items.forEach((item, ii) => {
      const spread = sector * 0.72;
      const a = li * sector + (sector - spread) / 2 + (lens.items.length > 1 ? (ii / (lens.items.length - 1)) * spread : spread / 2) - Math.PI / 2;
      const depth = item.popularity !== null ? 1 - Math.min(Math.max(item.popularity, 0), 1) : ii / Math.max(lens.items.length, 1);
      const r = 4.1 + depth * 1.3;
      const key = discoveryKey(item);
      nodes.push({ key, kind: 'discovery', label: item.name, color: hue, pos: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, Math.sin(ii * 1.3 + li) * 1.1), size: 0.11 });
      const strong = item.drivers.filter(d => d.share >= 0.12);
      if (strong.length) strong.forEach(d => edges.push({ from: key, to: 's:' + d.id, color: hue, strength: d.share }));
      else edges.push({ from: key, to: 'core', color: hue, strength: 0.25 });
      item.sharedPatterns.forEach(name => {
        const pk = 'p:' + name.toLowerCase();
        if (nodes.some(n => n.key === pk)) edges.push({ from: key, to: pk, color: PATTERN_GOLD, strength: 0.35 });
      });
    });
  });
  patterns.forEach(p => edges.push({ from: 'p:' + p.name.toLowerCase(), to: 'core', color: PATTERN_GOLD, strength: 0.15 }));
  return { nodes, edges };
}

function Node({ node, state, onHover, onSelect }: { node: GraphNode; state: 'idle' | 'lit' | 'dim'; onHover: (k: string | null) => void; onSelect: (k: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = state === 'lit' ? 1.6 : state === 'dim' ? 0.75 : 1;
    const s = ref.current.scale.x + (target - ref.current.scale.x) * Math.min(dt * 8, 1);
    ref.current.scale.setScalar(s);
  });
  const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();
  const showLabel = node.kind === 'seed' || state === 'lit';
  return (
    <group
      ref={ref}
      position={node.pos}
      onPointerOver={e => { stop(e); onHover(node.key); document.body.style.cursor = 'pointer'; }}
      onPointerOut={e => { stop(e); onHover(null); document.body.style.cursor = ''; }}
      onClick={e => { stop(e); onSelect(node.key); }}
    >
      <mesh>
        <sphereGeometry args={[node.size, 20, 20]} />
        <meshBasicMaterial color={node.color} transparent opacity={state === 'dim' ? 0.35 : 1} />
      </mesh>
      <sprite scale={[node.size * 9, node.size * 9, 1]}>
        <spriteMaterial map={glowTexture()} color={node.color} transparent opacity={state === 'dim' ? 0.15 : 0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {node.kind === 'discovery' && <mesh><sphereGeometry args={[node.size * 2.6, 12, 12]} /><meshBasicMaterial visible={false} /></mesh>}
      {showLabel && (
        <Html center distanceFactor={10} position={[0, node.size + 0.32, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <span className={'graph-label graph-label--' + node.kind} style={{ ['--hue' as string]: node.color }}>{node.label}</span>
        </Html>
      )}
    </group>
  );
}

function Graph({ atlas, selected, onSelect, reducedMotion }: Omit<Props, 'active'>) {
  const { nodes, edges } = useMemo(() => layout(atlas), [atlas]);
  const [hovered, setHovered] = useState<string | null>(null);
  const focus = hovered ?? selected;
  const byKey = useMemo(() => {
    const m = new Map(nodes.map(n => [n.key, n.pos] as const));
    m.set('core', new THREE.Vector3());
    return m;
  }, [nodes]);
  const curves = useMemo(() => edges.map(e => {
    const a = byKey.get(e.from), b = byKey.get(e.to);
    if (!a || !b) return null;
    const mid = a.clone().add(b).multiplyScalar(0.54);
    return new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(20);
  }), [edges, byKey]);
  const linked = useMemo(() => {
    if (!focus) return null;
    const set = new Set([focus]);
    edges.forEach(e => { if (e.from === focus) set.add(e.to); if (e.to === focus) set.add(e.from); });
    return set;
  }, [focus, edges]);
  const core = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (core.current) core.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.4) * 0.06); });

  return (
    <>
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={!coarsePointer} autoRotate={!reducedMotion && !focus} autoRotateSpeed={0.45} rotateSpeed={0.5} />
      <mesh ref={core} onClick={() => onSelect(null)}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshBasicMaterial color="#f6dcaa" />
      </mesh>
      <sprite scale={[3.4, 3.4, 1]}>
        <spriteMaterial map={glowTexture()} color="#d7a463" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {edges.map((e, i) => {
        const curve = curves[i];
        if (!curve) return null;
        const on = focus !== null && (e.from === focus || e.to === focus);
        return (
          <Line
            key={i}
            points={curve}
            color={e.color}
            transparent
            opacity={linked ? (on ? 0.9 : 0.04) : 0.1 + e.strength * 0.35}
            lineWidth={on ? 1.2 + e.strength * 2.4 : 0.6 + e.strength * 1.2}
            depthWrite={false}
          />
        );
      })}
      {nodes.map(n => (
        <Node key={n.key} node={n} state={linked ? (linked.has(n.key) ? 'lit' : 'dim') : 'idle'} onHover={setHovered} onSelect={onSelect} />
      ))}
    </>
  );
}

export default function AtlasGraph({ active, ...props }: Props) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ position: [0, -3.4, 12.6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <Graph {...props} />
    </Canvas>
  );
}
