import type { GameModule, GameInfo } from '@oyun/shared';
import { chessModule } from './games/chess.js';

// gameId -> GameModule. Yeni oyun eklemek için: modülü yaz ve buraya kaydet.
const modules = new Map<string, GameModule>();

function register(m: GameModule) {
  modules.set(m.id, m);
}

register(chessModule as unknown as GameModule);

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
