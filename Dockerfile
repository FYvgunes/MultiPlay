# Tek-host imaj: arayüz + socket sunucusu tek serviste.
# Fly.io / Railway / herhangi bir container host için.
# Çok aşamalı (multi-stage): runner imajı yalnızca derlenmiş çıktı + prod
# bağımlılıklarını taşır → küçük imaj, hızlı cold start.

# --- 1) Build aşaması ---
FROM node:20-alpine AS builder
WORKDIR /app

# Önce manifestler (katman önbelleği için)
COPY package*.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm install

# Kaynaklar + build, sonra devDependencies'i at
COPY . .
RUN npm run build && npm prune --omit=dev

# --- 2) Çalıştırma aşaması ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prod node_modules (workspace symlink'leriyle) + derlenmiş çıktılar
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/package.json ./client/package.json
COPY --from=builder /app/client/dist ./client/dist

# Host PORT'u env ile verir; sunucu process.env.PORT'u kullanır.
EXPOSE 3001
CMD ["npm", "run", "start"]
