# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 4.0.0 (2026-10-20)

The first release of the Tranemo fork, written by hand from the 354 commits
made between 12 September and 20 October 2026 on top of upstream Cocoso
3.1.3 (by Viktor Lyresten and Caroline). Commits from here on follow the
Conventional Commits rules in `CLAUDE.md`, so later sections are generated.

### ⚠ BREAKING CHANGES

* **One site instead of multi-tenant hosts.** The `hosts` collection is a
  single `site` document (`getSite()` on the server, `siteAtom`/`siteDoc` in
  the UI); every collection has lost its `host` field, `getHost()` is gone,
  memberships are one per user and role checks take only a user id. Absolute
  links in emails and canonical tags come from `ROOT_URL` via `publicUrl()`.
  Run `scripts/migrations/2026-09-single-site.mongosh.js` (renames
  `hosts` → `site`, strips `host` fields, drops the platform and SSO
  collections, rebuilds the memberships indexes). Set
  `public.packages.dynamic-import.useLocationOrigin` (now in the settings
  template) or every code-split route fails on a hostname other than
  `ROOT_URL`.
* **Removed with the multi-tenant model:** the platform, super admin, portal,
  federation, communities listing, host registration/verification and the
  `isSuperAdmin` flag; the SSO broker, magic-link login and OAuth 2 callback
  (local login, signup and password reset are back); the `force-ssl-custom`
  package (TLS is terminated by the reverse proxy); `percolate:migrations`.
* **Removed features:** end-to-end encrypted direct messages and user
  blocking (a password reset locked people out of their history and the
  private key sat unencrypted in `localStorage`); the Turkish language — the
  site is English and Swedish; the per-page filter & sort box (replaced by
  site-wide search); the listing popups (cards open their pages).
* **Groups (Föreningar) and works (Förfrågningar) are switched off** by
  feature flags in `imports/api/_utils/features.ts`: their routes 404,
  search skips them, their methods return nothing, and menus hide them.
* **Uploads live on local disk, not S3.** Files go to
  `settings.media.storagePath` / `MEDIA_STORAGE_PATH` (default `./media`) and
  are served under `/media`; `@aws-sdk/client-s3` and the `AWSs3` settings
  block are gone. `media.migrateFromS3` moves existing files over.
* **Required data:** a place (resource) must have an address (town plus a
  street or coordinates); a group must have an email or phone; an organizer
  — any contributor or anyone named on an event — must have public contact
  details; an event is either held at a place or carries a structured address
  of its own. The addresses migration reads addresses and phone numbers out
  of existing descriptions, converts events' free-text addresses and gives
  groups their author's contact details.
* **An event must be archived before it can be deleted.**
* **Settings:** new optional `settings.shortName` and `settings.tagline`
  (admin-editable), a season lock, and menu descriptions reused as section
  lines; the burger-menu settings no longer have any effect; the CDN setting
  is read as `settings.cdnServer` everywhere.

### Features

**Places of the municipality (orter)**

* Locations: a slug, name, description, image, publish flag, order, an
  optional composable landing page and a colour world, managed under
  `/admin/locations`. Slugs can never shadow a top-level route.
* `/<slug>` is a landing page per place, and the listing and entry routes are
  mounted a second time beneath it: `/limmared/activities` lists Limmared's
  own items first and municipality-wide ones after. Nothing is stored in a
  cookie — the URL carries the place.
* Resources, events, groups and requests belong to a location (an event held
  at a place follows the place). Items can also be "only on the municipality
  page". Launch places: Tranemo tätort, Uddebo, Limmared, Dalstorp, Länghem.
* The place is chosen in the header's brand pill; a "Visar bara … i <ort>"
  notice with a cross back to the whole municipality sits under every listing
  heading; the coloured place tag (orttag) appears on cards, entry pages and
  the header.

**Start page, header and navigation**

* A start page of its own: a seasonal welcome band with the site's name,
  tagline and an icon cluster, a Today/Tomorrow board, an endless "Varje
  vecka" strip of days, one card per section, and the place picker with Hela
  kommunen.
* The header is one sticky row: the brand pill (the crane on a green disc,
  with the chosen place), the menu pill, site-wide search, a plus to create
  and a pen to edit the page one is on (shown only to those who may), the
  account with a notification bell. It shrinks to fit, drops the menu to a
  second row only when it must, and turns to glass per element when scrolled.
  On phones: a single steady row and a menu panel with the pages' 3D icons.
* Site-wide search (`searchSite`): events, groups, places, requests, info
  pages, organizers and the municipality's places, grouped by section, within
  the place being browsed and only among what the visitor could open; a
  dropdown with keyboard navigation, past events under their own heading,
  and a full `/search?q=` results page.
