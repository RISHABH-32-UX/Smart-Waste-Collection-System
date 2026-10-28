# Project Context & Developer Reference

> **Project Name:** Smart Waste Collection System  
> **Repository Root:** `D:\MiniProject\Smart-Waste-Collection-System`  
> **Last Updated:** October 28, 2026  
> **Current Progress:** Phase 1 & Phase 2 (All Dashboards & Full UI/UX Modernization) Completed  
> **Next Focus:** Production Backend Integration & End-to-End Live System Testing

---

## 1. Project Overview

The **Smart Waste Collection Management System (PRAVDHAN)** is a full-stack, role-based municipal waste reporting and collection coordination platform. The system connects four distinct user roles into a single operational lifecycle:

1. **Citizen (`CITIZEN`):** Reports roadside waste hotspots by capturing photos and GPS coordinates with descriptive notes, and tracks tickets to resolution.
2. **Municipal Worker (`WORKER`):** Receives assigned collection tasks, confirms physical on-site presence using GPS geofencing, and submits post-cleanup photographic proof.
3. **Supervisor (`SUPERVISOR`):** Triage hub that verifies new citizen reports, prioritizes complaints, dispatches tasks to free workers (or queues tasks for busy workers with configurable delays), and validates before/after evidence to close tickets or mandate rework.
4. **Administrator (`ADMIN`):** System governance portal managing user accounts, single-role assignments (`CITIZEN`, `WORKER`, `SUPERVISOR`, `ADMIN`), access revocations/restorations, account soft-deletion/anonymization, and real-time operational user metrics.

---

## 2. Technology Stack

### Frontend
* **Framework:** Next.js 14.2.35 (React 18.3.1, App Router)
* **Language:** TypeScript 5.6.2
* **Styling:** Tailwind CSS 3.4.13, PostCSS 8.4.47, Autoprefixer 10.4.20
* **Icons:** `lucide-react` (installed in Phase 1; zero emojis remain in shared components, hero, or account flows)
* **Routing & Middleware:** Next.js Edge Middleware (`middleware.ts`) for server-side role gating
* **Mapping:** OpenStreetMap via responsive iframe embeds (`AssignedTaskMap.tsx`)
* **Camera / Geolocation:** HTML5 `navigator.mediaDevices.getUserMedia` and `navigator.geolocation.getCurrentPosition`
* **Local Dev Port:** `http://localhost:3000` (or `3001` if 3000 is occupied)

### Backend
* **Language & Runtime:** Java 17+ (Host environment has Java 25.0.2 LTS)
* **Framework:** Spring Boot 3.3.5 (`spring-boot-starter-web`, `validation`, `data-jpa`, `security`, `oauth2-resource-server`, `websocket`)
* **Geospatial Processing:** Hibernate Spatial (`hibernate-spatial`) with PostGIS geography calculations
* **Security & Auth:** Stateless JWT Bearer tokens, BCrypt password hashing, Role-Based Access Control (RBAC)
* **Database Migrations:** Flyway (`flyway-core`, `flyway-database-postgresql`) with versioned migrations `V1`–`V5`
* **Build System:** Apache Maven 3.9.16 (bundled wrapper at `backend/.mvn/wrapper/apache-maven-3.9.16`)
* **Default Port:** `http://localhost:8080` (Base API: `/api/v1`)

### Database
* **Engine:** PostgreSQL 16 with PostGIS 3.4 (`postgis/postgis:16-3.4`)
* **Deployment:** Containerized via Docker Compose (`docker-compose.yml`)
* **Database Name:** `smartwaste` | **User:** `smartwaste` | **Port:** `5432`

---

## 3. Project Directory Structure

