# Estágio de Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./
RUN npm ci

# Copia o restante do código
COPY . .

# Gera o cliente do Prisma
RUN npx prisma generate

# Compila a aplicação Next.js
RUN npm run build

# Estágio de Execução (Production Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./next.config.js

# Expõe a porta que o Next.js utiliza
EXPOSE 3000

# Comando para rodar migrações do banco e iniciar o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
