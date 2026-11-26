# Foundation Plan: Phases B0 and B1

Everything else depends on these two phases. Parent: [MASTER_PLAN.md](./MASTER_PLAN.md).

---

## Phase B0: Environment and API foundation

**Goal:** a connected database, a repeatable migration workflow, and the shared
server plumbing every later page reuses.

### B0.1 Environment

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | Prisma | `mysql://<user>:<password>@localhost:3306/ibmv_lms`. Database name is required. Real value only in `.env` |
| `AUTH_SECRET` | Auth.js | Generate locally (`npx auth secret`); never commit |
| `AUTH_URL` / `NEXT_PUBLIC_SITE_URL` | Auth.js, links, emails | `http://localhost:3000` in dev |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seed script only | One-time Super Admin creation; set locally, remove after use |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR` | storage layer (B2) | `local` in dev; private directory outside `public/` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | commerce (B5) | Sandbox keys only; server-side |
| `EMAIL_DRIVER`, `SMTP_*` | notify (B3/B7) | `console` driver until provider is chosen |
| `WHATSAPP_*`, `SMS_*`, `PUSH_*` | notify (B7) | Not configured at B0 |

Tasks:

- [x] Create database `ibmv_lms` (`utf8mb4`, `utf8mb4_unicode_ci`). MySQL 9.6.0.
- [x] Create `.env` (ignored) with `DATABASE_URL`.
- [x] Add `!.env.example` to `.gitignore`; commit `.env.example` with placeholders and a comment per variable.
- [x] Confirm Node LTS and MySQL/MariaDB versions meet Prisma 7 requirements. Node 22.23, MySQL 9.6.
- [x] Document local setup in `README.md` (MySQL running, create DB, copy `.env.example`, migrate, seed).

### B0.2 Prisma setup

- [x] Install `prisma`, `@prisma/client`, `@prisma/adapter-mariadb` (7.10.1, aligned), `dotenv`, `tsx`, plus `next-auth@5.0.0-beta.32`, `bcryptjs`, `zod`, `server-only`. Note: `npm audit` flags a high `effect` ReDoS inside the dev-only `@prisma/config` CLI package; it is not in the app runtime.
- [x] `prisma.config.ts` reading `DATABASE_URL` (declare `dotenv` explicitly if imported).
- [x] `prisma/schema.prisma`: MySQL datasource; generator output `src/generated/prisma` (gitignored; run `npm run db:generate`).
- [x] `src/server/db.ts`: server-only Prisma client with the MariaDB adapter, reused across dev hot reloads (`prisma-factory.ts` is shared with scripts).
- [x] Scripts: `db:generate`, `db:migrate`, `db:migrate:prod`, `db:push` (dev only), `db:studio`, `db:seed`, `test`.
- [x] Add generated client path to lint ignore.
- [x] First migration: `init_identity` (see B1 models in [DATA_MODEL.md](./DATA_MODEL.md)).

### B0.3 HTTP plumbing (`src/server/http`)

- [x] `apiHandler(fn, { rateLimit })` wrapper (same-origin check, rate limit, standard error body, hides internals on 5xx) and `parseJsonBody`/`parseWith` (zod). The `auth`/`permission` options are added in B1.
- [x] `AppError` classes: `ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `BusinessRule`, `RateLimited`.
- [x] `parseListQuery(params)` implementing the list contract (`q`, `tab`, `filter.*`, `from`, `to`, `sort`, `dir`, `page`, `pageSize` with a hard max, default 25, cap 100).
- [x] Same-origin check for state-changing requests; in-memory rate limiter for dev (swap for Redis/provider limiter before launch).
- [x] `GET /api/health`: `{ status, db: "up" }` using a trivial query; no secrets or versions in output.
- [x] Security headers in `next.config.ts` (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`). CSP is planned for B9.

### B0.4 Client plumbing (`src/lib/api`)

- [x] `apiClient` (`get/post/put/patch/delete`): JSON, credentials same-origin, parses the standard error shape into a typed `ApiError` (`code`, `message`, `fields`, `status`).
- [x] `useResourceList(url, params)`: returns `{ rows, meta, status: "loading" | "error" | "ready", error, refetch }`; keeps previous data while refetching.
- [x] `useMutation`: pending state, Sonner success/error toast, maps `fields` to form errors.
- [x] Map `ApiError.status === 401` to a sign-in redirect (`apiClient`); 403 is shown as the API message in lists, and admin pages are gated server-side to `/access-denied`.

### B0.4a Seed foundation

- [x] `prisma/seed.ts`: idempotent `seedReference()` (branches, first Super Admin from env) and `seedDemo()` (demo staff, demo learner; refuses to run in production). Catalog/learning demo data is added by the phase that needs it.

### B0 exit gate

- [x] `npm run db:migrate` creates tables on an empty `ibmv_lms`.
- [x] `GET /api/health` returns `db: "up"`.
- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` pass.
- [x] A unit test for `parseListQuery` and the error mapper (`src/server/http/http.test.ts`).

---

## Phase B1: Identity, roles, and audit

**Goal:** real login for staff and learners, role-based permissions, and an
audit trail. After B1 the `/admin` and `/student` shells are protected.

### B1.1 Models

`User`, `Account`, `Session` (only if adapter requires), `VerificationToken`,
`PasswordResetToken`, `Role` (enum), `Branch` (sub-organization),
`StaffProfile`, `LearnerProfile` (shell only here; fields in B3), `AuditEvent`,
`LoginAttempt`. Details in [DATA_MODEL.md](./DATA_MODEL.md) section B1.

### B1.2 Auth flows

| Flow | Endpoint / mechanism | Rules |
|---|---|---|
| Sign in (credentials) | Auth.js credentials provider, `bcryptjs` compare | Generic failure message; constant-time path for unknown user; lockout/backoff after repeated failures; blocked/archived users cannot sign in |
| Sign up (learner) | `POST /api/public/auth/register` | Validate email/password strength; create `User(kind=LEARNER)` + `LearnerProfile`; send verification email; rate limited; no account enumeration in responses |
| Email verification | `POST /api/public/auth/verify-email` | Single-use, expiring token (hash stored) |
| Forgot / reset password | `POST /api/public/auth/forgot-password`, `.../reset-password` | Always 200 on request; single-use, short-lived token; revoke sessions on reset |
| Sign out | Auth.js sign-out | Clears cookie; client UI "Exit demo" becomes real Sign out |
| Change password | `POST /api/account/password` | Requires current password; audited |
| Staff creation | Admin Team page (`POST /api/admin/team`) | No public staff registration; temp password flow or invite token; optional MFA later |
| Google OAuth | Optional, off by default | Only if D2 approves |

JWT carries `userId`, `kind`, `role`, `branchIds`. For sensitive actions
(payments, refunds, role changes, exports) **re-read the user from the DB** so a
blocked or demoted user loses access immediately.

### B1.3 Authorization (`src/server/auth`)

- [x] `getSessionUser()` (re-checks the DB so blocked/archived/signed-out-everywhere users lose access), `requireStaff(permission?)`, `requireLearner()`, `requireUser()`, and page helpers `pageStaff()`/`pageLearner()` in `src/server/auth/session.ts`.
- [x] `can(role, permission)` using the permission map below (`src/server/auth/permissions.ts`); `assertCan()` for resource checks.
- [ ] Ownership helpers (`assertOwnsEnrollment(...)` etc.): deferred to B3/B4 with the first learner-owned records; learners requesting another learner's record must get **404**.
- [x] Branch scoping: staff with `branchIds` only see matching staff (Team); Super Admin sees all. Other lists adopt the same rule as they migrate.
- [x] `proxy.ts` (matcher limited to `/admin/:path*`, `/student/:path*`, `/api/admin/:path*`, `/api/student/:path*`): redirects unauthenticated users to sign-in and keeps learners out of `/admin` and staff out of `/student`. Coarse guard only; handlers still enforce.
- [x] Static assets, `/website`, `/api/public`, `/api/auth`, `/api/webhooks`, `/api/health` are outside the matcher.

### B1.4 Permission map (draft for D3 approval)

Permissions are `resource:action` strings (`learners:read`, `learners:export`,
`batches:write`, `orders:refund`, `certificates:issue`, `settings:write`).
Roles map to sets in `src/server/auth/permissions.ts`.

| Role | Summary of draft access |
|---|---|
| Super Admin | Everything, including role changes, branches, settings, audit |
| Administrator | All operations except role/permission administration and system settings |
| Instructor | Own batches/sessions/recordings, attendance, evaluate submissions for assigned batches, read learners in assigned batches |
| Content Editor | Catalog, courses, modules, assets, blogs, banners, testimonials, website content; no learners/finance |
| Finance | Orders, payments, promo codes, cheques, GST/sales reports, refunds, wallet; read learners minimally |
| Support | Read/update learners, enrolments, support requests, announcements; no finance/export of payments |
| Learner | Own data only via `/api/student/*` |

### B1.5 Audit

- [x] `writeAudit({ actorId, action, entity, entityId, before?, after?, ip })` used by service code (not UI).
- [x] Audited so far: team create/update/archive/restore, branch create/update/pause/reactivate, profile update, password change/reset, learner registration, CSV export. The rest of the mandatory list (learner delete/archive, enrolment, publish, order/payment, refund, cheque, certificate, grade, settings, wallet) is added by the phase that introduces each action.
- [x] Redact secrets and large payloads (`src/server/audit/redact.ts`); before/after hold only the changed fields.
- [x] Read endpoint `GET /api/admin/audit` (Super Admin) and the audit view (Settings > Audit Log): done in B8 (2026-11-26).

### B1.6 Pages delivered in B1

| Portal | Page | Work |
|---|---|---|
| Student | Shell and every `/student/*` route | Protected by `proxy.ts` + `requireLearner()`; "Exit demo" becomes Sign out; sign-in/register pages added |
| Admin | Shell and every `/admin/*` route | Protected; staff sign-in page; topbar profile menu shows real user and role; sidebar items hidden when permission missing (UI only) |
| Admin | **Settings > My Profile** | Edit own profile, change password (see ADMIN plan) |
| Admin | **Users > Team** | Staff CRUD, role assignment, archive (see ADMIN plan) |
| Admin | **Settings > Sub-Organizations** | Branch CRUD (needed for scoping) |

New unauthenticated pages (frontend work in this phase): `/login`, `/register`,
`/forgot-password`, `/reset-password`, `/verify-email`, and an access-denied
view. Reuse the existing design tokens and form components.

### B1 tests

- [x] Unit: permission map, safe redirect targets, audit redaction, CSV injection guard (`src/server/auth/auth.test.ts`).
- [x] Integration against a separate `ibmv_lms_test` database (`src/server/services/identity.integration.test.ts`): registration and verification, single-use tokens, lockout, blocked users, reset and change password, role gating, branch scoping, archive and audit.
- [x] HTTP authorization smoke test (`node scripts/smoke-b1.mjs` against `npm run start`): 34 checks covering 401/403/redirects, learner vs staff separation, instructor role gates, cross-site mutation block, CSV export, field errors.
- [ ] Learner-vs-learner ownership suite (profile, enrolment, order, certificate, ticket): added with the first learner-owned endpoints in B3/B4.

### B1 exit gate

- [x] Staff and learner can sign in and out; unauthenticated users are redirected.
- [x] Authorization suite passes for the endpoints that exist (staff vs learner, role gates, branch scope).
- [x] Audit events appear for team and role changes.
- [x] Seeded Super Admin works; no default credentials in the repo (`.env` is ignored; `.env.example` has placeholders).

**Implementation notes (B1)**

- Auth.js uses the credentials provider with JWT sessions. `Account`/`Session` tables were not added; they arrive only if Google sign-in is approved (D2).
- Learners must verify their email before signing in; staff are created by an admin and receive a set-password link (console email driver until D5).
- Changing a password, resetting it, changing a role or archiving a user bumps `tokenVersion`, which signs that person out everywhere.
- Staff MFA is not implemented (open decision D2).

---

## Cross-cutting services built alongside B0/B1 (used by later phases)

| Service | Introduced | Notes |
|---|---|---|
| Storage (`src/server/storage`) | B2 | `put/get/delete/signedUrl`; local private dir in dev; validates MIME by content, size caps (assets 25 MB local, configurable), random file names, no execution of uploads, protected downloads via authorized route |
| Notify (`src/server/notify`) | B3 (email), B7 (all) | Provider interface + `console` driver; every send writes a `NotificationLog`; checks consent/opt-out before sending |
| Jobs (`src/server/jobs`) | B4 | DB-backed queue table + a worker script (`tsx`) for reminders, campaigns, certificate generation; replace with a managed queue if scale requires |
| Settings (`src/server/settings`) | B2 | Typed key/value config (contact details, social links, legal text) cached with revalidation |
| Search | B2 | Start with MySQL `LIKE`/FULLTEXT on catalog tables; global admin search (Ctrl+K) queries multiple services with permission filters |
