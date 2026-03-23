# Docker deployment (Raspberry Pi 5 / ARM64)

## Build

**On a Pi (native):**
```bash
docker build -t discord-bridge .
```

**From x86 (cross-build for Pi):**
```bash
docker buildx build --platform linux/arm64 -t discord-bridge .
```

## Run

1. Copy `backend/.env.example` to `backend/.env` (or create `.env` at project root and set `env_file: .env` in docker-compose).
2. Fill in secrets: `DISCORD_BOT_TOKEN`, `SESSION_SECRET`, OAuth credentials, etc.
3. For production: set `NODE_ENV=production`, `FRONTEND_URL`, `CORS_ORIGINS` as needed.

```bash
docker compose up -d
```

The app listens on port 3000. Point Nginx Proxy Manager at the Pi’s IP:3000.

## Single-container layout

- Frontend and backend run in one container
- Frontend is built at image build time
- API and static SPA are served from the same origin (no split-host)
- With one domain (e.g. `discord.potatogamer.uk`), `VITE_API_URL` can stay empty

## Split-host (two domains)

If you use separate frontend and backend domains, build with:

```bash
docker build --build-arg VITE_API_URL=https://discordbackend.potatogamer.uk -t discord-bridge .
```

Or in docker-compose, set `VITE_API_URL` in your env file.

## Data

SQLite DB and sessions are stored in the `discord-bridge-data` volume. Back up this volume for persistence.
