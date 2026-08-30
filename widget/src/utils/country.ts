// Zero-dependency country helpers. Replaces `countries-list` (country names →
// native Intl.DisplayNames) and `countries-and-timezones` (a compact
// country → representative IANA timezone map, ~1 KB vs the ~12 KB library).

let regionNames: Intl.DisplayNames | null | undefined;

function getRegionNames(): Intl.DisplayNames | null {
  if (regionNames !== undefined) return regionNames;
  try {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    regionNames = null;
  }
  return regionNames;
}

/**
 * ISO 3166-1 alpha-2 code → English country name, or '' when the code is
 * malformed or has no known name (callers show just the raw code then).
 */
export function countryName(code: string): string {
  const cc = code?.toUpperCase();
  if (!cc || cc.length !== 2) return '';
  const dn = getRegionNames();
  if (!dn) return '';
  try {
    const name = dn.of(cc);
    // Intl returns the code unchanged when there's no display name.
    return name && name !== cc ? name : '';
  } catch {
    return '';
  }
}

// One representative IANA zone per country (covers the demo set + common
// countries). Unknown codes return null → the UI hides local time.
const COUNTRY_TIMEZONES: Record<string, string> = {
  AE: 'Asia/Dubai',
  AR: 'America/Argentina/Buenos_Aires',
  AT: 'Europe/Vienna',
  AU: 'Australia/Sydney',
  BE: 'Europe/Brussels',
  BG: 'Europe/Sofia',
  BR: 'America/Sao_Paulo',
  CA: 'America/Toronto',
  CH: 'Europe/Zurich',
  CL: 'America/Santiago',
  CN: 'Asia/Shanghai',
  CO: 'America/Bogota',
  CZ: 'Europe/Prague',
  DE: 'Europe/Berlin',
  DK: 'Europe/Copenhagen',
  EG: 'Africa/Cairo',
  ES: 'Europe/Madrid',
  FI: 'Europe/Helsinki',
  FR: 'Europe/Paris',
  GB: 'Europe/London',
  GR: 'Europe/Athens',
  HK: 'Asia/Hong_Kong',
  HU: 'Europe/Budapest',
  ID: 'Asia/Jakarta',
  IE: 'Europe/Dublin',
  IL: 'Asia/Jerusalem',
  IN: 'Asia/Kolkata',
  IT: 'Europe/Rome',
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  MA: 'Africa/Casablanca',
  MX: 'America/Mexico_City',
  MY: 'Asia/Kuala_Lumpur',
  NG: 'Africa/Lagos',
  NL: 'Europe/Amsterdam',
  NO: 'Europe/Oslo',
  NZ: 'Pacific/Auckland',
  PE: 'America/Lima',
  PH: 'Asia/Manila',
  PL: 'Europe/Warsaw',
  PT: 'Europe/Lisbon',
  RO: 'Europe/Bucharest',
  RS: 'Europe/Belgrade',
  RU: 'Europe/Moscow',
  SA: 'Asia/Riyadh',
  SE: 'Europe/Stockholm',
  SG: 'Asia/Singapore',
  SK: 'Europe/Bratislava',
  TH: 'Asia/Bangkok',
  TR: 'Europe/Istanbul',
  TW: 'Asia/Taipei',
  UA: 'Europe/Kyiv',
  US: 'America/New_York',
  VN: 'Asia/Ho_Chi_Minh',
  ZA: 'Africa/Johannesburg',
};

/** ISO alpha-2 code → representative IANA timezone, or null if unknown. */
export function countryTimeZone(code: string): string | null {
  return COUNTRY_TIMEZONES[code?.toUpperCase()] ?? null;
}
