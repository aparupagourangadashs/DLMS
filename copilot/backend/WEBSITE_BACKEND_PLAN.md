# Public Website: Backend Plan (phase by phase)

Parent: [MASTER_PLAN.md](./MASTER_PLAN.md). Spec: [WEBSITE_PORTAL.md](../WEBSITE_PORTAL.md).
Models: [DATA_MODEL.md](./DATA_MODEL.md) B2.

**Current state:** 144 preview routes under `/website`, reading
`src/lib/website/content.ts` (`publicCourses` from `official-courses.json`,
`publicBooks`, `collections`, `publicFaq`), `community.ts` (testimonials, videos,
published figures). The bulk-book form is an unsent draft; Sign up / Log in /
Enroll Now hand off to the official IBMV site; Terms and Privacy are preview
notices.

**Goal:** all public content is read from the database and editable in the admin;
forms create real leads; SEO and caching are production-grade. Public pages need
**no login**, so they use Pattern A (Server Component reads) almost everywhere.

**Rules for every public page**

- Return only `PUBLISHED` records with catalog visibility on; never leak drafts,
  internal notes, staff emails, or learner data.
- Cache with tag-based revalidation; admin publish/unpublish revalidates the
  affected tags (`revalidateTag`), so edits appear without a rebuild.
- Rate limit and spam-protect all public POST endpoints.
- Keep external handoffs (Enroll Now, Donate, app, retailers) explicit; never imply
  payment or enrolment completed.
- Remove "preview" and "unsent draft" wording only when the matching backend is live.

---

## Phase W1 (during B2): Content foundation and shell

Prerequisites: B0, B1 (service/handler plumbing); admin catalog screens (see ADMIN plan B2) or seed.

| # | Task | Output |
|---|---|---|
| W1.1 | Models: `Category`, `Course`, `CourseSchedule`, `CourseFaq`, `Instructor`, `Person`, `Book`, `BookLink`, `Magazine`, `Testimonial`, `Video`, `Banner`, `SiteSetting`, `LegalDocument`, `Lead`, `BulkBookEnquiry` | Migration `catalog_and_content` |
| W1.2 | Seed from `official-courses.json` (127 courses), `collections` (6 categories), `publicBooks`, `testimonials`, `websiteVideos`, current contact/social/legal text | Idempotent seed; DB equals today's preview |
| W1.3 | Services `src/server/services/public/*`: `listCourses(filter)`, `getCourseBySlug`, `listCollections`, `listBooks`, `listMagazines`, `listPeople(group)`, `listTestimonials`, `listVideos`, `getHomeBanners`, `getSiteSettings`, `getLegalDocument` | Typed DTOs (public fields only) |
| W1.4 | Replace imports of `publicCourses`, `collections`, `publicBooks`, `testimonials`, `websiteVideos` with service calls in the Server Components that render them | Pages render from DB |
| W1.5 | Optional JSON endpoints for client filters: `GET /api/public/courses?collection=&q=&language=&mode=&teacher=&page=` | Used only if catalog filtering moves server-side |
| W1.6 | Cache + revalidation tags: `courses`, `course:<slug>`, `collections`, `books`, `people`, `site-settings` | Admin publish revalidates |

### Page-by-page (Phase W1)

