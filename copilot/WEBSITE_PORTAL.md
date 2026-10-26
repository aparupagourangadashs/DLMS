# Public Website: Observed Pages and Development Specification

## 1. Scope

This document describes the public-facing website at `https://www.ibmedu.org/`
as observed on 2026-10-19. It is a page, navigation, content, and interaction
reference for building a similar public portal. It is not a copy of the site's
source, backend, or API.

- Only public pages and publicly visible controls are covered.
- Forms and enrollment flows were not submitted.
- Course/catalog content changes over time. This document records content
  types and page structure rather than reproducing long descriptions or
  copyrighted educational text.
- A few pages or embedded feeds remained loading during inspection; this is
  identified below.
- The authenticated student experience is documented separately in
  `STUDENT_PORTAL_SPEC.md`.

## 2. Global site shell

### Top utility bar

- Contact email link (`mailto:`).
- Telephone link (`tel:`).
- Social network shortcut(s).
- **Donate** link to a separate donation site.

### Main navigation

- Home.
- **Courses** dropdown:
  - ISKCON Board of Examination
  - Self-study Courses
  - Ancient Wisdom (Self Study Courses)
  - Kids & Parents (Self Study Courses)
  - Level Wise Shastric Study
  - Live Classes
- **Publications** dropdown:
  - Books
  - E-Magazines
- **About Us** dropdown:
  - ISKCON Bhagavata Mahavidyalaya
  - Srila Prabhupada
  - Our Advisory Board Members
  - Our Team
- Contact Us.
- Sign Up and Log In actions.

Navigation dropdowns and the account interface should work on desktop and
mobile. The public site links account actions into the hosted course platform.
Use the separate student portal specification for authenticated pages.

### Footer

Observed footer groups:

- Donate.
- Useful Links: course catalog pages and Contact Us.
- Terms and Conditions.
- Privacy Policy.
- Social links.
- Learner App download link.

## 3. Homepage (`/`)

### Hero

- Institution name and short educational positioning statement.
- Learner participation metric.
- Primary **Explore Courses** CTA.
- **Download Our App** and **Join Our Community** CTAs.
- Donation shortcut appears in the top utility/navigation area.

### Course catalog feature bands

The homepage includes vertically stacked course-category sections:

1. ISKCON Board of Examination Courses.
2. Self-study Courses.
3. Ancient Wisdom (Self Study Courses).
4. Kids & Parents (Self Study Courses).
5. Level Wise Shastric Study.
6. Live Classes.

Each section has a Course Library link and course cards. The homepage also
includes Testimonials and Videos sections.

### Course card information model

Cards observed in course sections show combinations of:

- Course title and image.
- Short description.
- Teacher/instructor.
- Paid/free status or price.
- Course duration or hours.
- Course category/level where applicable.
- Start date or schedule status where applicable.
- Certificate course indicator where applicable.
- **Enroll Now** CTA.

Some cards are multilingual; course names, descriptions, durations, or metadata
may be in English or Hindi. Do not assume all fields exist on every course.

## 4. Course catalog pages

| Page | Route | Observed content and controls |
|---|---|---|
| ISKCON Board of Examination | `/bhagavata-mahavidyalaya` | Board-certified course catalog; search; Upcoming Courses, Ongoing Courses, and Coming Soon groups; Filters; course cards and Enroll Now actions. |
| Self-study Courses | `/self-study` | Self-study catalog with introductory text; search; English/Hindi language selectors; Filters with Categories and Teachers sections; course cards. |
| Ancient Wisdom | `/ancient-wisdom` | Self-study course catalog with search, English/Hindi selectors, Categories/Teachers filters, and course cards. |
| Kids & Parents | `/kids-parents` | Family and children course catalog with search, English/Hindi selectors, Categories/Teachers filters, and course cards. |
| Level Wise Shastric Study | `/level-wise` | Level-based shastric course catalog with search, English/Hindi selectors, Categories/Teachers filters, and courses labelled by level. |
| Live Classes | `/live-classes` | Catalog-style page with search and Filters; displayed a Coming Soon state during inspection. |

