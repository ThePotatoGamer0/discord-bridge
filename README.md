# Bridge

A Discord web app that lets verified users chat and interact with servers through a browser. Supports Linked Roles, polls, reactions, and more.

## Stack

- **Frontend:** React, Vite, Socket.IO client
- **Backend:** Node.js, Express, Discord.js, SQLite

## Quick start (development)

1. Copy `backend/.env.example` to `backend/.env` and add `DISCORD_BOT_TOKEN`, `SESSION_SECRET`, and OAuth credentials.
2. Start the backend: `cd backend && npm install && node src/index.js`
3. Start the frontend: `cd frontend && npm install && npm run dev`
4. Open http://localhost:5173 (Vite proxies API to backend)

## Production (Docker)

See [DOCKER.md](DOCKER.md) for Raspberry Pi deployment.

```bash
cp backend/.env.example backend/.env
# Edit backend/.env
docker compose up -d --build
```

## Project structure

```
├── backend/          # Node.js API, Discord bot
├── frontend/         # React SPA
├── Dockerfile
├── docker-compose.yml
└── DOCKER.md
```

## Linked Roles

1. Configure OAuth2 and Linked Roles Verification URL in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Run once: `cd backend && npm run register-linked-role-metadata`

## License

Private / MIT