| Page | Route | Data source today | Backend | Frontend wiring |
|---|---|---|---|---|
| **Shell** (header, utility bar, footer) | all `/website/*` | `siteConfig`, hardcoded links in `WebsiteShell.tsx` | `SiteSetting` (email, phone, social URLs, donate URL, app URL, community URLs); `Category` list for the Courses dropdown | `WebsiteShell` becomes a Server Component wrapper fetching settings once; client dropdown/menu stays a child component |
| **Home** | `/website` | `WebsiteHome.tsx` + `collections`, `publicCourses`, testimonials, videos, `publishedCommunityFigures`, banner image | `getHomeBanners()` (placement `WEBSITE_HOME`), per-collection top N published courses (by `sortOrder`), testimonials, videos, hero metric from `SiteSetting` | Server Component fetches; pass DTOs to existing client sections; hero metric keeps source attribution text from settings |
| **Collection catalogs** (6) | `/website/bhagavata-mahavidyalaya`, `/self-study`, `/ancient-wisdom`, `/kids-parents`, `/level-wise`, `/live-classes` | `WebsiteCatalog` filters `publicCourses` client-side | `listCourses({ collection })`; facets (languages, teachers, formats) computed from DB; status groups (upcoming/ongoing/coming soon) from `CourseSchedule` + `comingSoon`; Live Classes shows Coming Soon when empty | Server Component loads all courses of the collection (small) and passes to `WebsiteCatalog`; keep client filtering. Switch to `searchParams` + server filtering only if a collection exceeds a few hundred rows. Distinguish loading/empty/error |
| **Course detail** | `/website/course/[slug]` (127) | `WebsiteCourseDetail` + `PublicCourse` | `getCourseBySlug(slug)` returns title, summary, instructor, price/free, type, key facts, schedule, teacher bio, overview sections, FAQs, `officialUrl`/`enrollmentUrl`; unknown or unpublished slug -> `notFound()` | `generateStaticParams` from published slugs + on-demand revalidation; metadata (`generateMetadata`) and JSON-LD `Course` from DB; Enroll Now keeps handoff (D9) |
| **Books** | `/website/books` | `publicBooks` | `listBooks()` with formats and retailer URLs | Server read; bulk form stays as client island |
| **E-Magazines** | `/website/e-magazines` | static notice | `listMagazines()` (empty state until IBMV approves fields); view/download URL via approved link or protected asset route | Server read; keep "awaiting approved archive" empty state when none |
| **About IBMV** | `/website/iskcon-bhagavata-mahavidyalaya` | `WebsiteInfoPage` static copy | `SiteSetting` / `ContentPage` (markdown, versioned) | Render markdown safely (existing `markdown.ts` renderer; no raw HTML) |
| **Srila Prabhupada** | `/website/srila-prabhupada` | static | same as above | same |
| **Advisory Board** | `/website/our-advisory-board-members` | static | `listPeople("ADVISORY")` ordered, visible only | Reusable people card list |
| **Our Team** | `/website/our-team` | static | `listPeople("TEAM")` | same |
| **Contact** | `/website/contact` | static | `SiteSetting` (address, email, phone, map link) | Server read; no hard-coded contact details elsewhere |
| **Account / handoff** | `/website/account` | handoff page | none (settings for official URLs) until D2/D9 change it | After B1: add links to local `/login`, `/register` if native login is approved; otherwise keep handoff |
| **Terms** | `/website/terms` | preview notice | `LegalDocument(TERMS)` latest published version | Show approved text; if none, keep notice. Legal copy must be approved by IBMV |
| **Privacy** | `/website/privacy` | preview notice | `LegalDocument(PRIVACY)` | same |
| **Not found** | `/website/*` | `not-found.tsx` | none | unchanged |

Exit gate W1: `git grep -n "from \"@/lib/website/content\""` shows no runtime import
of fixtures in rendered pages (only seed/tests); admin edit of a course title
appears on the public page after revalidation; unpublished courses return 404.

---

## Phase W2 (during B2): Forms and leads

| Form | Route | Endpoint | Rules |
|---|---|---|---|
| **Bulk book enquiry** (first/last name, address, pincode, city, book, quantity, email, country code, mobile) | `/website/books` | `POST /api/public/enquiries/bulk-books` | Validate lengths, email, phone by country code, Indian pincode 6 digits (when India), quantity 1-10000, book must exist; honeypot field + rate limit per IP/email; store `Lead(source=BULK_BOOK)` + `BulkBookEnquiry`; send acknowledgement email (console driver until B7) and staff notification; return a generic success; no echo of personal data |
| **Contact enquiry** (only if IBMV wants a form; the reference showed none) | `/website/contact` | `POST /api/public/enquiries/contact` | Same protections; decision D8-style confirmation first |
| **Newsletter / magazine subscription** | external today | none | Keep external; do not add a local subscription without approval |

Frontend wiring:

- `WebsiteForms.tsx` `BulkRequest`: replace the local "unsent draft" preview with
  `apiClient.post`; map `error.fields` to inline messages; success state says
  "Your request was received" (not "unsent"); disable submit while pending.
- Admin side: leads appear in **Marketing > Leads** (ADMIN plan, B2).

Spam/abuse: honeypot, minimum fill time, per-IP and per-email rate limit,
optional CAPTCHA provider if abuse appears; strip control characters; cap
payload size.

