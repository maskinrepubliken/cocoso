import Car from 'lucide-react/dist/esm/icons/car';
import Gift from 'lucide-react/dist/esm/icons/gift';
import HandHelping from 'lucide-react/dist/esm/icons/hand-helping';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import PackageSearch from 'lucide-react/dist/esm/icons/package-search';
import Users from 'lucide-react/dist/esm/icons/users';

// The kinds of förfrågningar. A request is a work whose category label is
// one of these; the label is what is stored, so keep it unchanged. Names
// and descriptions are in common.yml under requests.kinds.<key>.
export const REQUEST_KINDS = [
  { key: 'carpool', label: 'samåkning', icon: Car, color: '#c9cfa4' },
  { key: 'lend', label: 'låna ut', icon: HandHelping, color: '#e2c6a8' },
  { key: 'borrow', label: 'vill låna', icon: PackageSearch, color: '#d9c79a' },
  { key: 'giveaway', label: 'ge bort', icon: Gift, color: '#d8bfa9' },
  { key: 'help', label: 'hjälp sökes', icon: HeartHandshake, color: '#c3d1b8' },
  { key: 'company', label: 'sällskap', icon: Users, color: '#e9dcc4' },
  { key: 'tips', label: 'tips', icon: Lightbulb, color: '#cdc3b4' },
] as const;

export type RequestKind = (typeof REQUEST_KINDS)[number];

export const findRequestKind = (label?: string): RequestKind | undefined =>
  REQUEST_KINDS.find((kind) => kind.label === label?.toLowerCase());
