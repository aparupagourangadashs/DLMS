**DLMS**: Devotee Learning Management System

# IBMV Learning Platform

One application for the three IBMV portals: the **admin panel**, the **student portal**, and the **public website**. The plan is in [copilot/PLAN.md](copilot/PLAN.md). Ongoing coding conventions are in [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Status

| Portal | Status |
| --- | --- |
| Admin panel (`/admin`) | All 9 sections and 51 screens are built as a **clickable frontend with demo data**, ready for customer review |
| Student portal | Next, after the admin screens are signed off |
| Public website | Planned |

Admin screens are labelled by how well the source specification supports them:

- **Designed from spec**: fields and controls observed in [copilot/ADMIN_PANEL_SPEC.md](copilot/ADMIN_PANEL_SPEC.md).
- **Proposed design**: the spec listed only the menu entry; fields are our proposal for IBMV to review.
- **Needs IBMV decision**: the reference showed Coming Soon, Access Restricted or a legacy page. These screens show a proposal and the open questions instead of a fake UI.

All data is synthetic, generated deterministically in `src/lib/admin/`. Creating, editing, archiving, and reviewing records works in the browser for demos, but **nothing is saved**. Changes reset when you leave the page.

## Getting started

Requires a supported Node.js LTS release (developed on Node 22).

```bash
npm install
npm run dev        # http://localhost:3000, admin panel at /admin
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (Next.js Core Web Vitals + TypeScript rules) |
| `npx tsc --noEmit` | Type-check |

## Stack

- Next.js 16.4 (App Router, Turbopack, React Compiler), React 19.2, TypeScript (strict)
- Tailwind CSS v4 with semantic theme tokens (light/dark) in `src/app/globals.css`
- Lucide icons, Sonner toasts, Framer Motion (respects reduced motion), Zustand for shared UI state
- Fonts: Inter (interface) and Crimson Text (headings)

> The starter baseline specified Next.js 16.3.2. We use **16.4.3** because 16.3.x has critical security advisories (including remote code execution on Windows-hosted servers) that are fixed in 16.4.3.

## Project structure

```text
src/
  app/
    admin/                      Admin shell layout, dashboard, [section]/[page] routes
    page.tsx                    Portal chooser
  components/
    admin/                      Sidebar, top bar, Ctrl+K search, reusable ListPage, form drawer
    admin/pages/                Custom screens (dashboard, sessions calendar, enrolment, community, ...)
    ui/                         Buttons, badges, cards, modal (native <dialog>), tabs, bar chart, ...
  lib/admin/
    navigation.ts               Single route map: sections, pages, screen status
    list-configs.ts             Columns, tabs, filters and forms for each list screen
    demo-data.ts                Seeded demo data (replace with database queries)
  store/                        Zustand UI store
```

To add a list screen, add an entry to `navigation.ts` and a config to `list-configs.ts`. Search, tabs, filters, sorting, column selection, CSV export, pagination, and create/edit/delete then work automatically.

## Backend: deliberately deferred

The frontend comes first so the customer can review the screens. Planned backend choices, all deferred until screens are approved:

- **Database: MySQL/MariaDB with Prisma.** The data is strongly relational (users, enrollments, batches, sessions, orders, payments, certificates). Razorpay payments need transactions, and GST and sales reports need joins.
- **Auth.js (NextAuth v5)** with role-based access, enforced on the server, not just hidden in the menu.
- Route handlers and Server Components will replace `src/lib/admin/demo-data.ts` and the list configs' `rows`.

No environment variables or external services are needed yet.
