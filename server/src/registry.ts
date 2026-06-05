import type { GameModule, GameInfo } from '@oyun/shared';
import { chessModule } from './games/chess.js';
import { quizModule } from './games/quiz.js';
import { tictactoeModule } from './games/tictactoe.js';
import { hangmanModule } from './games/hangman.js';
import { namecityModule } from './games/namecity.js';
import { wordleModule } from './games/wordle.js';

// gameId -> GameModule. Yeni oyun eklemek için: modülü yaz ve buraya kaydet.
const modules = new Map<string, GameModule>();

function register(m: GameModule) {
  modules.set(m.id, m);
}

register(chessModule as unknown as GameModule);
register(quizModule as unknown as GameModule);
register(tictactoeModule as unknown as GameModule);
register(hangmanModule as unknown as GameModule);
register(namecityModule as unknown as GameModule);
register(wordleModule as unknown as GameModule);

export function getModule(id: string): GameModule | undefined {
  return modules.get(id);
}

export function listGames(): GameInfo[] {
  return [...modules.values()].map((m) => ({
    id: m.id,
    name: m.name,
    minPlayers: m.minPlayers,
    maxPlayers: m.maxPlayers,
  }));
}
