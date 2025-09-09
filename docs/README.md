## Backend API (Activity Reporting System)

### Stack
- Node.js + Express.js
- MongoDB + Mongoose
- JWT auth (24h expiry)
- Joi validation
- CORS + Helmet + Rate limiting

### Setup
1. Copy `.env.example` to `.env` and fill values:
```
DATABASE_URL=
JWT_SECRET=
NODE_ENV=development
PORT=3001
```
2. Install and run:
```
npm install
npm run dev
```

### Base URL
- `http://localhost:3001`

### Response format
```
// Success
{ success: true, data: {...}, message?: "..." }

// Error
{ success: false, error: "...", message: "...", details?: [...] }
```

### Auth
- POST `/api/auth/register` { email, password, name, role? }
- POST `/api/auth/login` { email, password }
- GET `/api/auth/me` (Bearer token)

### Activities
- GET `/api/activities` (Bearer) query: category, platform, startDate, endDate, page=1, limit=20
- POST `/api/activities` (Bearer) { category, platform?, title, description?, timestamp }
- PUT `/api/activities/:id` (Bearer)
- DELETE `/api/activities/:id` (Bearer)
- PATCH `/api/activities/:id/metrics` (Bearer) { likes?, shares?, comments?, reach? }

### Analytics
- GET `/api/activities/stats` (Bearer)
- GET `/api/activities/export?format=json|csv` (Bearer)

### Postman
Import `postman_collection.json` from this folder. Set `baseUrl` and `token` variables.