### Catalog page behavior to reproduce

- Search course listings by a text query.
- Filter or browse by upcoming/ongoing/coming-soon status where shown.
- Expose language selection on the self-study catalog pages.
- Expand/collapse filter groups, including Categories and Teachers.
- Render a responsive card grid/list with clear no-results and loading states.
- Link each course card to a course detail page.
- Keep catalog metadata consistent between homepage cards and catalog cards.

### Catalog course fields

Observed catalog cards can display:

- Course title.
- Description/summary.
- Instructor name.
- Price state (e.g., Paid) and/or price.
- Duration (hours, sessions, or other display units).
- Language or course level.
- Course category/type such as Bhakti or Certificate Course.
- Start date for scheduled courses.
- Enroll Now CTA.

The exact field set varies by course.

## 5. Course detail page

Representative detail page observed at a route pattern such as
`/course-details/{course-slug}-{id}`.

### Above-the-fold content

- Course title and summary.
- Instructor/organization.
- Price.
- Course type, for example certificate course.
- **Enroll Now** CTA.
- Key facts that may include:
  - Course duration.
  - Video/session duration.
  - Number of sessions.
  - Sessions per week.
  - Language.
  - Eligibility.

### Detail page sections

- Schedule of Classes:
  - Start date.
  - Date range.
  - Session time/timezone.
  - Regular class days.
  - **View Detailed Schedule** action.
- About the Teacher.
- Course Overview:
  - Course description.
  - Eligibility.
  - Course materials.
  - Target audience.
  - Assessment plan.
  - Course requirements or prerequisites.
- Frequently Asked Questions, shown as expandable questions.
- Supporting links may include a recommendation-letter resource or external
  application form.

Exact sections and metadata vary by offering. Schedule and eligibility must
not be inferred solely from the course category.

## 6. Publications

### Books (`/books`)

- Page introduction and categories for English Books and Hindi Books.
- Book cards show title, publisher/organization, available format(s), and
  purchase links (for example, retailer links).
- Formats observed include print and digital options.
- A bulk-purchase request form is visible with required fields:
  - First Name.
  - Last Name.
  - Address.
  - Pincode.
  - City.
  - Book selector.
  - Quantity.
  - Email.
  - Country/telephone code selector.
  - Mobile Number.
- **Submit** action.

The bulk order form was not submitted. Implement validation, clear error and
success feedback, and safe handling of address/contact data.

### E-Magazines (`/e-magazines`)

- Page heading and introduction describing a magazine archive.
- The page showed a loading state during inspection; archive filters, issue
  metadata, and download/view controls could not be confirmed.
- A comparable implementation should support a magazine archive, but exact
  fields and actions need confirmation.

## 7. About and institutional pages

| Page | Route | Observed content pattern |
|---|---|---|
| ISKCON Bhagavata Mahavidyalaya | `/iskcon-bhagavata-mahavidyalaya` | Institutional overview, mission/educational approach, and service/project information in long-form sections. |
| Srila Prabhupada | `/srila-prabhupada` | Biography page with long-form text, quote/content sections, and chronology. |
| Our Advisory Board Members | `/our-advisory-board-members` | Leadership/advisory roster presented as named people/cards grouped by role. Avoid using personal names from the live page as demo data. |
| Our Team | `/our-team` | Team roster with names and role titles, such as organizational or academic positions. Build a reusable people-card/list model. |

These pages are primarily informational and did not expose interactive forms
during inspection.

## 8. Contact (`/contact`)

- Contact page heading.
- Postal address section.
- Email and telephone contact actions.
- **Locate us** map/location section.
- No visitor contact form was visible on the inspected page.

Keep contact information configurable rather than hard-coding it in multiple
components.

