# Sweety – Blood Glucose Tracker

Sweety is a full-stack blood glucose tracking application built with React, Node.js, Express and PostgreSQL.

Users can securely register, log in, record daily glucose readings, update or delete readings, and view reports for daily, current-month and previous-month periods.

## Features

### Authentication
- User registration and login.
- Password hashing with bcrypt.
- JWT-based authentication.
- Protected API endpoints.
- User-specific reading access.

### Glucose Tracking
- Add, view, update and delete glucose readings.
- Four supported daily time slots:
  - Morning
  - After breakfast
  - After lunch
  - After dinner
- Glucose values restricted to 40–600 mg/dL.
- Future reading dates rejected.
- Duplicate readings for the same date and time slot prevented.
- Pagination for reading history.

### Reports
- Daily glucose report.
- Month-to-date report.
- Previous calendar month report.
- Highest, lowest, average and total reading count.
- Empty-state handling when no readings exist.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT |
| Password security | bcrypt |
| API requests | Axios |
| Testing | Jest, Supertest |

## Project Structure

```text
sweety/
├── backend/
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   └── app.test.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

Install the following:
- Node.js and npm
- PostgreSQL
- Git

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/ErrabelliSathvik/sweety.git
cd sweety
```

### 2. Configure the database

Create a PostgreSQL database:

```sql
CREATE DATABASE sweety_db;
```

Apply the schema:

```bash
psql -U postgres -d sweety_db -f backend/database/schema.sql
```

### 3. Configure backend environment variables

Create `backend/.env` using `backend/.env.example` as a template.

Configure your PostgreSQL credentials and JWT secret:

```env
PORT=5000

DB_USER=your_postgres_username
DB_HOST=localhost
DB_NAME=sweety_db
DB_PASSWORD=your_postgres_password
DB_PORT=5432

JWT_SECRET=your_long_random_secret

# Optional demo seed configuration
SEED_NAME=Demo User
SEED_EMAIL=demo@example.com
SEED_PASSWORD=replace_with_a_demo_password
```

Use a strong JWT secret and a seed password of at least 8 characters and no more than 72 UTF-8 bytes.

Never commit the actual `.env` file.

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Start the backend

```bash
npm run dev
```

Backend URL: `http://localhost:5000`

Health check: `http://localhost:5000/api/health`

### 6. Install frontend dependencies

Open a second terminal:

```bash
cd frontend
npm install
```

### 7. Start the frontend

```bash
npm run dev
```

Frontend URL: `http://localhost:5173`

## Database Seeding

The seed script creates a demo user and three sample readings for the current date.

Configure the optional `SEED_*` variables in `backend/.env`, then run from the backend directory:

```bash
npm run seed
```

The script reuses an existing user without resetting their password and skips duplicate readings.

## API Endpoints

All reading and report endpoints require:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Log in |

### Glucose Readings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/readings` | Create a reading |
| GET | `/api/readings` | List readings with pagination |
| GET | `/api/readings/:id` | Get a reading |
| PUT | `/api/readings/:id` | Update a reading |
| DELETE | `/api/readings/:id` | Delete a reading |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily report |
| GET | `/api/reports/month-to-date` | Current month report |
| GET | `/api/reports/previous-month` | Previous calendar month report |

## Testing

Run backend tests:

```bash
cd backend
npm test
```

The automated test suite covers authentication, reading CRUD operations, validation, ownership checks and report endpoints.

Build the frontend:

```bash
cd frontend
npm run build
```

## Security

- Passwords are hashed using bcrypt.
- JWT authentication protects private endpoints.
- SQL queries use parameterized values.
- Reading queries are scoped to the authenticated user.
- Database constraints prevent duplicate user/date/time-slot readings.
- Environment files and secrets are excluded from Git.

## Notes

- Glucose readings are stored in mg/dL.
- Each user can record at most one reading per supported time slot per day.
- The application is intended as a tracking tool and does not replace professional medical advice.
- Demo credentials should only be used for demonstration and testing.

## Author

Errabelli Sathvik
