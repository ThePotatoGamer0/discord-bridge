# discord-bridge — Raspberry Pi 5 (arm64) / multi-arch
# Build: docker buildx build --platform linux/arm64 -t discord-bridge .
# Or on Pi: docker build -t discord-bridge .

# ─── Stage 1: Frontend build ───────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
# Same-origin when served from same container; override for split-host
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Stage 2: Backend + runtime ─────────────────────────────────────────────
FROM node:20-alpine AS backend

# Build deps for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Backend deps
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Backend source
COPY backend/ ./

# Frontend dist from stage 1
COPY --from=frontend-build /app/frontend/dist ./public

# Data dir (mounted volume at runtime)
RUN mkdir -p data

EXPOSE 3000

# Run from backend dir; data/ is relative to CWD
WORKDIR /app
CMD ["node", "src/index.js"]
