# Backend Dockerfile
FROM node:20-slim AS base

WORKDIR /app

# Install OpenSSL for Prisma compatibility
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Production stage - use tsx to run TypeScript directly
FROM node:20-slim AS production

WORKDIR /app

# Install OpenSSL for Prisma compatibility
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/src ./src

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