* Footer: who makes the service (Uddebo Makerspace, Tranemo kommun,
  Maskinrepubliken, with the mark), Om sidan, feedback, the language pill,
  login as a footer pill when logged out and "Inloggad som …" when logged in.
* Account and Info menus in one shared panel style; the language can be
  changed from the account menu too.

**Events**

* Eight kinds of events (culture, sport, children & family, market, food,
  outdoors, learning, social) with a 3D-icon strip, compound headings
  ("Idrottsevenemang") and `?kind=` filtering. Cards redesigned: almanac date
  label, the weekly rhythm under the title, the place with a pin.
* Weekly activities are recognised from their dates (`getWeeklyPattern`:
  every Wednesday 15:30, Tue & Thu, every other week, holidays skipped) and
  shown once — on the Today board and the week strip — instead of as a dozen
  cards; outlined with a repeat mark in the calendar.
* A Filter menu shared by the events page and the calendar
  (`useEventFilters`): several kinds and places, past/upcoming, today / this
  weekend / next 7 days, all in the URL.
* Event page rebuilt as sections with sign-up on the page: dates to choose
  between for recurring events, sign-up with "hide my name", changing or
  cancelling inline, who is coming, the description, the place with map and
  address, every organizer with contact details, and for organizers/admins
  the attendee list with emails and CSV.
* Co-organizers (who manage the event like its author), public contact
  details on profiles and on events, a "write to the organizer" button.
* Archive, restore and delete from the organizer tools; archived events
  disappear from listings, calendar and profiles, and their page is served
  only to the organizer and admins, who get an "Arkiverade" tab.
* Event form rebuilt: a full-screen glass sheet with a sticky Save/Cancel
  footer that reports progress; main content wide with details in side
  columns; organizer and co-organizer cards with searchable pickers; the
  kind as 3D tiles; "Var" as a place from the register, the organizer's
  address or an address of its own; contact details from the organizer, a
  co-organizer or the event itself; occasions (Tillfällen) with the
  browser's date and time pickers and clash warnings; on/off switches, a
  capacity stepper, a numbered picture grid with a main picture, and
  errors in Swedish. Admins create and hand over events on an organizer's
  behalf; a co-organizer cannot make themself the organizer.
* Print styles for events and the calendar.

**Calendar**

* In the site's style: events coloured by kind, weekly ones outlined, the
  board on the season's woven floor, a list view on phones, our own day view
  (one paper row per event), paper rows in the list, a toolbar that becomes
  one card on smaller screens with 3dicons back/forward, and the view and
  date remembered across reloads.

**Organizers (Arrangörer)**

* Members can be marked as organizers by admins; `/people` lists only
  organizers, as round portraits with a count of upcoming events, those with
  events first. An organizer's page shows their events as Past / Upcoming /
  Archived, their picture, bio, place and contact details.
* Admins edit an organizer's profile from the header pen
  (`/admin/users/:username/profile`, new admin-only methods). Organizers
  carry an address and a place on their profile, which the event form starts
  from.

**Föreningar, places, förfrågningar and Äta/handla/bo**

* Föreningar as paper cards with the picture on top and a member count; the
  förening, place and request pages share the organizer page's design (a
  card on a green band, chips, title, text, actions, then sections).
* Place pages: the picture filling the card, the address with a map
  (MapLibre GL JS on OpenFreeMap tiles, loaded only when shown; places
  without coordinates are geocoded with Nominatim), contact details in a
  sidebar, and links to OpenStreetMap, Google Maps and Apple Maps. One
  `AddressBlock` is used wherever an address appears.
* A lightbox for entry pictures (arrow keys, swipe, Escape, a 1 / n
  counter), also used by the older slideshows; `fslightbox-react` is gone.
* Förfrågningar: requests shown as kinds to pick from (Samåkning, Låna ut,
  Vill låna, Ge bort, Hjälp sökes) and request cards with author and place.
  Currently switched off by feature flag.
* Äta/handla/bo at `/businesses`: cafés, restaurants, shops and inns as
  picture cards filtered by eat/shop/stay, each saying whether it is open now,
  with opening hours, address and a menu, range or rooms with prices.

**Admin**

* The admin home is a daily overview — the next two weeks with sign-up
  counts, new sign-ups, new members and quick actions — open to contributors
  for their own events (`getHomeOverview`).
* "View site as this user": an admin browses as any non-admin member and
  returns through a banner.
* Organizer badge and tab in the members admin; a colour world per place in
  the location form; a season lock under site settings; admin panels and the
  sidebar on the site's paper.

**Design: "Hemma i Tranemo"**

