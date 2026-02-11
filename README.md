# Pole Banner Management System

Şehir içi reklam ve direk yönetim sistemi - 15 günlük sprint projesi

## Tech Stack

- **Backend:** Node.js + Express + Prisma
- **Database:** PostgreSQL 15 + PostGIS
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Cache/Queue:** Redis + Bull
- **Maps:** Leaflet + OpenStreetMap

## Quick Start

### 1. Start Services (Docker)
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
mbgadversimentv1/
├── backend/          # Node.js + Express API
├── frontend/         # React + Vite SPA
├── docs/            # Documentation
├── _bmad/           # BMAD workflows
├── _bmad-output/    # Planning artifacts
└── docker-compose.yml
```

## Development

- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Sprint Status

Detailed sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.md`

## Documentation

- PRD: `_bmad-output/planning-artifacts/prd.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Epics & Stories: `_bmad-output/planning-artifacts/epics-and-stories.md`

## License

Proprietary - Internal Project
# baygunes
