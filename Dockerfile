# Stage 1: Build
FROM node:18-slim AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências
RUN npm ci

# Copiar código-fonte
COPY . .

# Stage 2: Runtime
FROM node:18-slim

WORKDIR /app

# Copiar apenas dependências de produção do builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copiar código-fonte (sem node_modules, env.js, .env local)
COPY --chown=node:node server.js ./
COPY --chown=node:node api/ ./api/
COPY --chown=node:node src/ ./src/
COPY --chown=node:node sql/ ./sql/
COPY --chown=node:node stitch/ ./stitch/
COPY --chown=node:node *.html ./

# Usar usuário não-root por segurança
USER node

# Expor a porta configurada no server.js
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando para iniciar a aplicação
CMD ["npm", "start"]