* A theme foundation of materials (paper, mylla, tegel, lingon), radii,
  shadows, Fraunces for headings and Raleway for text, and four seasonal
  variable sets chosen by date (`?season=` to preview, lockable by admins).
  Themes can give their dark shades their own hue and saturation.
* Pills, fields, badges, tabs, dialogs, toasts, the bottom shelf, cards,
  lists, detail pages, admin and the not-found page in the target style;
  motion that respects reduced-motion settings; one page measure for every
  block and a footer that stays at the bottom.
* 66 soft 3D icons from 3dicons.co (CC0), one per section, plus our own
  "trana" crane, modelled and rendered in Blender from a reproducible script:
  the header mark, the favicons and the social share image. No alcohol
  imagery anywhere.
* Generated abstract-shape placeholders, in the item's or place's colours,
  wherever content has no picture.
* The design target, baseline and implementation notes under `docs/design`.

**Media, languages and SSR**

* Local media storage with immutable caching and forced download (nosniff)
  for non-image, non-PDF files.
* Server-side translations are read from disk, so pages render in the site's
  language — Swedish — from the very first byte, dates included, and
  hydrate in the same language and date locale. A visitor's language pick is
  remembered in a cookie. Swedish copy rewritten to speak like a neighbour
  ("Anmäl mig"), the terms page translated for the municipality.
* Each server request renders in a Jotai store of its own, so previews
  (`?season=`, `?lng=`) no longer leak between visitors.

**Accessibility and SEO**

* One `h1` per page, a `<main>` landmark and a skip link; labels tied to
  their controls, names on icon-only buttons, visible keyboard focus.
* A favicon, a drawn social image and a real description per page; the site's
  name in page titles; `og:image` omitted rather than `null` when there is
  no picture.

### Bug Fixes

* Authorization: `saveUserInfo` spread arbitrary client input into `$set`,
  so any user could make themself super admin — now an allow-list;
  `getCurrentUser` returned the full user document including the password
  hash; by-id mutations could edit another tenant's content; internal
  functions were callable as methods; attendance methods did not validate;
  names in email HTML were not escaped; no rate limits on email, account and
  upload methods. All closed.
* Attendee privacy: every visitor received every registration, email
  included. Attendees are redacted server-side; only organizers and admins
  see emails and hidden names; duplicate and capacity checks moved to the
  server.
* Method bugs: `setHostHue` updated an undefined id; `validateLabel` read
  `.length` off a Promise so duplicate names were never rejected;
  `setAvatar` targeted the wrong array; `deletePage` mapped an unresolved
  cursor; `createAccount` threw an object as the error code.
* Code-split routes failed with "Cannot find module" on any hostname other
  than `ROOT_URL`; the route error boundary now also shows the error.
* Hydration: the server rendered English for Swedish visitors; `collection2`
  could load after `Memberships.attachSchema`; the group members dialog,
  request pages (an anchor inside an anchor), detail pages on phones,
  loader-less routes and style shorthands spread onto the DOM all failed to
  hydrate. Fixed.
* "Today" was computed when a module loaded, so on a long-running server the
  past/upcoming split drifted; it is read per render.
* Share buttons threw without `navigator.clipboard`; visitors pressing "Gå
  med" got a confirmation that could only fail; unknown groups and places
  rendered an empty page instead of not-found; Back from the profile
  settings and admin tabs jumped forward again; a failing Google Fonts
  request on every page for the generic `sans-serif` family; translation
  keys that had drifted and never resolved; group meetings could not be
  removed; an event with registration switched off still accepted sign-ups;
  editing an event dropped its kind, contact and co-organizers.

### Build, tooling and infrastructure

* A multi-stage Dockerfile (Meteor 3.5.2 builder, slim Node runtime), a
  compose stack for the app, MongoDB and the media/database volumes, and a
  GitHub Actions workflow publishing native amd64 and arm64 images to GHCR
  on every push to `main`.
* CI running lint, typecheck and i18n parity. TypeScript tooling repaired
  (real Meteor 3 types, TS 5) with a typecheck ratchet: 1372 pre-existing
  errors recorded in `typecheck-baseline.json`, only new ones fail. ESLint
  made runnable (flat config) and its 330 errors fixed; `check:i18n`; knip.
* 24 unreferenced files and 21 unused publications removed — one of them
  published every document in the database unfiltered.
* Documentation rewritten: README, architecture, configuration, development,
  deployment, the audit, and `CLAUDE.md` with the rules for working on
  `main` and writing changelog-grade commits.
* Idempotent `mongosh` seed scripts under `scripts/seed/` for the places,
  resource photographs, example events and weekly activities, föreningar,
  request kinds, businesses and example pictures (Wikimedia Commons, credited,
  example data marked as such).

### 3.1.3 (2026-02-01)
