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
  - Vedvarsity (Self Study Courses)
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
2. Vedvarsity (Self Study Courses).
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
| Vedvarsity | `/vedvarsity` | Self-study catalog with introductory text; search; English/Hindi language selectors; Filters with Categories and Teachers sections; course cards. |
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
