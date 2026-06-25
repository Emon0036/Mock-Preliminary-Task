# Mock-Preliminary-Task

Express app with MongoDB Atlas, Passport authentication, and EJS templates. The app is set up for Render deployment through GitHub.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from the example and add your values:

   ```bash
   cp .env.example .env
   ```

3. Run locally:

   ```bash
   npm run dev
   ```

Open `http://localhost:8080`.

## Routes

- `GET /` - home page
- `GET /health` - database health check
- `GET /register` - registration form
- `GET /login` - login form
- `GET /dashboard` - protected page
- `POST /logout` - logout

## Render deployment

Use these settings for the Render Web Service:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Branch | `main` |
| Auto-Deploy | `Yes` |

Add these environment variables in Render:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `SESSION_SECRET` | A long random string |

Do not set `PORT` on Render. Render provides it automatically.

After Render is connected to this GitHub repo with Auto-Deploy enabled, every push to the linked branch deploys automatically. Render cancels a failed deploy and keeps the last successful version running.

## Useful commands

```bash
npm test
npm run verify:db
npm start
```
