# ==============================================================================
# Stage 1: Build Stage
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies cleanly
RUN npm install

# Copy project configuration and sources
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY index.html ./
COPY public ./public
COPY src ./src

# Build optimized static production bundle
RUN npm run build

# ==============================================================================
# Stage 2: Nginx Web Server & Reverse Proxy
# ==============================================================================
FROM nginx:alpine AS runner

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