```text
Smart-Waste-Collection-System/
├── CONTEXT.md                      # Persistent project memory and developer reference
├── .gitignore                      # Git ignore rules (includes .env, .env*.local, node_modules)
├── docker-compose.yml              # Local PostgreSQL 16 + PostGIS Docker service
├── README.md                       # Project overview and official setup instructions
├── docs/
│   └── api-contract.md             # RBAC endpoint contracts and resolution lifecycle rules
├── backend/
│   ├── mvnw.cmd                    # Maven wrapper executable for Windows
│   ├── pom.xml                     # Maven project specification and dependencies
│   ├── models/
│   │   └── waste_detector_best.pt  # PyTorch model weights (22.5 MB)
│   └── src/main/
│       ├── java/com/capstone/smartwaste/
│       │   ├── SmartWasteApplication.java   # Spring Boot main class
│       │   ├── admin/                      # Admin controllers and user analytics
│       │   ├── auth/                       # Registration, authentication, JWT issuing
│       │   ├── complaint/                  # Citizen complaints & supervisor review
│       │   ├── config/                     # SecurityConfig, CORS, DemoAccountSeeder
│       │   ├── media/                      # Multipart upload & protected media streaming
│       │   ├── profile/                    # Authenticated profile endpoint
│       │   └── task/                       # Dispatch, geofence tracking, queue scheduler
│       └── resources/
│           ├── application.yml             # Spring Boot configuration
│           └── db/migration/               # Flyway SQL migrations (V1 to V5)
└── frontend/
    ├── .env.development.local      # Local dev environment overrides (UI preview toggle)
    ├── .env.example                # Example environment configuration template
    ├── package.json                # Frontend package dependencies & scripts
    ├── tsconfig.json               # TypeScript compiler configuration
    ├── tailwind.config.ts          # Tailwind theme and custom shadow definitions
    ├── postcss.config.js           # PostCSS configuration
    ├── middleware.ts               # Next.js role-guarding edge middleware
    ├── public/
    │   └── images/hero/            # High-resolution hero background carousel images
    │       ├── clean-city.jpg
    │       ├── waste-collection.jpg
    │       ├── sanitation-workers.jpg
    │       └── citizen-reporting.jpg
    ├── lib/
    │   ├── api.ts                  # Centralized fetch client, token management & session
    │   ├── devAuthBypass.ts        # Development-only preview toggle helper (isDevAuthBypass)
    │   └── mockData.ts             # Realistic mock data and SVG evidence generators
    ├── components/
    │   ├── AppHeader.tsx           # Polished responsive navbar with mobile drawer & Lucide icons
    │   ├── AssignedTaskMap.tsx     # Embedded OpenStreetMap iframe
    │   ├── CameraCapture.tsx       # Live camera photo capture & file fallback (Lucide icons)
    │   ├── ComplaintDetailDialog.tsx # Detailed citizen report inspection modal
    │   ├── PrivateImage.tsx        # Protected image loader rendering auth blobs
    │   ├── RequireAuth.tsx         # Client component authentication gate
    │   ├── RequireRole.tsx         # Client component role authorization gate
    │   ├── StatusBadge.tsx         # Semantic color-coded status badges with indicator dots
    │   ├── SupervisorResolutionReview.tsx # Proof verification comparison modal
    │   └── WorkerTaskWorkspace.tsx # Interactive field worker task console
    └── app/
        ├── layout.tsx              # Root HTML structure and global style provider
        ├── globals.css             # Polished design tokens, cards, inputs, alerts, reduced-motion
        ├── page.tsx                # Modern hero carousel with dark overlay, Lucide feature cards
        ├── login/page.tsx          # Polished sign-in card with password toggle & Lucide icons
        ├── register/page.tsx       # Polished sign-up form with role cards & password toggle
        ├── report/page.tsx         # Citizen complaint reporting and tracking portal (Phase 2)
        ├── worker/page.tsx         # Municipal field worker dashboard (Phase 2)
        ├── supervisor/page.tsx     # Supervisor verification and task allocation hub (Phase 2)
        ├── admin/page.tsx          # Administrator user & role management console (Phase 2)
        └── profile/page.tsx        # Polished user profile card with avatar, details & access guide
```

---

## 4. Current Development Objective

