import type { ComponentType } from 'react';
import type { RoomSnapshot } from '@oyun/shared';
import ChessBoardGame from './chess';
import QuizGame from './quiz';
import TicTacToeGame from './tictactoe';
import HangmanGame from './hangman';
import NameCityGame from './namecity';
import WordleGame from './wordle';
import DamaGame from './dama';
import TombalaGame from './tombala';

/** Her oyun bileşeninin aldığı ortak proplar. */
export interface GameComponentProps {
  snapshot: RoomSnapshot;
  sendMove: (payload: unknown) => void;
}

// gameId -> React bileşeni. Yeni oyun eklemek için buraya bir satır ekle.
const components: Record<string, ComponentType<GameComponentProps>> = {
  chess: ChessBoardGame,
  quiz: QuizGame,
  tictactoe: TicTacToeGame,
  hangman: HangmanGame,
  namecity: NameCityGame,
  wordle: WordleGame,
  dama: DamaGame,
  tombala: TombalaGame,
};

export function getGameComponent(
  gameId: string,
): ComponentType<GameComponentProps> | undefined {
  return components[gameId];
}
