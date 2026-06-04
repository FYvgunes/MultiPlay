# Online Oyun Platformu — TODO

Link paylaşarak ailenle karşılıklı oyun. İlk oyun: **satranç**. Mimari baştan **çok oyunlu**.

## Faz 0 — İskelet ✅
- [x] npm workspaces monorepo (`client`, `server`, `shared`)
- [x] `.gitignore`, `todo.md`
- [x] `shared/types.ts`: `GameModule` arayüzü + socket event tipleri
- [ ] git init

## Faz 1 — Backend (oyundan bağımsız çekirdek) ✅
- [x] Express + Socket.IO server, CORS
- [x] `roomStore`: oda oluştur/katıl, koltuk atama, izleyici, reconnect, TTL
- [x] `registry`: `gameId -> GameModule`
- [x] Socket handler'ları odanın modülüne delege eder

## Faz 2 — Satranç modülü + Frontend ✅
- [x] `server/games/chess.ts`: `chess.js`'i `GameModule`'e sar
- [x] Vite React + TS iskelet, router
- [x] Socket client + context
- [x] Lobby: oyun seç → "Yeni oyun" → link kopyala
- [x] Client `games/registry`: `gameId -> bileşen`
- [x] Satranç Board: `react-chessboard`, hamle, sıra, renk, terfi
- [x] Oyun sonu modalı + "Tekrar oyna"

## Faz 3 — Mobil & cila
- [x] Responsive layout (mobil öncelikli CSS, dokunmatik viewport)
- [x] PWA manifest + ikon
- [x] Bağlantı durumu / yeniden bağlanma göstergesi
- [ ] Telefonda gerçek dokunmatik testi (sen yapacaksın)

## Ek özellikler ✅
- [x] Sesler (hamle/alma/şah/bitiş, Web Audio) + 🔊/🔇 aç-kapa
- [x] Ahşap tema (tüm uygulama) + platform giriş ekranı + "Yakında" oyun kartları
- [x] Ahşap taşlar + ahşap tahta (2D)
- [x] Hamle önerileri (yasal kareler) + tıkla-taşı (mobil dostu)
- [x] **3D tahta** (react-three-fiber): ahşap 3D taşlar, döndürülebilir kamera, ışık/gölge, 2D/3D geçişi, lazy-load
- [x] **Botlar**: sunucuda sanal oyuncu, alfa-beta + konum tabloları, 4 zorluk (Kolay/Orta/Zor/Usta)

## Faz 4 — Deploy ✅ (hazır)
- [x] Tek-host: sunucu arayüzü + socket'i aynı adresten servis eder
- [x] Prod build (`npm run build` + `npm run start`), `PORT` env desteği
- [x] Socket URL: prod'da aynı origin, dev'de LAN:3001
- [x] `render.yaml` + `Dockerfile` + `.dockerignore` + README rehberi
- [ ] (senin adımın) GitHub'a gönder → Render Blueprint ile yayınla → linki paylaş

## Faz 5 — Native (opsiyonel)
- [ ] Capacitor ile iOS/Android paketi

## Faz 6 — İkinci oyun
- [ ] XOX / dama ekleyerek platform soyutlamasını doğrula
