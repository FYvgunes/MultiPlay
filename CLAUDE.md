# CLAUDE.md — Aile Oyun Salonu

Link paylaşarak ailenle ya da bota karşı oyna. Mimari baştan **çok oyunlu**:
yeni oyun = **1 server modülü + 1 client bileşeni + 2 registry satırı**.

## Monorepo yapısı (npm workspaces)

```
shared/   Ortak tipler — GameModule sözleşmesi + Socket.IO event tipleri
server/   Express + Socket.IO; oyundan bağımsız çekirdek + oyun modülleri
client/   Vite + React + TS; lobi, oyun sayfası, oyun bileşenleri
```

- `shared/src/types.ts` — **tek doğruluk kaynağı**. `GameModule<State, Move>`
  arayüzü ve client↔server socket sözleşmesi burada.
- `server/src/roomStore.ts` — oda/koltuk/izleyici/reconnect/TTL; oyuna özel hiçbir
  şey bilmez, sadece `room.module` üzerinden delege eder.
- `server/src/index.ts` — socket handler'ları, süreli oyun zamanlayıcısı
  (`scheduleTimer`/`getDeadline`/`onTimeout`), bot sürüşü (`maybeBotMove`), async
  kurulum (`initAndStart` → `module.init`).
- `server/src/registry.ts` — `gameId -> GameModule`.
- `client/src/games/registry.tsx` — `gameId -> React bileşeni`.
- `client/src/pages/Lobby.tsx` — oyun kartları, ICONS, bota-karşı/link modalları.
- `client/src/pages/Game.tsx` — oda yaşam döngüsü, `turnLabel`/`resultLabel`.

## Komutlar

```bash
npm install
npm run dev      # server(3001) + client(5173) birlikte
npm run build    # client (tsc -b + vite) ardından server (tsc) — CI kapısı
npm run start    # prod: server hem API/socket hem client/dist'i tek porttan servis eder
```

Telefondan test: bilgisayar yerel IP'si + `:5173` (socket otomatik `:3001`'e bağlanır).

## Yeni oyun ekleme deseni (kanıtlanmış)

1. **Server modülü**: `server/src/games/<id>.ts` → `export const <id>Module: GameModule<State, Move>`.
   Zorunlu: `id, name, minPlayers, maxPlayers, createInitialState, applyMove, getStatus`.
   Opsiyonel yetenekler:
   - `turnSeat` → sıra-tabanlı oyunlar (bot sürüşü için).
   - `pendingSeats` → eşzamanlı oyunlar (quiz/wordle); bot için `turnSeat` yerine geçer.
   - `getDeadline` + `onTimeout` → süreli/otomatik ilerleyen oyunlar (timer çekirdekte).
   - `viewFor(state, seat)` → gizli bilgiyi koltuğa göre maskele (kelime, rakip cevap).
     **Önemli:** sırrı oyun ortasında sızdırma, bitişte aç.
   - `getBotMove(state, seat, difficulty)` + `getBotDelayMs()` → bota karşı oyun.
   - `init(state, config)` → async kurulum (örn. AI üretimi); `createInitialState`
     sonrası ve rematch'te await edilir.
   - `getStatus.result` koltuk-tabanlı sonuç için `'p0'|'p1'|'draw'` döndürür
     (Game.tsx bunu isme çevirir).
2. **Client bileşeni**: `client/src/games/<id>/index.tsx` → default export,
   `({ snapshot, sendMove }: GameComponentProps)`. `snapshot.state` = `viewFor` çıktısı.
3. **Bağla**: `server/src/registry.ts` ve `client/src/games/registry.tsx`'e birer satır;
   `Lobby.tsx` ICONS'a emoji (SOON listesindeyse otomatik düşer).
4. **Doğrula**: `npm run build` + derlenmiş modüle karşı bot-vs-bot runtime testi
   (her hamle legal mi, viewFor sırrı sızdırıyor mu, getStatus bitiyor mu).

## Mevcut oyunlar

| id | Oyun | Tip | Bot |
|----|------|-----|-----|
| `chess` | Satranç | sıra-tabanlı | alfa-beta + PST |
| `quiz` | Bilgi Yarışması | eşzamanlı, süreli, AI üretimi | olasılıksal |
| `tictactoe` | XOX | sıra-tabanlı | minimax (tam arama) |
| `hangman` | Adam Asmaca | sıra-tabanlı, gizli kelime | harf frekansı |
| `namecity` | İsim-Şehir | eşzamanlı, süreli, çok turlu | kelime bankası |
| `wordle` | Wordle | eşzamanlı, gizli kelime | aday-eleme |

Kelime bankaları: `server/src/games/data/`. Quiz AI: `server/src/ai/`
(Anthropic SDK + anahtarsız fallback bank — Render'da `ANTHROPIC_API_KEY` ile canlı AI).

## Konvansiyonlar

- Tüm yorumlar/etiketler **Türkçe**. TS strict.
- Server importları `.js` uzantılı (NodeNext); `@oyun/shared`'dan tip importu uzantısız.
- Tema: `client/src/styles.css` ahşap paleti (CSS değişkenleri `--panel`, `--line`,
  `--accent` ...). Yeni oyun CSS'i oyun-id öneki ile (`xox-`, `hm-`, `nc-`, `wd-`).
- Otoriter durum sunucuda; client sadece `viewFor` görünümünü çizer ve `move` yollar.
- Commit'ler `main` üzerinde (solo proje, PR akışı yok).

## Yapılacaklar (todo.md)

Sıradaki oyunlar: **Dama**, **Tombala**. Native paket: **Capacitor** (Faz 5).
Kullanıcı tarafı: telefonda dokunmatik test, Render'a `ANTHROPIC_API_KEY` ekleme.