## 9. Other public actions and integrations

- **Donate** navigates to a separate donation domain/site.
- **Download Our App** and footer Learner App links lead to an app store or app
  download destination.
- **Join Our Community** links to an external or community destination.
- Social links open external social channels.
- **Sign Up** / **Log In** lead to the hosted learning platform's account
  flow.
- **Enroll Now** takes the visitor into the selected course enrollment flow.
- Retailer purchase links on book cards open external book sellers.
- Some course pages contain links to external forms/resources.

External navigation should be explicit and accessible; do not imply that an
external payment or enrollment has completed until its result is confirmed.

## 10. Suggested public-site data models

These are development suggestions, not recovered source schemas.

### Course catalog item

- `id`, `slug`, `title`, `summary`, `description`
- `catalogCategory`, `language`, `level`
- `instructor`, `provider`
- `price` or free/paid state
- `duration`, `sessionCount`, `sessionsPerWeek`
- `startDate`, schedule, timezone
- eligibility/prerequisites, course materials, target audience
- assessment plan, certificate/type metadata
- image/media, publication state, catalog visibility
- enrollment destination

### Book item

- `id`, `title`, `language`, `publisher`
- available formats and external purchase URLs
- cover image and catalog visibility

### Magazine issue (proposed pending validation)

- `id`, `title`, issue date/number, language, cover image
- view/download URL, publication state

### People/organization entries

- `id`, display name, role/title, biography, image, ordering, visibility
- Separate models or grouping for advisory members and staff team.

## 11. Shared visual and interaction patterns

- Strong hero area with large headings and primary CTAs.
- Navigation dropdowns for course collections, publications, and organization
  pages.
- Reusable course cards and course metadata layouts.
- Alternating long-form informational pages and card-based directories.
- Search and collapsible filters for catalogs.
- Multilingual labels/content where relevant.
- Expandable FAQ items on course detail pages.
- Responsive behavior for mobile navigation, cards, and forms.
- Accessible heading hierarchy, keyboard-operable dropdowns, form labels,
  focus handling, and image alternative text.

## 12. Items still needing confirmation

- Whether the course filters have additional fields or filter semantics.
- Exact course card fields for every catalog and course type.
- Full enrollment/payment/checkout workflow and confirmation states.
- Course search sorting, pagination, and no-results behavior.
- E-Magazines archive fields and actions once the feed is available.
- Testimonials and Videos card metadata, carousel behavior, and destinations.
- Complete book inventory and whether retailer availability is conditional
  by format/region.
- Sign-up form validation and verification flow.
- Destination and expected behavior for Join Our Community and app-download
  CTAs.
- Analytics/cookie consent expectations and accessibility requirements.

## 13. Local public website preview

Implemented 2026-10-26 at `/website`, with the existing root portal selector
and admin/student routes preserved. This is an original public **design
preview**, not a published production enrollment service.

### Visual direction and references

- Read-only review of Sastra Nidhi: jewel-tone/gold hierarchy, serif headings,
  clear subject groupings. No launch modal, countdown, branding or assets copied.
- Read-only review of Vani Samputa: calm reading surfaces, devotional warmth
  and strong navigation contrast. No imagery, content or source copied.
- Additional public reference checks of edX, FutureLearn and OpenLearn were
  attempted for education-site discovery conventions. FutureLearn/OpenLearn
  returned HTTP 403 and the edX HTML exposed limited content; these are not
  represented as complete visual audits.
- Original deep indigo/plum hero, warm ivory sections, forest-teal editorial
  band, gold accents, real authorized book/course artwork and duotone Lucide tiles.
  Existing Inter/Crimson fonts are retained; Noto Serif Devanagari supports the
  original Hindi course names. Motion is finite, with hover lifts
  and a reduced-motion override; no autoplay, flashing or forced splash screen.
