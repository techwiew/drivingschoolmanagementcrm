# DriveFlow Management System

## Project Structure

- `frontend/`: React + Vite + Tailwind CSS application.
- `backend/`: Node.js + Express + Prisma + MySQL API.
- `docker-compose.yml`: Optional Docker setup for MySQL. You can also use your installed local MySQL server.

## Prerequisites

- Node.js (v18+)
- MySQL Server running locally

## Running Locally

### 1. Configure MySQL
Create a database named `driveflow` in your local MySQL server.

Create `backend/.env` with your MySQL username and password:
```env
DATABASE_URL="mysql://root:password@localhost:3306/driveflow"
PORT=5000
JWT_SECRET="driveflow-local-secret"
SUPER_ADMIN_EMAIL="superadmin@driveflow.com"
SUPER_ADMIN_PASSWORD="SuperAdmin@123"
```

If your MySQL username or password is different, update only this part:
```env
DATABASE_URL="mysql://YOUR_USER:YOUR_PASSWORD@localhost:3306/driveflow"
```

### 2. Setup Backend
Open a terminal in the `backend/` directory:
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```
The API will run on `http://localhost:5000`.

Seed demo data after the backend starts:
```bash
curl -X POST http://localhost:5000/api/setup
```

Demo login credentials:
- Admin: `admin@driveflow.com` / `Admin@123`
- Trainer: `trainer@driveflow.com` / `Trainer@123`
- Student: `student@driveflow.com` / `Student@123`
- Super Admin: `superadmin@driveflow.com` / `SuperAdmin@123`

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
