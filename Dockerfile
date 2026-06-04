# Tek-host imaj: arayüz + socket sunucusu tek serviste.
# Fly.io / Railway / herhangi bir container host için.
FROM node:20-alpine
WORKDIR /app

# Önce manifestler (katman önbelleği için)
COPY package*.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm install

# Kaynaklar + build
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Host PORT'u env ile verir; sunucu process.env.PORT'u kullanır.
EXPOSE 3001
CMD ["npm", "run", "start"]
