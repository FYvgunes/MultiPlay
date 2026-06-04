import type { CSSProperties } from 'react';

// Ahşap görünümlü taşlar: dosya yok. Unicode taş glifleri + ahşap gradyan
// (background-clip: text) + oyma/kabartma gölgesi ile hafif 3D his.

const GLYPH: Record<string, string> = {
  P: '♟',
  N: '♞',
  B: '♝',
  R: '♜',
  Q: '♛',
  K: '♚',
};

const LIGHT_WOOD =
  'linear-gradient(155deg, #f3d8a6 0%, #e3b878 40%, #c8924e 100%)';
const DARK_WOOD =
  'linear-gradient(155deg, #7a4d27 0%, #4f3119 55%, #2c1a0d 100%)';

function pieceStyle(light: boolean, size: number): CSSProperties {
  return {
    fontSize: size * 0.82,
    lineHeight: 1,
    background: light ? LIGHT_WOOD : DARK_WOOD,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextStroke: light ? '1.2px #8a5a2b' : '1.2px #160d06',
    filter: 'drop-shadow(1px 3px 2px rgba(0,0,0,0.45))',
    userSelect: 'none',
  };
}

type PieceFn = (props: { squareWidth: number }) => JSX.Element;

function make(letter: string, light: boolean): PieceFn {
  return ({ squareWidth }) => (
    <div
      style={{
        width: squareWidth,
        height: squareWidth,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={pieceStyle(light, squareWidth)}>{GLYPH[letter]}</span>
    </div>
  );
}

// react-chessboard customPieces: { wK, wQ, ..., bK, bQ, ... }
export const woodPieces: Record<string, PieceFn> = {};
for (const letter of Object.keys(GLYPH)) {
  woodPieces[`w${letter}`] = make(letter, true);
  woodPieces[`b${letter}`] = make(letter, false);
}
