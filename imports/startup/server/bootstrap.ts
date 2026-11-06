import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Mongo } from 'meteor/mongo';
import crypto from 'crypto';
import { readFile } from 'fs/promises';

import Site, { getSite } from '/imports/api/site/site';
import Memberships from '/imports/api/memberships/membership';
import Locations from '/imports/api/locations/location';
import Resources from '/imports/api/resources/resource';
import Categories from '/imports/api/categories/category';
import Pages from '/imports/api/pages/page';
import {
  defaultEmails,
  defaultMenu,
  defaultTheme,
} from '/imports/startup/constants';

/**
 * Creates the site from `Meteor.settings.site` the first time the server
 * starts against an empty database. There is no setup page in the browser.
 *
 *   "site": {
 *     "name": "Tranemo",
 *     "admin": { "username": "admin", "email": "admin@example.org" },
 *     "data": "tranemo"
 *   }
 *
 * - The site is named `<name>kalendern` ("Tranemokalendern"), with `<name>`
 *   as the short name in the header.
 * - The admin account gets a generated password, printed once to the server
 *   log. Admins can also log in by email code like everyone else.
 * - `data` names a pack in private/bootstrap/<data>/ (written by
 *   scripts/export-bootstrap-pack.mongosh.js): places, venues, request kinds
 *   and pages. Each part is loaded only into an empty collection, and only
 *   once: `site.bootstrap` records it, so nothing an admin later deletes
 *   comes back on a restart. On an existing site this fills in the parts it
 *   has never had.
 */

interface SiteConfig {
  name?: string;
  admin?: { username?: string; email?: string };
  data?: string;
}

type Part = 'locations' | 'resources' | 'categories' | 'pages';

const log = (...args: unknown[]) => console.info('[bootstrap]', ...args);

async function readPack(pack: string, part: Part): Promise<any[] | null> {
  try {
    const file = Assets.absoluteFilePath(`bootstrap/${pack}/${part}.json`);
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function createSite(config: SiteConfig) {
  const name = config.name!.trim();
  await Site.insertAsync({
    emails: defaultEmails,
    settings: {
      name: `${name}kalendern`,
      shortName: name,
      email: config.admin?.email,
      lang: 'sv',
      menu: defaultMenu,
    },
    theme: defaultTheme,
    createdAt: new Date(),
  });
  log(`created the site "${name}kalendern"`);
}

// The first admin, or a new one from the config when there is none.
async function ensureAdmin(config: SiteConfig) {
  const membership = await Memberships.findOneAsync({ role: 'admin' });
  if (membership) {
    return await Meteor.users.findOneAsync({ _id: membership.userId });
  }

  const { username, email } = config.admin || {};
  if (!username || !email) {
    console.warn(
      '[bootstrap] there is no admin and settings.site.admin lacks username or email'
    );
    return null;
  }

  let user = await Accounts.findUserByUsername(username);
  if (!user) {
    const password = crypto.randomBytes(12).toString('base64url');
    const userId = await Accounts.createUserAsync({
      username,
      email,
      password,
    });
    await Meteor.users.updateAsync(
      { _id: userId },
      { $set: { 'emails.0.verified': true, lang: 'sv' } }
    );
    user = await Meteor.users.findOneAsync({ _id: userId });
    log(
      `created the admin "${username}" <${email}>. Password, shown only this once: ${password}`
    );
    log(
      'log in at /login?losenord with it, or by email code at /login; change it under your profile'
    );
  }

  await Memberships.upsertAsync(
    { userId: user!._id },
    {
      $set: { role: 'admin', isPublic: true },
      $setOnInsert: { joinDate: new Date() },
    }
  );
  return user;
}

async function loadPart(
  part: Part,
  docs: any[],
  admin: Meteor.User
): Promise<number> {
  const now = new Date();

  if (part === 'locations') {
    for (const doc of docs) {
      await Locations.insertAsync({ ...doc, createdAt: now });
    }
  }

  if (part === 'resources') {
    const locations = await Locations.find({}).fetchAsync();
    const idBySlug = Object.fromEntries(locations.map((l) => [l.slug, l._id]));
    for (const { location, ...doc } of docs) {
      await Resources.insertAsync({
        ...doc,
        ...(location && idBySlug[location]
          ? { locationId: idBySlug[location] }
          : {}),
        userId: admin._id,
        createdBy: admin.username,
        createdAt: now,
      });
    }
  }

  if (part === 'categories') {
    for (const doc of docs) {
      await Categories.insertAsync({
        ...doc,
        addedBy: admin._id,
        addedUsername: admin.username,
        addedDate: now,
      });
    }
  }

  if (part === 'pages') {
    for (const doc of docs) {
      await Pages.insertAsync({
        ...doc,
        authorId: admin._id,
        authorName: admin.username,
        creationDate: now,
      });
    }
  }

  return docs.length;
}

const COLLECTIONS: Record<Part, Mongo.Collection<any>> = {
  locations: Locations,
  resources: Resources,
  categories: Categories,
  pages: Pages,
};

async function loadPack(pack: string, admin: Meteor.User) {
  // Places first: venues point at them by slug.
  const parts: Part[] = ['locations', 'resources', 'categories', 'pages'];
  for (const part of parts) {
    const site = await getSite();
    if (!site || site.bootstrap?.[part]) {
      continue;
    }

    const docs = await readPack(pack, part);
    if (!docs) {
      continue;
    }

    let loaded = 0;
    if ((await COLLECTIONS[part].find({}).countAsync()) === 0) {
      loaded = await loadPart(part, docs, admin);
      log(`loaded ${loaded} ${part} from the "${pack}" pack`);
    } else {
      log(`${part} already has content; the "${pack}" pack is not loaded`);
    }

    await Site.updateAsync(
      { _id: site._id },
      {
        $set: {
          [`bootstrap.${part}`]: { pack, loaded, at: new Date() },
        },
      }
    );
  }
}

export async function bootstrapSite() {
  const config: SiteConfig = Meteor.settings.site || {};

  if (!config.name) {
    if (!(await getSite())) {
      console.warn(
        '[bootstrap] there is no site and settings.site.name is not set — see docs/CONFIGURATION.md'
      );
    }
    return;
  }

  if (!(await getSite())) {
    await createSite(config);
  }

  const admin = await ensureAdmin(config);
  if (admin && config.data) {
    await loadPack(config.data, admin);
  }
}
