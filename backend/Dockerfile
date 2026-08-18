# ==============================================================================
# Stage 1: Build Stage
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build prerequisites
RUN apk add --no-cache openssl

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy application source and configuration
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to dist/
RUN npm run build

# ==============================================================================
# Stage 2: Production Runner
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies (OpenSSL for Prisma, netcat for DB healthcheck)
RUN apk add --no-cache openssl netcat-openbsd bash

ENV NODE_ENV=production
ENV PORT=5005

# Copy package manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm install --omit=dev

# Generate Prisma Client for the production node_modules
RUN npx prisma generate

# Copy compiled JavaScript output from builder
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Expose backend API / WebSocket port
EXPOSE 5005

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
