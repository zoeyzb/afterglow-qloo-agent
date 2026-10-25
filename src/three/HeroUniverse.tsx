import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { DOMAINS } from '../lib/domains';
import { fresnelFragment, fresnelVertex, glowTexture } from './glow';

interface Props { active: boolean; reducedMotion: boolean; showLabels: boolean }

const ORBITS = DOMAINS.slice(0, 7).map((d, i) => ({
  domain: d,
  radius: 2.3 + i * 0.42,
  speed: (0.16 - i * 0.012) * (i % 2 ? -1 : 1),
  tilt: new THREE.Euler(1.1 + Math.sin(i * 1.7) * 0.5, Math.cos(i * 2.3) * 0.6, i * 0.45),
  phase: i * 1.37
}));

function Starfield({ count = 1600 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const warm = new THREE.Color('#f1d6a8'), cool = new THREE.Color('#a9b8ff'), white = new THREE.Color('#ffffff');
    for (let i = 0; i < count; i++) {
      const r = 14 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)], i * 3);
      const c = white.clone().lerp(Math.random() > 0.5 ? warm : cool, Math.random() * 0.7);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [count]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.008; });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.32} map={glowTexture()} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation opacity={0.9} />
    </points>
  );
}

function Core() {
  const shell = useRef<THREE.Mesh>(null);
  const lattice = useRef<THREE.LineSegments>(null);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#f3d29b') }, uDeep: { value: new THREE.Color('#2a1d3f') }, uTime: { value: 0 } }), []);
  const latticeGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.25, 1)), []);
  useFrame(({ clock }, dt) => {
    uniforms.uTime.value = clock.elapsedTime;
    if (shell.current) shell.current.rotation.y += dt * 0.1;
    if (lattice.current) { lattice.current.rotation.y -= dt * 0.14; lattice.current.rotation.x += dt * 0.05; }
  });
  return (
    <group>
      <mesh ref={shell}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial vertexShader={fresnelVertex} fragmentShader={fresnelFragment} uniforms={uniforms} transparent depthWrite={false} />
      </mesh>
      <lineSegments ref={lattice} geometry={latticeGeo}>
        <lineBasicMaterial color="#e9c88f" transparent opacity={0.28} />
      </lineSegments>
      <mesh scale={0.42}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffe6b8" />
      </mesh>
      <sprite scale={[5.5, 5.5, 1]}>
        <spriteMaterial map={glowTexture()} color="#d9a96a" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

function Orbits({ showLabels }: { showLabels: boolean }) {
  const nodes = useRef<(THREE.Group | null)[]>([]);
  const linkRef = useRef<THREE.LineSegments>(null);
  const ringGeos = useMemo(() => ORBITS.map(o => {
    const pts = new THREE.EllipseCurve(0, 0, o.radius, o.radius, 0, Math.PI * 2).getPoints(160);
    return new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, 0)));
  }), []);
  const linkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ORBITS.length * 2 * 2 * 3), 3));
    return g;
  }, []);
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), m: new THREE.Matrix4() }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = linkGeo.getAttribute('position') as THREE.BufferAttribute;
    const world: THREE.Vector3[] = [];
    ORBITS.forEach((o, i) => {
      const g = nodes.current[i];
      if (!g) return;
      const a = o.phase + t * o.speed;
      tmp.a.set(Math.cos(a) * o.radius, Math.sin(a) * o.radius, 0).applyEuler(o.tilt);
      g.position.copy(tmp.a);
      world.push(tmp.a.clone());
    });
    // Each node links to the core and to its neighbour: the "constellation" of your taste.
    let k = 0;
    world.forEach((p, i) => {
      const next = world[(i + 1) % world.length];
      pos.setXYZ(k++, 0, 0, 0); pos.setXYZ(k++, p.x, p.y, p.z);
      pos.setXYZ(k++, p.x, p.y, p.z); pos.setXYZ(k++, next.x, next.y, next.z);
    });
    pos.needsUpdate = true;
    if (linkRef.current) (linkRef.current.material as THREE.LineBasicMaterial).opacity = 0.1 + Math.sin(t * 0.7) * 0.05;
  });

  return (
    <group>
      {ORBITS.map((o, i) => (
        <group key={o.domain.id}>
          <lineLoop geometry={ringGeos[i]} rotation={o.tilt}>
            <lineBasicMaterial color={o.domain.hue} transparent opacity={0.16} />
          </lineLoop>
          <group ref={el => { nodes.current[i] = el; }}>
            <mesh>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshBasicMaterial color={o.domain.hue} />
            </mesh>
            <sprite scale={[0.9, 0.9, 1]}>
              <spriteMaterial map={glowTexture()} color={o.domain.hue} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
            {showLabels && (
              <Html center distanceFactor={9} style={{ pointerEvents: 'none' }} zIndexRange={[5, 0]}>
                <span className="orbit-label" style={{ ['--hue' as string]: o.domain.hue }}>{o.domain.label}</span>
              </Html>
            )}
          </group>
        </group>
      ))}
      <lineSegments ref={linkRef} geometry={linkGeo}>
        <lineBasicMaterial color="#f3dcb2" transparent opacity={0.12} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

function Rig({ reducedMotion, showLabels }: { reducedMotion: boolean; showLabels: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ pointer, camera }, dt) => {
    const g = group.current;
    if (!g) return;
    const scroll = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.2);
    const targetX = reducedMotion ? 0.25 : 0.25 + pointer.y * 0.18;
    const targetY = reducedMotion ? 0 : pointer.x * 0.3;
    g.rotation.x += (targetX - g.rotation.x) * Math.min(dt * 2, 1);
    g.rotation.y += (targetY + (reducedMotion ? 0 : scroll * 0.9) - g.rotation.y) * Math.min(dt * 2, 1);
    camera.position.z += (9.5 - scroll * 3.2 - camera.position.z) * Math.min(dt * 3, 1);
  });
  return (
    <group ref={group}>
      <Core />
      <Orbits showLabels={showLabels} />
    </group>
  );
}

export default function HeroUniverse({ active, reducedMotion, showLabels }: Props) {
  return (
    <Canvas
      className="hero-canvas"
      frameloop={active && !reducedMotion ? 'always' : 'demand'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 9.5], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <Starfield count={showLabels ? 1600 : 900} />
      <group position={showLabels ? [3.7, 0.35, 0] : [0, 0.6, 0]} scale={showLabels ? 0.82 : 0.72}>
        <Rig reducedMotion={reducedMotion} showLabels={showLabels} />
      </group>
    </Canvas>
  );
}
