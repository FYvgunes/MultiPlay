import type { ComponentType } from 'react';
import type { RoomSnapshot } from '@oyun/shared';
import ChessBoardGame from './chess';

/** Her oyun bileşeninin aldığı ortak proplar. */
export interface GameComponentProps {
  snapshot: RoomSnapshot;
  sendMove: (payload: unknown) => void;
}

// gameId -> React bileşeni. Yeni oyun eklemek için buraya bir satır ekle.
const components: Record<string, ComponentType<GameComponentProps>> = {
  chess: ChessBoardGame,
};

export function getGameComponent(
  gameId: string,
): ComponentType<GameComponentProps> | undefined {
  return components[gameId];
}
