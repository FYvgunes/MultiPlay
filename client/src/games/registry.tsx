import { lazy, type ComponentType } from 'react';
import type { RoomSnapshot } from '@oyun/shared';

/** Her oyun bileşeninin aldığı ortak proplar. */
export interface GameComponentProps {
  snapshot: RoomSnapshot;
  sendMove: (payload: unknown) => void;
}

// gameId -> React bileşeni. Hız için her oyun TEMBEL (lazy) yüklenir:
// kullanıcı yalnızca oynadığı oyunun JS'ini indirir (chess.js + react-chessboard
// gibi ağır bağımlılıklar ana bundle'dan çıkar). Yeni oyun = buraya bir satır.
const components: Record<string, ComponentType<GameComponentProps>> = {
  chess: lazy(() => import('./chess')),
  quiz: lazy(() => import('./quiz')),
  tictactoe: lazy(() => import('./tictactoe')),
  hangman: lazy(() => import('./hangman')),
  namecity: lazy(() => import('./namecity')),
  wordle: lazy(() => import('./wordle')),
  dama: lazy(() => import('./dama')),
  tombala: lazy(() => import('./tombala')),
};

export function getGameComponent(
  gameId: string,
): ComponentType<GameComponentProps> | undefined {
  return components[gameId];
}