* **Immediate Goal:** Inspect, polish, and modernize the frontend user interface and user experience across all role portals without running the Java Spring Boot backend, Docker, or PostgreSQL.
* **Scope Limitation:** Phase 1 completed (Design system, Hero, Navbar, Account pages). Dashboards (`/report`, `/worker`, `/supervisor`, `/admin`) are deferred to Phase 2.
* **Integrity Guardrail:** Frontend modifications only. No backend Java code, database schemas, or production security mechanisms may be deleted, corrupted, or permanently altered.

---

## 5. Temporary Authentication Bypass

### Why the Bypass Was Introduced
The project utilizes strict Role-Based Access Control (RBAC):
- Next.js `middleware.ts` intercepts requests before page rendering and redirects unauthenticated users or users with mismatched roles away from protected routes.
- Client components `<RequireAuth>` and `<RequireRole>` block the UI if an active session is missing from `sessionStorage`.
- Several pages require data from backend API endpoints (`/profile`, `/admin/users`, `/supervisor/verification-queue`, `/worker/tasks`), failing to render or throwing network exceptions when the backend is offline.

The preview mode enables immediate, unrestricted access to all screens for UI development.

### How It Works
1. **Strict Development Guard:** Controlled by helper function `isDevAuthBypass()` in `frontend/lib/devAuthBypass.ts`. It evaluates to `true` **only** if:
   $$\text{NODE\_ENV} == \text{"development"} \quad \land \quad (\text{NEXT\_PUBLIC\_DEV\_AUTH\_BYPASS} == \text{"true"} \lor \text{DEV\_AUTH\_BYPASS} == \text{"true"})$$
   In production (`NODE_ENV === "production"`), it **always** returns `false`.
2. **Middleware Bypass:** `frontend/middleware.ts` checks `isDevAuthBypass()`. When active, it allows requests to proceed directly without inspecting cookies.
3. **Client Component Bypass:** `<RequireAuth>` and `<RequireRole>` immediately mark access as granted without redirecting to `/login`.
4. **Mock API Interception:** `frontend/lib/api.ts` routes requests to `handleMockApi()` in `frontend/lib/mockData.ts`, returning realistic mock responses for all endpoints (users, analytics, tasks, complaints, geofences).
5. **Visual Evidence Placeholders:** `authorizedBlob()` returns a dynamic SVG image formatted as a `Blob`, ensuring that `PrivateImage` displays clear "BEFORE" and "AFTER" preview graphics without network errors.
6. **Navigation Bar Switcher:** `AppHeader.tsx` displays an active preview banner and provides one-click navigation links to all four portals plus Profile, Login, and Register.

### How to Enable or Disable Preview Mode

#### To Enable (Current State):
Ensure `frontend/.env.development.local` contains:
```env
NEXT_PUBLIC_DEV_AUTH_BYPASS=true
DEV_AUTH_BYPASS=true
```

#### To Disable (Restore Real Authentication):
Set the variables to `false` in `frontend/.env.development.local` or remove the file:
```env
NEXT_PUBLIC_DEV_AUTH_BYPASS=false
DEV_AUTH_BYPASS=false
```
Then restart the development server. The frontend will immediately enforce full JWT and cookie role verification.

---

## 6. Current Development Status & Phase 1 Accomplishments

### Completed in Phase 1:
* [x] **Icon Modernization:** Installed `lucide-react` (110 packages total). Replaced all emojis across navigation, feature cards, workflows, and form fields with crisp vector Lucide icons.
* [x] **Hero Background Carousel:** Sourced and deployed four realistic high-resolution photographs to `frontend/public/images/hero/`:
  1. `clean-city.jpg` (Pristine urban boulevard)
  2. `waste-collection.jpg` (Modern municipal collection truck)
  3. `sanitation-workers.jpg` (Dedicated field teams)
  4. `citizen-reporting.jpg` (Citizen civic reporting)
