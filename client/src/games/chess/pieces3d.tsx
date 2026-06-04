import * as THREE from 'three';

// Ahşap 3D taşlar: dosya yok. Gövdeler LatheGeometry (torna edilmiş ahşap
// silüeti) + birkaç ek parça. Geometriler ve malzemeler bir kez üretilir.

function pts(arr: [number, number][]): THREE.Vector2[] {
  return arr.map(([x, y]) => new THREE.Vector2(x, y));
}

const PROFILES: Record<string, [number, number][]> = {
  // [yarıçap, yükseklik] — alttan üste
  p: [
    [0.0, 0], [0.33, 0], [0.33, 0.05], [0.20, 0.09], [0.15, 0.12],
    [0.20, 0.16], [0.11, 0.20], [0.10, 0.30], [0.0, 0.30],
  ],
  r: [
    [0.0, 0], [0.36, 0], [0.36, 0.06], [0.22, 0.10], [0.18, 0.40],
    [0.26, 0.46], [0.27, 0.56], [0.20, 0.56], [0.0, 0.56],
  ],
  b: [
    [0.0, 0], [0.34, 0], [0.34, 0.05], [0.20, 0.10], [0.14, 0.30],
    [0.20, 0.42], [0.10, 0.50], [0.08, 0.56], [0.0, 0.56],
  ],
  n: [
    [0.0, 0], [0.36, 0], [0.36, 0.06], [0.22, 0.11], [0.17, 0.26],
    [0.18, 0.30], [0.0, 0.30],
  ],
  q: [
    [0.0, 0], [0.37, 0], [0.37, 0.06], [0.22, 0.11], [0.15, 0.45],
    [0.22, 0.58], [0.12, 0.70], [0.10, 0.76], [0.0, 0.76],
  ],
  k: [
    [0.0, 0], [0.38, 0], [0.38, 0.06], [0.23, 0.11], [0.16, 0.50],
    [0.24, 0.64], [0.13, 0.76], [0.12, 0.82], [0.0, 0.82],
  ],
};

// Paylaşılan geometri/malzeme. @types/three ile fiber'in three tipleri sürüm
// olarak kayık olduğundan `any` tipliyoruz (runtime'da sorun yok).
/* eslint-disable @typescript-eslint/no-explicit-any */
const BODY: Record<string, any> = {};
for (const k of Object.keys(PROFILES)) {
  BODY[k] = new THREE.LatheGeometry(pts(PROFILES[k]), 28);
}

const LIGHT: any = new THREE.MeshStandardMaterial({
  color: '#e6bd84',
  roughness: 0.5,
  metalness: 0.05,
});
const DARK: any = new THREE.MeshStandardMaterial({
  color: '#46301c',
  roughness: 0.5,
  metalness: 0.05,
});

export function PieceMesh({ type, light }: { type: string; light: boolean }) {
  const mat = light ? LIGHT : DARK;
  return (
    <group>
      <mesh geometry={BODY[type]} material={mat} castShadow receiveShadow />

      {type === 'p' && (
        <mesh material={mat} position={[0, 0.38, 0]} castShadow>
          <sphereGeometry args={[0.14, 18, 18]} />
        </mesh>
      )}

      {type === 'b' && (
        <mesh material={mat} position={[0, 0.6, 0]} castShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
        </mesh>
      )}

      {type === 'r' &&
        [0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh
              key={i}
              material={mat}
              position={[Math.cos(a) * 0.18, 0.6, Math.sin(a) * 0.18]}
              castShadow
            >
              <boxGeometry args={[0.1, 0.1, 0.1]} />
            </mesh>
          );
        })}

      {type === 'q' && (
        <>
          <mesh material={mat} position={[0, 0.8, 0]} castShadow>
            <sphereGeometry args={[0.1, 16, 16]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={i}
                material={mat}
                position={[Math.cos(a) * 0.13, 0.74, Math.sin(a) * 0.13]}
                castShadow
              >
                <sphereGeometry args={[0.05, 10, 10]} />
              </mesh>
            );
          })}
        </>
      )}

      {type === 'k' && (
        <>
          <mesh material={mat} position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.07, 0.22, 0.07]} />
          </mesh>
          <mesh material={mat} position={[0, 0.92, 0]} castShadow>
            <boxGeometry args={[0.18, 0.07, 0.07]} />
          </mesh>
        </>
      )}

      {type === 'n' && (
        <group position={[0, 0.3, 0]} rotation={[0.35, 0, 0]}>
          <mesh material={mat} position={[0, 0.12, 0.02]} castShadow>
            <boxGeometry args={[0.16, 0.34, 0.2]} />
          </mesh>
          <mesh material={mat} position={[0, 0.22, 0.16]} castShadow>
            <boxGeometry args={[0.14, 0.12, 0.18]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
