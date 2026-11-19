// The site's name in two parts, when it begins with the short name
// ("Tranemo" + "kalendern"): the start page hero and the header's brand
// set the rest in a softer green.
export default function splitSiteName(settings: any): [string, string | null] {
  const name: string = settings?.name || settings?.shortName || '';
  const short: string | undefined = settings?.shortName;
  return short && name.startsWith(short) && name.length > short.length
    ? [short, name.slice(short.length)]
    : [name, null];
}