* [x] **Carousel Engineering:** Smooth 1000ms crossfade transitions rotating every 5.5s, zoom Ken-Burns effect, rich dark emerald gradient overlay (`from-emerald-950/95 via-emerald-900/85 to-teal-950/80`), pause-on-hover, pause-on-focus, slide indicator pills, and `prefers-reduced-motion` compliance.
* [x] **Global Design System:**
  * Extended `tailwind.config.ts` with CleanCity brand colors (`brand-50` to `brand-950`), custom elevation shadows (`card`, `card-hover`, `dropdown`), and keyframe animations.
  * Polished `globals.css` with unified card styles, crisp field inputs, accessibility-compliant button variants (`btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`), alert presentation, and reduced-motion overrides.
  * Upgraded `StatusBadge.tsx` with colored indicator dots and semantic typography.
* [x] **Navbar & Mobile Navigation:** Upgraded `AppHeader.tsx` with glassmorphic sticky blur, Recycle brand emblem, active route highlighting via `usePathname()`, preview mode status badge, and an animated responsive mobile hamburger drawer.
* [x] **Polished Account Pages:**
  * **Login (`/login`):** Email & password inputs with leading Lucide icons, password visibility toggle (`Eye`/`EyeOff`), loading state, and security badge.
  * **Registration (`/register`):** Interactive dual-card role selector (`CITIZEN`/`WORKER`) with Lucide vector icons, structured inputs (`User`, `Mail`, `Phone`, `Lock`), password visibility toggle, minLength indicator, and error banners.
  * **Profile (`/profile`):** User initials avatar in emerald gradient, clean grid cards (`Phone`, `Status`, `Member Since`), and role privilege overview card.
* [x] **Verification:**
  * `npx tsc --noEmit` passed with 0 errors.
  * `npm run build` compiled all 11 static routes successfully.
  * Live HTTP 200 checks verified on all routes and image assets.
* [x] **Bug Resolution — Navigation & Chunk Mismatch (`./682.js`):**
  * **Webpack Chunk Error (`Cannot find module './682.js'`):** Caused by duplicate background `next dev` processes running concurrently on the same project and writing conflicting build manifests to `frontend/.next`. Resolved by terminating duplicate Node processes, wiping stale cache in `frontend/.next`, and allowing the single active dev server to compile cleanly.
  * **Navigation Fixes:**
    * Initialized `devBypass` in `AppHeader.tsx` and `allowed` in `RequireRole.tsx` / `RequireAuth.tsx` synchronously using `useState(isDevAuthBypass)` to prevent SSR-to-client hydration mismatches and access check delays.
    * Elevated header layer hierarchy to `z-50` to guarantee navbar links are never obstructed by page contents or floating UI elements.
    * Added explicit `onClick={() => setMobileMenuOpen(false)}` handlers across all mobile navigation links for instant drawer closing and responsive routing.
    * Added vector `Home` icon to dev portal navigation items for consistent layout alignment.

### Completed in Phase 2 (Dashboard Modernization):
* [x] **Citizen Reporting Portal (`/report`):**
  * Modern dual-column layout (5-column report form, 7-column ticket tracking history).
  * Professional `CameraCapture` controls with live camera video viewport, capture triggers, and local file picker fallback.
  * Formatted geolocation notice emphasizing automated high-accuracy GPS capture.
  * Ticket cards featuring `#ticket-id` mono chips, AI priority badges, formatted local dates, and operational status progress pills.
  * Preserved all form inputs, validation rules, photo uploads to `/uploads`, and geolocation payload contracts.
* [x] **Field Worker Portal (`/worker` & `WorkerTaskWorkspace.tsx`):**
  * Operational console header with active task count indicator and task deadline formatting.
  * Interactive task cards with status and priority badges, geofence boundary notice, and responsive action buttons.
  * Location verification with real-time GPS coordinates submission to `/worker/tasks/${taskId}/location-events`.
  * Dedicated Task Workspace featuring OpenStreetMap boundary geofences, citizen complaint descriptions, before/after evidence comparison galleries, and after-cleanup photo submission.