Exit gate W2: submitting the form creates a lead visible in admin; abuse limits
verified by a test; no personal data in logs.

---

## Phase W3 (during B5): Enrolment and account links (conditional on D9, D2)

| Task | Detail |
|---|---|
| Native "Enroll Now" | If approved: button goes to `/student/checkout?course=<slug>` (or sign-in first), creates an order via `POST /api/student/orders` with server-side price; confirms only after Razorpay webhook; shows pending/failed/success/cancelled states. If not approved: keep handoff to `officialUrl` |
| Price on card/detail | Show `priceMinor` formatted by `formatINR`; "Free" when `isFree`; International pricing per branch/currency rules (B5) |
| Promo codes | `visibleOnWebsite` codes may be shown on course detail; redemption only at checkout |
| Sign up / Log in | Header buttons point to `/register` and `/login` once B1 auth is the system of record |

---

## Phase W4 (during B6): Certificate verification

| Page | Route | Backend |
|---|---|---|
| **Verify certificate** (new) | `/website/verify-certificate` | `GET /api/public/certificates/verify?code=` returns only: valid/invalid, certificate title, course, issue and expiry dates, masked or first name per privacy decision; rate limited; no learner contact data |

---

## Phase W5 (during B8/B9): Blogs, SEO, performance

| Task | Detail |
|---|---|
| Blogs (new public pages) | `/website/blogs` (list) and `/website/blogs/[slug]` backed by `Blog` published records; the admin Blogs screen already exists, but the public pages do not. View counter increments server-side with simple abuse limits |
| SEO | `sitemap.ts`, `robots.ts`, canonical URLs, Open Graph, `Course`/`Organization` JSON-LD, redirect map from existing official URLs; current preview is `noindex` and must be lifted only for the approved production domain |
| Performance | `next/image` for DB-driven images (asset records provide width/height), cache headers/CDN, ISR for course pages, Core Web Vitals budget |
| Accessibility | Re-run keyboard/screen-reader checks after dynamic content; error/empty/loading states announced |
| Consent | Cookie/analytics consent banner only if analytics added (decision pending) |

---

## Website endpoint inventory

| Endpoint | Method | Phase | Auth | Notes |
|---|---|---|---|---|
| `/api/public/courses` | GET | W1 (optional) | none | Filtered list, public fields only |
| `/api/public/courses/[slug]` | GET | W1 (optional) | none | Same DTO as `getCourseBySlug` |
| `/api/public/enquiries/bulk-books` | POST | W2 | none | Rate limited, honeypot |
| `/api/public/enquiries/contact` | POST | W2 (if approved) | none | |
| `/api/public/certificates/verify` | GET | W4 | none | Privacy-safe response |
| `/api/public/auth/register` etc. | POST | B1 | none | See FOUNDATION plan |

## Website tracker

| Page | Phase | Status |
|---|---|---|
| Shell | W1 | **Done** (2026-11-25) |
| Home | W1 | **Done** (2026-11-25); banners deferred to B2b, hero figures and community figures come from Site Settings |
| 6 collection catalogs | W1 | **Done** (2026-11-25) |
| Course detail (127) | W1 | **Done** (2026-11-25); rendered on demand from the database (static params, revalidation tags and JSON-LD move to W5) |
| Books (+ bulk form) | W1 / W2 | **Done** (2026-11-25); form creates a lead, honeypot + minimum fill time + IP/email rate limits; quantity 1-1,000 |
| E-Magazines | W1 | **Done** (2026-11-25); shows the approved-archive empty state until magazines are published |
| About IBMV, Srila Prabhupada | W1 | Static copy (editable `ContentPage` moves to B2b) |
| Advisory Board, Our Team | W1 | **Done** (2026-11-25) |
| Contact | W1 | **Done** (2026-11-25); email, phone, address and map link from Site Settings |
| Account handoff | W1 / W3 | Handoff links from Site Settings (**Done** for W1); native links wait for D2/D9 |
| Terms, Privacy | W1 | **Done** (2026-11-25); shows the latest published version, keeps the notice when none |
| Verify certificate (new) | W4 | Todo |
| Blogs (new) | W5 | Todo |
| SEO, performance, accessibility | W5 | Todo |
