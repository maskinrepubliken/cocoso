/**
 * Reading Axiell's open event API, the one behind the calendars of Axiell
 * Arena library sites (as Knallebiblioteken's /evenemang). It needs no key:
 * the site's own page asks it the same questions from the browser.
 *
 *   GET https://api.axiell.com/event/api/customers/<customerId>/search
 *   GET https://api.axiell.com/event/api/customers/<customerId>/aggregation/terms
 *
 * Server only.
 */

const API = 'https://api.axiell.com/event/api/customers';
const PAGE = 100;
// Stop far beyond any real calendar, so a broken answer can't loop forever
const MAX_EVENTS = 2000;

// An event as the mirror needs it, whatever the source
export interface SourceEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  isCancelled: boolean;
  modifiedAt?: Date;
  imageUrl?: string;
  tags: string[];
  // The event's own page at the source, when the source gives it whole;
  // without it the mirror's eventUrl is filled in with the id
  url?: string;
}

// The answer to a GET, or to a POST of the body when there is one
export async function getJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined
      ? {}
      : { method: 'POST', body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`${response.status} from ${new URL(url).pathname}`);
  }
  return response.json();
}

const query = (params: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ])
  ).toString();

// Published or cancelled, not deleted, and not yet over
const baseFilters = () => ({
  rangeFilters: [{ field: 'event.endDate', gte: new Date().toISOString() }],
  termFilters: [
    { field: 'event.status', values: ['PUBLISHED', 'CANCELLED'] },
    { type: 'NOT_IN', field: 'event.deleted', values: [true] },
  ],
});

function toSourceEvent(hit: any): SourceEvent | null {
  const event = hit?.event;
  if (!event?.id || !event.title || !event.startDate) {
    return null;
  }
  const images = Array.isArray(event.images) ? event.images : [];
  const image = images.find((i: any) => i?.primaryImage) || images[0];
  return {
    id: String(event.id),
    title: String(event.title).trim(),
    description: String(event.description || ''),
    start: new Date(event.startDate),
    end: new Date(event.endDate || event.startDate),
    isCancelled: event.status === 'CANCELLED',
    modifiedAt: hit.modifiedDate ? new Date(hit.modifiedDate) : undefined,
    imageUrl: image?.imageUrl || undefined,
    tags: Array.isArray(event.tags) ? event.tags.map(String) : [],
  };
}

// Every event still to come at the place, as the source's calendar lists it
export async function fetchAxiellEvents(
  customerId: string,
  location: string
): Promise<SourceEvent[]> {
  const filters = baseFilters();
  filters.termFilters.push({
    field: 'event.location.value',
    values: [location],
  });
  const events: SourceEvent[] = [];
  for (let start = 0; start < MAX_EVENTS; start += PAGE) {
    const page = await getJson(
      `${API}/${encodeURIComponent(customerId)}/search?${query({
        queryString: '*',
        ...filters,
        sorts: [{ field: 'event.startDate', order: 'ASC' }],
        start: String(start),
        size: String(PAGE),
      })}`
    );
    const hits = Array.isArray(page?.hits) ? page.hits : [];
    hits.forEach((hit: any) => {
      const event = toSourceEvent(hit);
      if (event) {
        events.push(event);
      }
    });
    if (hits.length < PAGE || start + PAGE >= (page?.totalHits || 0)) {
      break;
    }
  }
  return events;
}

// The places the source has events at, with how many: for the admin's
// choice of place
export async function fetchAxiellLocations(
  customerId: string
): Promise<{ name: string; count: number }[]> {
  const result = await getJson(
    `${API}/${encodeURIComponent(customerId)}/aggregation/terms?${query({
      aggFields: 'event.location.value',
      ...baseFilters(),
    })}`
  );
  const buckets = result?.aggregations?.[0]?.buckets || [];
  return buckets
    .map((b: any) => ({ name: String(b.key), count: Number(b.count) || 0 }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name, 'sv'));
}
