# DriveFlow Management System

## Project Structure

- `frontend/`: React + Vite + Tailwind CSS application.
- `backend/`: Node.js + Express + Prisma + PostgreSQL API.
- `docker-compose.yml`: For spinning up a local PostgreSQL database.

## Prerequisites

- Node.js (v18+)
- Docker (for the local database)

## Running Locally

### 1. Setup Backend
Open a terminal in the `backend/` directory:
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```
The API will run on `http://localhost:5000`.

### 3. Setup Frontend
Open another terminal in the `frontend/` directory:
```bash
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

## Deployment to MilesWeb (VPS)

1. Set up **PostgreSQL** on your server.
2. Clone this repository.
3. In `backend/`, update the `.env` file with your production database credentials.
4. Run `npm install`, `npx prisma generate`, and `npx prisma migrate deploy`.
5. Build the backend: `npm run build`. Start it with PM2: `pm2 start dist/index.js --name driveflow-api`.
6. In `frontend/`, run `npm install` and `npm run build`.
7. Configure **NGINX** to serve the `frontend/dist` directory and reverse proxy `/api` requests to `http://localhost:5000`.
