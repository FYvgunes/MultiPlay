import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Square } from 'chess.js';
import { PieceMesh } from './pieces3d';
import type { ChessGameApi } from './useChessGame';

/** Kare adını dünya koordinatına çevirir (beyaz, kameraya yakın +z). */
function squareToPos(sq: string): [number, number] {
  const f = sq.charCodeAt(0) - 97; // a..h -> 0..7
  const r = sq.charCodeAt(1) - 49; // 1..8 -> 0..7
  return [f - 3.5, -(r - 3.5)];
}

export default function Board3D({ api }: { api: ChessGameApi }) {
  const board = api.game.board(); // 8x8, rank 8 -> rank 1
  const rotated = api.orientation === 'black';

  const squares: { sq: string; x: number; z: number; dark: boolean }[] = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      const sq = String.fromCharCode(97 + f) + (r + 1);
      const [x, z] = squareToPos(sq);
      squares.push({ sq, x, z, dark: (f + r) % 2 === 0 });
    }
  }

  function squareColor(s: { sq: string; dark: boolean }): string {
    if (api.selected === s.sq) return '#f2c14e';
    if (api.checkSquare === s.sq) return '#d34c3f';
    if (api.lastMove && (api.lastMove.from === s.sq || api.lastMove.to === s.sq))
      return s.dark ? '#b08a4a' : '#f0d59a';
    return s.dark ? '#9c6b3c' : '#e9c99b';
  }

  return (
    <div
      className="board-wrap"
      style={{ width: 'min(92vw, 520px)', height: 'min(92vw, 520px)' }}
    >
      <Canvas shadows camera={{ position: [0, 8, 7.5], fov: 42 }}>
        <color attach="background" args={['#221610']} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 11, 6]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          shadow-camera-far={30}
        />

        <group rotation={[0, rotated ? Math.PI : 0, 0]}>
          {/* Taban / çerçeve */}
          <mesh position={[0, -0.25, 0]} receiveShadow>
            <boxGeometry args={[9, 0.5, 9]} />
            <meshStandardMaterial color="#3b2616" roughness={0.7} />
          </mesh>

          {/* Kareler */}
          {squares.map((s) => (
            <mesh
              key={s.sq}
              position={[s.x, -0.02, s.z]}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                api.handleSquareClick(s.sq as Square);
              }}
            >
              <boxGeometry args={[1, 0.12, 1]} />
              <meshStandardMaterial color={squareColor(s)} roughness={0.6} />
            </mesh>
          ))}

          {/* Yasal hamle göstergeleri */}
          {[...api.targets].map(([sq, kind]) => {
            const [x, z] = squareToPos(sq);
            return (
              <mesh key={'t' + sq} position={[x, 0.06, z]}>
                <cylinderGeometry
                  args={
                    kind === 'capture'
                      ? [0.46, 0.46, 0.02, 28]
                      : [0.16, 0.16, 0.02, 20]
                  }
                />
                <meshStandardMaterial
                  color={kind === 'capture' ? '#e53935' : '#3aa655'}
                  transparent
                  opacity={0.55}
                />
              </mesh>
            );
          })}

          {/* Taşlar */}
          {board.map((row) =>
            row.map((cell) => {
              if (!cell) return null;
              const [x, z] = squareToPos(cell.square);
              const lifted = api.selected === cell.square ? 0.18 : 0;
              return (
                <group
                  key={cell.square}
                  position={[x, lifted, z]}
                  onClick={(e) => {
                    e.stopPropagation();
                    api.handleSquareClick(cell.square as Square);
                  }}
                >
                  <PieceMesh type={cell.type} light={cell.color === 'w'} />
                </group>
              );
            }),
          )}
        </group>

        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={16}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
