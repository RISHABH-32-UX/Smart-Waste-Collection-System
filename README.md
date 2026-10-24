# Smart Waste Collection Management System

Runnable capstone starter monorepo for a role-based waste reporting and collection workflow.

## Prerequisites (Windows)

- Java 17+ (Java is already installed on the development machine used for this project)
- Docker Desktop, to run PostgreSQL + PostGIS
- Node.js LTS, which includes `npm`

Install the missing prerequisites in an **Administrator PowerShell**, then close and reopen the terminal:

```powershell
winget install --id Docker.DockerDesktop --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-source-agreements --accept-package-agreements
```

Open Docker Desktop once and wait for its engine to show as running. Verify the tools in a new PowerShell window:

```powershell
docker --version
node --version
npm --version
```

If Docker Desktop was installed per-user and `docker` is still not found, add its CLI folder to your user `PATH`, then open a new terminal:

```powershell
$dockerBin = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin"
[Environment]::SetEnvironmentVariable("Path", "$([Environment]::GetEnvironmentVariable('Path', 'User'));$dockerBin", "User")
```

If Node.js was installed but `node` or `npm` is still not found, run the same type of repair for Node.js, then open a new terminal:

```powershell
$nodeBin = "C:\Program Files\nodejs"
$env:Path += ";$nodeBin"
[Environment]::SetEnvironmentVariable("Path", "$([Environment]::GetEnvironmentVariable('Path', 'User'));$nodeBin", "User")
```

## Start locally

Run these as separate commands; do not paste the PowerShell `>` prompt character.

```powershell
cd D:\project__
docker compose up -d db

cd backend
.\mvnw.cmd spring-boot:run
```

In a second PowerShell window:

```powershell
cd D:\project__\frontend
npm.cmd install
npm.cmd run dev
```

API: `http://localhost:8080/api/v1`  
Web: `http://localhost:3000`

The backend runs Flyway migrations automatically. Public sign-up (`/register`) creates a **Citizen** or **Municipal worker** account — supervisor and admin accounts can never be self-registered.

### Demo accounts (seeded automatically)

On startup the backend seeds one account per role (idempotent; disable with `SEED_DEMO_ACCOUNTS=false`). Password for all four: `CleanCity#Demo2026`

| Email | Role | Lands on |
|---|---|---|
| `admin@cleancity.demo` | ADMIN | `/admin` — user & role management |
| `supervisor@cleancity.demo` | SUPERVISOR | `/supervisor` — verification hub |
| `worker@cleancity.demo` | WORKER | `/worker` — assigned tasks |
| `citizen@cleancity.demo` | CITIZEN | `/report` — lodge & track complaints |

Sign in at `http://localhost:3000/login` — each account is routed to its own portal automatically.

### Promoting your own account (optional)

To make an account you registered yourself an admin, promote it once through the local database, then sign in again to receive an admin JWT:

```powershell
docker compose exec db psql -U smartwaste -d smartwaste -c "UPDATE app_users SET role='ADMIN' WHERE email='your-email@example.com';"
```

The Admin Console can then assign exactly one role to every other account.

## Supervisor allocation rules

After a supervisor approves a complaint, it appears in **Verified reports awaiting allocation**. The supervisor can assign it immediately only to an active worker with no unfinished task, or queue it for a currently busy worker after a two- or three-hour minimum delay. Each worker can have only one queued task.

The backend checks queued tasks every minute. It assigns a queued task only after the selected delay and only once its reserved worker is free; otherwise it retries every 15 minutes. This prevents active workers from being double-booked.
