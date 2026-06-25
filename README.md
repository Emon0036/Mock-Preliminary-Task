# Mock-Preliminary-Task

Express app configured for MongoDB Atlas and GitHub Actions deployment to a VPS.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from the example and add your MongoDB Atlas URI:

   ```bash
   cp .env.example .env
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

The app listens on `PORT` or `8080` and exposes:

- `GET /` - basic response
- `GET /health` - database health check

## MongoDB Atlas setup

1. Create a MongoDB Atlas project and cluster.
2. Create a database user.
3. Add your server IP address to Atlas Network Access. For a temporary test, `0.0.0.0/0` works, but restrict it to your server IP before production use.
4. Copy the Node.js connection string and replace the username, password, cluster host, database name, and app name.
5. Store the final connection string as the GitHub Secret `MONGODB_URI`.

Example format:

```text
mongodb+srv://<db_user>:<db_password>@<cluster-url>/mock-preliminary-task?retryWrites=true&w=majority&appName=<app_name>
```

If the password contains special characters, URL-encode them before using the URI.

## Server setup

On a fresh Ubuntu VPS, copy and run:

```bash
bash .deployment/server-setup.sh
```

The deploy workflow expects Node.js, npm, and PM2 on the server. The setup script installs them and creates `/var/www/mock-preliminary-task`.

For a domain, copy `.deployment/nginx.conf.example` to your server's Nginx sites config, replace `example.com`, then reload Nginx.

## GitHub deployment

Add these GitHub repository secrets in `Settings > Secrets and variables > Actions`:

| Secret | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `SERVER_HOST` | Yes | VPS IP address or hostname |
| `SERVER_USER` | Yes | SSH user on the VPS |
| `SERVER_SSH_KEY` | Yes | Private SSH key allowed to log in as `SERVER_USER` |
| `SERVER_PORT` | No | SSH port, defaults to `22` |
| `SERVER_APP_DIR` | No | Deploy directory, defaults to `/var/www/mock-preliminary-task` |
| `APP_PORT` | No | App port, defaults to `8080` |

After the secrets are added, push to `main` or run the `Deploy to VPS` workflow manually from GitHub Actions. The workflow packages the app, copies it to the server, writes `.env` from secrets, installs production dependencies, and restarts the PM2 process.

## Useful commands

```bash
npm test
npm run verify:db
npm start
```