- Previously user-authorized Bhakti Shastri and Bhakti Vedanta images are
  reused locally. The official offering banner links to its external course
  page. The subsequent user request explicitly authorized taking all public
  IBMV images and course names. All 127 homepage course records were imported,
  along with 122 unique course artworks and nine publication covers. Images
  are local optimized WebP files; signed CDN URLs are not saved in source.
  `official-courses.json` preserves public names, six source group IDs, official
  detail URLs, image dimensions and available listed duration/team metadata.

### Route and behavior coverage

| Surface | Local behavior |
|---|---|
| `/website` | Hero CTAs, six learning-path links, six course rows (18 real cards), authorized official offering, editorial/about band, real publication covers, native FAQs |
| `/website/{collection}` | All six source collections and 127 course records; search, language/format/team filters, reset, count, empty state and progressive 12-card loading |
| `/website/course/{slug}` | 127 detail pages with real names/artwork, listed duration/team metadata, official destinations and explicit enrollment boundaries; no invented syllabuses |
| `/website/books` | Nine real titles/covers in English/Hindi groups, official external catalog links and native-validated unsent bulk-enquiry draft |
| `/website/e-magazines` | Honest archive-not-connected state; no fake issue files or download controls |
| `/website/iskcon-bhagavata-mahavidyalaya` | Original institutional introduction and educational approach |
| `/website/srila-prabhupada` | Concise original introductory biography; no unlicensed portrait or reproduced long-form text |
| `/website/our-advisory-board-members`, `/website/our-team` | Role-based directory layouts; approved names/biographies/photos not fabricated |
| `/website/contact` | Contact guidance and official external contact page; no unverified contact values, map tracker or message submission |
| `/website/account` | Official account-service destination clearly separated from local public student demo |
| `/website/privacy`, `/website/terms` | Explicit preview notices, not institution-approved legal policies |

144 routes total: Home, 16 secondary pages, 127 course details. Routes have
metadata and preview `noindex` instructions. Unknown collection/course paths
return not-found. Shared course data powers homepage, catalogs and details.

### Official public-site structure review

Desktop/mobile review of the legacy homepage found the contact/social/donate
utility strip, logo/navigation, grouped course/publication/about menus, mobile
hamburger menu, institution/app introduction, six horizontal course carousels,
testimonials, videos and app/community/footer content. Our course collection
counts match that snapshot: Board 3, Vedvarsity 72, Ancient Wisdom 29,
Kids & Parents 9, Level Wise 10, Live Classes 4.

The new design keeps the six-group hierarchy, course artwork and publication
identity, while improving contrast, spacing, local course discovery and mobile
navigation. Home rows use native touch scrolling and scroll snap on mobile;
desktop shows three-card previews with explicit collection links. There is no
autoplay. Full catalogs remain available on mobile with twelve cards initially
and an explicit show-more control.

Titles and images are a snapshot, not proof of current enrollment availability.
Duration and teaching team are reproduced only where shown on public cards.
Language is classified only if a title explicitly names English/Hindi; title
script alone does not establish teaching language. Unlisted values remain
unlisted. No source account records, lesson text or learner progress were read
or copied.

### Deliberate boundaries

- No auth, database, visitor tracking, payments, enrollment, order submission,
  newsletter subscription or messages. No credentials are collected.
- Book enquiries validate locally with native labels/constraints; feedback
  explicitly says nothing was sent/saved. Do not enter real personal data.
- Official contact, course, book and account destinations are identified as
  external. App, community, donation and social destinations await approval;
  no dead buttons or invented destinations have been added.
- The public inventory is imported, but live availability, verified teacher
  biographies, pricing, eligibility, schedules, certification and publication
  stock still require an approved service/data source before launch.
  Testimonials now use four short attributed excerpts and original portraits.
  The three source videos use local thumbnails and click-to-load YouTube
  privacy-enhanced embeds, without autoplay. No endorsements are fabricated.
