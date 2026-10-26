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

### Help center

Every admin page has a **Help** button (or press `?`) that opens its help article at `/admin/help/<section>/<page>`. The help center at `/admin/help` has getting-started guides and a searchable list of every page.

A colorful floating **Help center** shortcut sits at the bottom-right on all
admin pages, replacing the sidebar Help item. It uses a compact icon on phones
and stays behind dialogs. Sidebar scrollbars are hidden for a clean rail;
wheel, touch, and keyboard navigation still reach every menu item.

- Hand-written content (purpose, who uses it, page-specific how-tos, tips, related pages) is in `src/lib/admin/help-content.ts`.
- For list screens, step-by-step tasks, columns, filters, and form fields are generated from the screen's config in `list-configs.ts` (see `src/lib/admin/help.ts`), so the help stays in sync when a screen changes.

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

### Table design

The Community page uses colorful community tiles, icon-led view tabs, role
badges, highlighted pinned messages, and a labeled message composer. Member
management and pinning remain interactive demo features; layouts adapt to
phones and dark mode.

My Profile includes a gradient identity banner and color-coded personal,
contact, address, and preference cards with labeled field icons. The same cards
switch into editable controls; save/cancel actions sit above the floating Help
shortcut on smaller screens. Profile edits remain local demo data.

The remaining custom admin screens follow the same visual system: enrolment
panels have mode-specific icon headers, notification settings show live enabled
counts per channel, and decision screens use numbered question cards while
clearly remaining proposals. Help Center guides and articles use section
colors, icon tiles, and accented task cards; search and page links are retained.

All visible admin tables share the theme-aware `admin-data-table` styles and the
keyboard-focusable `TableScroll` wrapper in `src/components/ui/Table.tsx`.
List screens include icon-led column headings, identity tiles, status badges,
gradient progress bars, highlighted selected rows, and numbered pagination.
Headers use a saturated blue-to-violet gradient; status tabs and action buttons
have distinct colors, and identity tiles use a consistent per-name palette.
Progress is orange below 40%, blue from 40%, and green from 75%, with the exact
percentage always visible so color is not the only indicator.
The same visual language covers dashboard sessions, report previews, enrolment
validation, notification settings, and help field references. Wide tables scroll
inside their own region on mobile rather than stretching the page. Light/dark
themes, visible focus states, and reduced-motion preferences are supported.
Action menus use native top-layer popovers so pinned cells cannot cover them;
menus stay within the viewport and reposition when the page or table scrolls.

Dropdowns throughout filters, profile/enrolment forms, form drawers, and
analytics use `src/components/ui/Select.tsx`. The shared select-only combobox
has a 44px trigger, a matching-width top-layer listbox, wrapped option labels,
selected checkmarks, keyboard navigation (arrows, Home/End, type-ahead,
Enter/Space, Escape), and viewport-constrained scrolling on mobile.

The Sessions calendar uses stable course colors, period-based summary cards,
an in-view course legend, and responsive week/day/list/month views. The weekly
board stacks by day on phones instead of forcing a seven-column layout.
Shared `DatePicker` and `DateTimePicker` components provide themed calendars,
month/year selection, Today/clear actions, keyboard date navigation, and min/max
date limits across filters, scheduling forms, profiles, and the dashboard.
Date-time inputs retain the application's IST convention.
Dashboard chart controls keep visible Bar/Line/Area labels alongside Lucide
icons, use blue/green/violet styling, and provide 44px touch targets.

## Backend: deliberately deferred

The frontend comes first so the customer can review the screens. Planned backend choices, all deferred until screens are approved:

- **Database: MySQL/MariaDB with Prisma.** The data is strongly relational (users, enrollments, batches, sessions, orders, payments, certificates). Razorpay payments need transactions, and GST and sales reports need joins.
- **Auth.js (NextAuth v5)** with role-based access, enforced on the server, not just hidden in the menu.
- Route handlers and Server Components will replace `src/lib/admin/demo-data.ts` and the list configs' `rows`.

No environment variables or external services are needed yet.