* [x] **Supervisor Triage & Allocation Hub (`/supervisor`, `SupervisorResolutionReview.tsx`, `ComplaintDetailDialog.tsx`):**
  * Clear multi-step workflow structure: Step 1 Triage Queue, Step 2 Allocation Pool, Step 3 Dispatch Sidebar, Step 4 Quality Assurance, and Step 5 Delayed Queue.
  * Sticky dispatch sidebar dynamically validating immediate dispatch vs delayed queueing based on worker free/busy states.
  * Quality assurance section providing side-by-side photographic evidence review with direct &ldquo;Verify & Close&rdquo; and &ldquo;Request Rework&rdquo; workflows.
  * Complaint inspection modal dialog with backdrop blur, citizen reporter details, GPS coordinates, and full-resolution media inspection.
* [x] **System Administrator Console (`/admin`):**
  * 4 executive metric cards summarizing registered users, active/revoked ratios, citizen accounts, field worker staff, and municipal supervisors/admins.
  * User search input and interactive role-filter chips for instant client-side lookup.
  * User table/card rows with initials avatars, contact metadata, status badges, single-role management dropdowns, Revoke/Restore toggles, and permanent delete actions.
* [x] **Validation & Integrity Verification:**
  * `npx tsc --noEmit` passed with 0 errors across all dashboard files.
  * `npm run build` compiled all 11 static routes successfully.
  * All 8 endpoints return HTTP 200 OK on local development preview server.
  * 100% preservation of backend contracts, database integrity, and form fields.

### Brand Identity & PRAVDHAN Logo Integration:
* **New Public Brand Name:** **PRAVDHAN** (replacing previous CleanCity naming across user-facing views).
* **Official Logo Asset:** Located at `frontend/public/logo.png` (2172 x 724 px, 3:1 aspect ratio).
* **Components & Locations Updated:**
  * **Global Navigation Bar (`AppHeader.tsx`):** Complete PRAVDHAN logo rendered with Next.js `<Image>` at `h-9 sm:h-10 w-auto`, preserving the exact 3:1 aspect ratio. Clickable, links directly to `/`. Added responsive drawer branding in the mobile hamburger menu.
  * **Root Layout Metadata (`layout.tsx`):** Updated document title (`PRAVDHAN - Smart Waste Collection System`) and description.
  * **Homepage (`page.tsx`):** Updated hero accessibility label (`PRAVDHAN Highlights`) and modernized the footer with the PRAVDHAN logo and copyright notice (`© 2026 PRAVDHAN`).
  * **Authentication Flows (`login/page.tsx` & `register/page.tsx`):** Placed the crisp PRAVDHAN logo prominently above the card headers, updating sign-in and registration headings to "Sign in to PRAVDHAN" and "Join PRAVDHAN".
  * **Profile Portal (`profile/page.tsx`):** Updated account subtitle to "Your account and access details for PRAVDHAN."
* **Integrity Guardrail Maintained:** Zero internal variable names, API identifiers, route paths, database schemas, or authentication mechanisms were modified. Backend and database remain 100% untouched.

---

## 7. UI Improvement Roadmap

