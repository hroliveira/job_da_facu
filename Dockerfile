# Stage 1: Build/Runtime
FROM node:18-slim

# Definir diretório de trabalho
WORKDIR /app

# Copiar apenas os arquivos de dependências primeiro (otimização de cache)
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --omit=dev

# Copiar o restante do código fonte
COPY . .

# Expor a porta configurada no server.js
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
