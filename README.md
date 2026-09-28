# Cocoso — Community Cooperation Software

This is **cocoso**, a maintained fork of
[eminx/cocoso](https://github.com/eminx/cocoso) that tracks upstream and
adds local media storage, a security hardening pass and tooling.

![Cocoso logo](https://www.cocoso.info/cocoso-logo.png)

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Meteor](https://img.shields.io/badge/Meteor-3.5-DE4F4F?logo=meteor&logoColor=white)](https://www.meteor.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![GitHub issues](https://img.shields.io/github/issues/maskinrepubliken/cocoso)](https://github.com/maskinrepubliken/cocoso/issues)
[![CI](https://github.com/maskinrepubliken/cocoso/actions/workflows/ci.yml/badge.svg)](https://github.com/maskinrepubliken/cocoso/actions/workflows/ci.yml)

[cocoso.info](https://www.cocoso.info/)

Cocoso is a web platform for communities that share space, time and work:
festivals, associations, artist-run initiatives, schools, studios,
cooperatives. One installation hosts many independent community sites, each
with its own domain, members, look and content, while people keep a single
account across all of them.

It is free software, free of trackers, and you run it on your own server
with your own data.

## What a community gets

- **Activities** — public events with one or many dates, RSVP with email
  confirmation, attendee lists for the door, CSV export.
- **Calendar** — month, week, day and agenda views combining activities and
  resource bookings.
- **Resources** — bookable shared things (rooms, tools, vehicles) with
  conflict checking and combined resources.
- **Groups** — a page per working group: description, members, meetings,
  documents and a discussion thread with email notifications.
- **Works** — portfolio entries for members: text, images, media.
- **Pages** and **Composable pages** — a simple CMS plus a block-based page
  builder for landing pages.
- **People** — member directory with roles (participant, contributor,
  admin), verification, keywords and profiles.
- **Direct messages** — end-to-end encrypted in the browser.
- **Newsletters** — compose from existing activities and works, preview,
  send to members.
- **Admin** — per-community settings, theme and colours, menu, emails,
  categories, reports moderation.
- **Platform** — a portal host that aggregates public content from all
  communities, super-admin tools, optional single sign-on across domains.
- **Languages** — English, Swedish, Turkish; translations are plain YAML.

## Technology

Meteor 3 (Node 22) with MongoDB, React 18 rendered on the server and
hydrated in the browser, React Router 7, jotai for state, Stitches for
styling, i18next, Sharp for image processing, React Email and SMTP for
mail. Uploaded files are stored on the application server and served under
`/media`.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit.

## Getting started

```bash
git clone https://github.com/maskinrepubliken/cocoso.git
cd cocoso
meteor npm install
cp changethis.settings.json private/settings.json   # edit; see docs/CONFIGURATION.md
npm start                                           # http://localhost:3000
```

The first visit opens a setup wizard that creates the platform, the first
community and the first super-admin account.

| Guide                                          | Contents                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)     | scripts, conventions, type checking, TypeScript migration status    |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | every settings key and environment variable                         |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | multi-tenancy, request flow, auth and SSO, media, email, i18n       |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)       | build, proxy, persistent storage, adding tenants, S3 migration      |
| [docs/AUDIT.md](docs/AUDIT.md)                 | September 2026 code audit: what was fixed and the remaining backlog |

## Quality checks

```bash
npm run lint         # ESLint, zero errors enforced
npm run typecheck    # tsc against a shrinking baseline of known errors
npm run check:i18n   # translation key parity across languages
npm run check:deps   # unused files, exports and dependencies
```

These run in CI on every push. There is no automated test suite yet;
contributions there are very welcome.

## Contributing

Issues and pull requests for this fork go to
[github.com/maskinrepubliken/cocoso](https://github.com/maskinrepubliken/cocoso);
changes that belong to everyone should also be offered upstream at
[github.com/eminx/cocoso](https://github.com/eminx/cocoso). Keep pull
requests focused, run the checks above, and follow the conventions in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Commit messages in
[Conventional Commits](https://www.conventionalcommits.org/) style
(`feat:`, `fix:`, `chore:`) feed the changelog generated by `npm run release`.

## License

GPL-3.0. See [LICENSE.txt](LICENSE.txt).