| Area / Page | Scope | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Global Design System** | Tailwind theme, colors, typography, buttons, inputs | ✅ **Completed (Phase 1)** | Clean brand emerald tokens, shadows, and accessible contrast. |
| **Navigation & Header** | Responsive navbar, active indicators, mobile menu | ✅ **Completed (Phase 1)** | Glassmorphism, mobile drawer, Lucide icons, dev switcher. |
| **Homepage Hero** | 4-image rotating background, crossfade, overlay, CTAs | ✅ **Completed (Phase 1)** | 5.5s auto-rotation, Ken-Burns, pause-on-hover, reduced motion. |
| **Login (`/login`)** | Sign-in card, input icons, password toggle | ✅ **Completed (Phase 1)** | Preserved form fields & validation rules exactly. |
| **Register (`/register`)** | Sign-up card, role cards, password toggle | ✅ **Completed (Phase 1)** | Replaced emojis with `MapPin` and `HardHat`, preserved fields. |
| **Profile (`/profile`)** | User avatar, account status, privilege breakdown | ✅ **Completed (Phase 1)** | Modern card layout with initials avatar and metadata tiles. |
| **Citizen Portal (`/report`)** | Report submission, photo preview, GPS capture, history | ✅ **Completed (Phase 2)** | 12-col responsive layout, GPS notice banner, ticket cards, camera controls. |
| **Worker Dashboard (`/worker`)** | Task cards, site check-in, resolution submission | ✅ **Completed (Phase 2)** | Enhanced task cards, GPS geofence banner, detailed workspace, evidence gallery. |
| **Supervisor Hub (`/supervisor`)** | Triage queue, worker allocation, resolution review | ✅ **Completed (Phase 2)** | 3-step workflow panels, sticky dispatch sidebar, side-by-side QA review, detail dialog. |
| **Admin Console (`/admin`)** | User management table, role change, analytics cards | ✅ **Completed (Phase 2)** | 4 analytics metric cards, search & role filter pills, initials avatars, single-role management. |

---

## 8. Important Development Rules

1. **Backend Preservation:** Never alter files under `backend/`, `backend/src/`, `docker-compose.yml`, or Flyway migration scripts during UI development.
2. **Reversibility:** Any frontend changes must maintain full compatibility with the production API contract documented in `docs/api-contract.md`.
3. **Environment Security:** Never commit `.env` or `.env*.local` files. Never hardcode live secrets or credentials.
4. **Production Invariance:** The preview mode must never be active when `NODE_ENV === "production"`.
5. **Responsive Design:** Ensure all UI components function on mobile ($<640\text{px}$), tablet, and desktop viewports.
6. **Design System:** Rely on Tailwind CSS utility classes and design tokens defined in `frontend/tailwind.config.ts` and `frontend/app/globals.css`.
7. **Form Integrity:** Preserve every existing form field, input type, required attribute, validation constraint, and submission handler.

---

## 9. Authentication Restoration Plan

When all UI phases are completed and the application is ready to reconnect to the live Spring Boot backend and PostgreSQL database:

1. **Disable Preview Mode:**
   Open `frontend/.env.development.local` and set:
   ```env
   NEXT_PUBLIC_DEV_AUTH_BYPASS=false
   DEV_AUTH_BYPASS=false
   ```
2. **Start Database:**
   ```powershell
   cd D:\MiniProject\Smart-Waste-Collection-System
   docker compose up -d db
   ```
3. **Start Backend:**
   ```powershell
   cd D:\MiniProject\Smart-Waste-Collection-System\backend
   .\mvnw.cmd spring-boot:run
   ```
4. **Start Frontend:**
   ```powershell
   cd D:\MiniProject\Smart-Waste-Collection-System\frontend
   npm run dev
   ```
5. **Verify Real Authentication:**
   * Visit `http://localhost:3000/admin` directly without logging in; confirm that `middleware.ts` redirects to `/login?next=%2Fadmin`.
   * Log in with demo credentials (`admin@cleancity.demo` / `CleanCity#Demo2026`); verify live PostgreSQL data.

---

## 10. Session Handoff Notes

* **Phase 1 Complete:** Visual design tokens, hero carousel, global navigation, and authentication account screens modernized.
* **Phase 2 Complete:** All 4 role dashboards (`/report`, `/worker`, `/supervisor`, `/admin`) and associated workspaces/modals redesigned and tested with complete functional preservation.
* **Next Recommended Step:** Production Backend Integration & End-to-End Live System Testing with Docker, PostgreSQL, and Spring Boot.
* **Quick Dev Start:**
  ```powershell
  cd D:\MiniProject\Smart-Waste-Collection-System\frontend
  npm run dev
  ```