- Institution-approved institutional copy, staff directory, full biography,
  magazine archive, privacy/terms and content ownership sign-off remain needed.
- Global dark-mode utilities exclude the public subtree just as they do the
  student subtree; the saved admin preference is not mutated.

### Verification

Use the repository ESLint, Next build and TypeScript commands. Focused Node
tests in `src/lib/website/content.test.mjs` validate route inventory, all 127
course relationships, all 122 unique artwork dimensions and combined filters.
Browser checks cover responsive
routes, header dropdown/drawer, catalog filters, FAQ, unsent enquiry validation,
light-only isolation and regression access to the other portals.

### Testimonials, videos and homepage refinement

The subsequent reference review confirmed four testimonials (HG Gauranga Das,
HG Gaurang Darshan Das, HH Bhakti Vijnana Swami, HH Bhanu Swami) and three
videos (H.G. Devakinandan Das, H.G. Gauranga Das, H.H. Gopal Krishna Goswami).
Portraits and thumbnails are saved locally under `public/website/community`.
Only short excerpts are reproduced, with a link to the official source; no
ratings or invented student experiences are attached.

The supplied legacy-site screenshot's figures (22,291+ active students, 250+
courses, 100K+ community members, 42+ countries) are labelled as published
reference figures, not live totals. A visible note distinguishes the published
course total from our 127 imported homepage listings.

Video selection explicitly loads a `youtube-nocookie.com` player in the shared
native dialog. Closing or Escape unmounts the player, stopping playback. No
third-party thumbnail requests, preload or automatic playback occur. The
dialog discloses YouTube's external processing and provides a direct watch
link if embedding is unavailable. The source playlist is linked unchanged.

Read-only Coursera homepage review informed purpose-driven sections and
clear discovery paths; Khan Academy returned a load-error page, so no visual
review is claimed. No design assets or copy were taken from those references.
The original IBMV-themed header now uses navy/plum, warm gold actions and
cream dropdowns; homepage anchors expose the course, testimonial, video and
publication sections. Section spacing is tighter, and a shared footer
invitation replaces the redundant homepage closing CTA. Footer groups and
mobile navigation include both new sections. Dropdowns close on outside
pointer interaction and Escape, while retaining native keyboard behavior.

Validation: ESLint, standalone TypeScript, nine public-content/media tests and
the production build pass. Responsive checks at 320/390/540/768/1024/1440 show
no document overflow or brand/action overlap. Verified four loaded portraits,
three loaded thumbnails, correct player IDs, 16:9 dialog sizing, close/Escape
unmount, no external media requests before selection, outside-click dropdown
dismissal, mobile Videos navigation, reduced motion and representative
catalog/book/detail route regressions. YouTube oEmbed confirms all three
videos belong to the official channel. Actual streaming playback could not be
confirmed in the integrated browser: external frames remained loading before
closing. Direct YouTube watch links remain available in every player dialog.

### Public header brand arrangement

Adapted the Vani Samputa reference's header hierarchy without copying assets:
larger circular mark (62px desktop, 52px tablet, 48px small phone), static
gold rings, cream institutional name with a gold secondary line, left-grouped
navigation and a separate right-aligned pill action. The public header now
reads "ISKCON / Bhagavata Mahavidyalaya" alongside the existing IBMV line-art
mark on a cream circle. The 80px header shares the hero's navy at the top,
switches to white with dark text beyond the hero, and stays light on secondary
routes. Scroll/resize and route changes update the appearance without changing
the saved theme. A soft gold logo halo, restrained hover glow, aligned serif
wordmark and uppercase subtitle refine the brand; reduced motion disables
transitions and hover scaling. Desktop menus use 8px gaps and generous link
padding, with a 48px brand-to-navigation gap on wide screens.
Admin branding is unchanged.
Below 400px the learner pill is omitted to preserve the full brand and
touch-sized menu; learner access remains available in the drawer.
