/**
 * Geographic Projection & Sri Lankan Geocoding / Reverse-Geocoding Service
 * Member 04 — Head Office Organization Admin UI
 *
 * Provides:
 * 1. Web Mercator (EPSG:3857) projection utilities for interactive slippy-map rendering,
 *    click-to-coordinate conversion, marker dragging, and accurate circular radius scaling
 *    for Member 03's `ServiceAreaResponse` (`maxRadiusKm`).
 * 2. Forward address search (`searchLocations`) and reverse geocoding (`reverseGeocodeLocation`)
 *    backed by OpenStreetMap Nominatim (`NEXT_PUBLIC_GEOCODING_API_URL`) with a comprehensive
 *    Sri Lankan municipal & suburb gazetteer fallback so searches and marker drags remain
 *    responsive even in offline, sandboxed, or rate-limited environments.
 *
 * IMPORTANT BOUNDARY:
 * This module does NOT perform customer branch-resolution eligibility business logic
 * (`POST /api/v1/organization/branches/resolve`), which is owned by Member 03's backend.
 */

export interface GeocodingSuggestion {
  id: string;
  displayName: string;
  shortTitle: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  latitude: number;
  longitude: number;
  source: 'nominatim' | 'sri-lanka-gazetteer';
}

export interface ReverseGeocodeResult {
  displayName: string;
  addressLine1: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  source: 'nominatim' | 'sri-lanka-gazetteer' | 'coordinates-only';
}

/**
 * All 25 Administrative Districts of Sri Lanka.
 */
export const SRI_LANKAN_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
] as const;

const CITY_TO_DISTRICT_MAP: Record<string, string> = {
  colombo: 'Colombo',
  nugegoda: 'Colombo',
  dehiwala: 'Colombo',
  'mount lavinia': 'Colombo',
  moratuwa: 'Colombo',
  maharagama: 'Colombo',
  rajagiriya: 'Colombo',
  battaramulla: 'Colombo',
  kotte: 'Colombo',
  'sri jayawardenepura kotte': 'Colombo',
  kaduwela: 'Colombo',
  homagama: 'Colombo',
  piliyandala: 'Colombo',
  malabe: 'Colombo',
  kolonnawa: 'Colombo',
  negombo: 'Gampaha',
  gampaha: 'Gampaha',
  wattala: 'Gampaha',
  kelaniya: 'Gampaha',
  kadawatha: 'Gampaha',
  kiribathgoda: 'Gampaha',
  ja_ela: 'Gampaha',
  'ja-ela': 'Gampaha',
  minuwangoda: 'Gampaha',
  kalutara: 'Kalutara',
  panadura: 'Kalutara',
  horana: 'Kalutara',
  beruwala: 'Kalutara',
  kandy: 'Kandy',
  peradeniya: 'Kandy',
  katugastota: 'Kandy',
  gampola: 'Kandy',
  matale: 'Matale',
  dambulla: 'Matale',
  'nuwara eliya': 'Nuwara Eliya',
  hatton: 'Nuwara Eliya',
  galle: 'Galle',
  karapitiya: 'Galle',
  hikkaduwa: 'Galle',
  ambalangoda: 'Galle',
  matara: 'Matara',
  weligama: 'Matara',
  hambantota: 'Hambantota',
  tangalle: 'Hambantota',
  jaffna: 'Jaffna',
  chavakachcheri: 'Jaffna',
  kilinochchi: 'Kilinochchi',
  mannar: 'Mannar',
  vavuniya: 'Vavuniya',
  mullaitivu: 'Mullaitivu',
  batticaloa: 'Batticaloa',
  ampara: 'Ampara',
  kalmunai: 'Ampara',
  trincomalee: 'Trincomalee',
  kurunegala: 'Kurunegala',
  kuliyapitiya: 'Kurunegala',
  puttalam: 'Puttalam',
  chilaw: 'Puttalam',
  anuradhapura: 'Anuradhapura',
  polonnaruwa: 'Polonnaruwa',
  badulla: 'Badulla',
  bandarawela: 'Badulla',
  monaragala: 'Monaragala',
  ratnapura: 'Ratnapura',
  embilipitiya: 'Ratnapura',
  kegalle: 'Kegalle',
  mawanella: 'Kegalle',
};

/**
 * Infers the Sri Lankan administrative district from a branch's explicit district, city, or address.
 */
export function inferSriLankanDistrict(
  city?: string | null,
  explicitDistrict?: string | null,
  addressLine2?: string | null
): string {
  const trimmedDistrict = explicitDistrict?.trim();
  if (trimmedDistrict) {
    const clean = trimmedDistrict.replace(/\s+district$/i, '').trim();
    const matchedDistrict = SRI_LANKAN_DISTRICTS.find(
      (d) => d.toLowerCase() === clean.toLowerCase()
    );
    if (matchedDistrict) return matchedDistrict;
    return clean;
  }

  const trimmedCity = city?.trim() || '';
  if (trimmedCity) {
    const lowerCity = trimmedCity.toLowerCase().replace(/\s+\d+$/, '');
    if (CITY_TO_DISTRICT_MAP[lowerCity]) {
      return CITY_TO_DISTRICT_MAP[lowerCity];
    }
    const matchedFromDistrictList = SRI_LANKAN_DISTRICTS.find(
      (d) => lowerCity.includes(d.toLowerCase())
    );
    if (matchedFromDistrictList) {
      return matchedFromDistrictList;
    }
  }

  if (addressLine2) {
    const lowerAddr2 = addressLine2.toLowerCase();
    for (const [cityKey, distVal] of Object.entries(CITY_TO_DISTRICT_MAP)) {
      if (lowerAddr2.includes(cityKey)) {
        return distVal;
      }
    }
  }

  return trimmedCity || 'Colombo';
}

/**
 * Default Sri Lanka center coordinates (Colombo Fort).
 */
export const DEFAULT_SRI_LANKA_CENTER = {
  latitude: 6.9271,
  longitude: 79.8612,
  city: 'Colombo',
} as const;

/**
 * Comprehensive Sri Lankan cities, suburbs, and commercial hubs gazetteer.
 * Supports Colombo, Kandy, Galle, Negombo, Kurunegala, and major Sri Lankan towns/suburbs.
 */
export const SRI_LANKAN_LOCATION_GAZETTEER: readonly GeocodingSuggestion[] = [
  {
    id: 'lk-cmb-fort',
    shortTitle: 'Colombo 01 — Fort Commercial District',
    displayName: 'Janadhipathi Mawatha, Colombo 01 (Fort), Colombo, Sri Lanka',
    addressLine1: 'No. 48, Janadhipathi Mawatha',
    addressLine2: 'Colombo 01 (Fort)',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9344,
    longitude: 79.8428,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-union-place',
    shortTitle: 'Colombo 02 — Union Place / Slave Island',
    displayName: 'Union Place, Colombo 02, Colombo, Sri Lanka',
    addressLine1: 'No. 142, Union Place',
    addressLine2: 'Colombo 02',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9218,
    longitude: 79.8562,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-kollupitiya',
    shortTitle: 'Colombo 03 — Kollupitiya (Galle Road)',
    displayName: 'Galle Road, Kollupitiya, Colombo 03, Sri Lanka',
    addressLine1: 'No. 285, Galle Road, Kollupitiya',
    addressLine2: 'Colombo 03',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9108,
    longitude: 79.8507,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-bambalapitiya',
    shortTitle: 'Colombo 04 — Bambalapitiya',
    displayName: 'Galle Road, Bambalapitiya, Colombo 04, Sri Lanka',
    addressLine1: 'No. 112, Galle Road, Bambalapitiya',
    addressLine2: 'Colombo 04',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.8935,
    longitude: 79.8558,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-havelock',
    shortTitle: 'Colombo 05 — Havelock Town / Kirulapone',
    displayName: 'Havelock Road, Colombo 05, Colombo, Sri Lanka',
    addressLine1: 'No. 180, Havelock Road',
    addressLine2: 'Colombo 05',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.8832,
    longitude: 79.8672,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-wellawatte',
    shortTitle: 'Colombo 06 — Wellawatte',
    displayName: 'Galle Road, Wellawatte, Colombo 06, Sri Lanka',
    addressLine1: 'No. 320, Galle Road, Wellawatte',
    addressLine2: 'Colombo 06',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.8741,
    longitude: 79.8605,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-cinnamon-gardens',
    shortTitle: 'Colombo 07 — Cinnamon Gardens',
    displayName: 'Ward Place, Cinnamon Gardens, Colombo 07, Sri Lanka',
    addressLine1: 'No. 55, Ward Place',
    addressLine2: 'Colombo 07',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9147,
    longitude: 79.869,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-borella',
    shortTitle: 'Colombo 08 — Borella Junction',
    displayName: 'Baseline Road, Borella, Colombo 08, Sri Lanka',
    addressLine1: 'No. 88, Baseline Road, Borella',
    addressLine2: 'Colombo 08',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9148,
    longitude: 79.8778,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-dematagoda',
    shortTitle: 'Colombo 09 — Dematagoda',
    displayName: 'Baseline Road, Dematagoda, Colombo 09, Sri Lanka',
    addressLine1: 'No. 42, Baseline Road, Dematagoda',
    addressLine2: 'Colombo 09',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9421,
    longitude: 79.8772,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-maradana',
    shortTitle: 'Colombo 10 — Maradana / Panchikawatte',
    displayName: 'Maradana Road, Colombo 10, Sri Lanka',
    addressLine1: 'No. 165, Maradana Road',
    addressLine2: 'Colombo 10',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9292,
    longitude: 79.8658,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-cmb-pettah',
    shortTitle: 'Colombo 11 — Pettah Main Street',
    displayName: 'Main Street, Pettah, Colombo 11, Sri Lanka',
    addressLine1: 'No. 94, Main Street, Pettah',
    addressLine2: 'Colombo 11',
    city: 'Colombo',
    district: 'Colombo',
    latitude: 6.9369,
    longitude: 79.8524,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-kandy-central',
    shortTitle: 'Kandy — Peradeniya Road / City Centre',
    displayName: 'Peradeniya Road, Kandy, Central Province, Sri Lanka',
    addressLine1: 'No. 210, Peradeniya Road',
    addressLine2: 'Kandy City Centre',
    city: 'Kandy',
    district: 'Kandy',
    latitude: 7.2906,
    longitude: 80.6337,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-kandy-katugastota',
    shortTitle: 'Kandy — Katugastota Hub',
    displayName: 'Katugastota Road, Kandy, Sri Lanka',
    addressLine1: 'No. 74, Katugastota Road',
    addressLine2: 'Katugastota',
    city: 'Kandy',
    district: 'Kandy',
    latitude: 7.3239,
    longitude: 80.6214,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-galle-central',
    shortTitle: 'Galle — Wakwella Road / Galle Town',
    displayName: 'Wakwella Road, Galle, Southern Province, Sri Lanka',
    addressLine1: 'No. 64, Wakwella Road',
    addressLine2: 'Galle Town',
    city: 'Galle',
    district: 'Galle',
    latitude: 6.0535,
    longitude: 80.221,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-galle-karapitiya',
    shortTitle: 'Galle — Karapitiya',
    displayName: 'Hirimbura Cross Road, Karapitiya, Galle, Sri Lanka',
    addressLine1: 'No. 38, Hirimbura Cross Road, Karapitiya',
    city: 'Galle',
    district: 'Galle',
    latitude: 6.0686,
    longitude: 80.2266,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-negombo-central',
    shortTitle: 'Negombo — Colombo Road / Town Centre',
    displayName: 'Colombo Road, Negombo, Western Province, Sri Lanka',
    addressLine1: 'No. 128, Colombo Road',
    addressLine2: 'Negombo Commercial Zone',
    city: 'Negombo',
    district: 'Gampaha',
    latitude: 7.2008,
    longitude: 79.8358,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-kurunegala-central',
    shortTitle: 'Kurunegala — Colombo Road / Clock Tower Hub',
    displayName: 'Colombo Road, Kurunegala, North Western Province, Sri Lanka',
    addressLine1: 'No. 95, Colombo Road',
    addressLine2: 'Kurunegala Town',
    city: 'Kurunegala',
    district: 'Kurunegala',
    latitude: 7.4818,
    longitude: 80.3609,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-nugegoda',
    shortTitle: 'Nugegoda — High Level Road',
    displayName: 'High Level Road, Nugegoda, Colombo, Sri Lanka',
    addressLine1: 'No. 154, High Level Road',
    addressLine2: 'Nugegoda Junction',
    city: 'Nugegoda',
    district: 'Colombo',
    latitude: 6.8649,
    longitude: 79.8997,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-rajagiriya',
    shortTitle: 'Rajagiriya — Sri Jayawardenepura Mawatha',
    displayName: 'Sri Jayawardenepura Mawatha, Rajagiriya, Sri Lanka',
    addressLine1: 'No. 412, Sri Jayawardenepura Mawatha',
    city: 'Rajagiriya',
    district: 'Colombo',
    latitude: 6.9094,
    longitude: 79.8963,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-battaramulla',
    shortTitle: 'Battaramulla — Pannipitiya Road',
    displayName: 'Main Street, Battaramulla, Sri Jayawardenepura Kotte, Sri Lanka',
    addressLine1: 'No. 220, Kaduwela Road, Battaramulla',
    city: 'Battaramulla',
    district: 'Colombo',
    latitude: 6.898,
    longitude: 79.9222,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-dehiwala',
    shortTitle: 'Dehiwala — Galle Road',
    displayName: 'Galle Road, Dehiwala, Colombo, Sri Lanka',
    addressLine1: 'No. 175, Galle Road, Dehiwala',
    city: 'Dehiwala',
    district: 'Colombo',
    latitude: 6.8511,
    longitude: 79.8654,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-mount-lavinia',
    shortTitle: 'Mount Lavinia — Galle Road',
    displayName: 'Galle Road, Mount Lavinia, Colombo, Sri Lanka',
    addressLine1: 'No. 240, Galle Road, Mount Lavinia',
    city: 'Mount Lavinia',
    district: 'Colombo',
    latitude: 6.8301,
    longitude: 79.8639,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-maharagama',
    shortTitle: 'Maharagama — High Level Road',
    displayName: 'High Level Road, Maharagama, Colombo, Sri Lanka',
    addressLine1: 'No. 108, High Level Road, Maharagama',
    city: 'Maharagama',
    district: 'Colombo',
    latitude: 6.848,
    longitude: 79.9265,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-moratuwa',
    shortTitle: 'Moratuwa — Galle Road',
    displayName: 'Galle Road, Moratuwa, Colombo, Sri Lanka',
    addressLine1: 'No. 310, Galle Road, Moratuwa',
    city: 'Moratuwa',
    district: 'Colombo',
    latitude: 6.773,
    longitude: 79.8816,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-wattala',
    shortTitle: 'Wattala — Negombo Road',
    displayName: 'Negombo Road, Wattala, Gampaha, Sri Lanka',
    addressLine1: 'No. 295, Negombo Road, Wattala',
    city: 'Wattala',
    district: 'Gampaha',
    latitude: 6.9892,
    longitude: 79.8917,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-gampaha',
    shortTitle: 'Gampaha — Yakkala Road',
    displayName: 'Yakkala Road, Gampaha, Western Province, Sri Lanka',
    addressLine1: 'No. 52, Yakkala Road, Gampaha',
    city: 'Gampaha',
    district: 'Gampaha',
    latitude: 7.0873,
    longitude: 79.999,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-kalutara',
    shortTitle: 'Kalutara — Galle Road',
    displayName: 'Galle Road, Kalutara South, Western Province, Sri Lanka',
    addressLine1: 'No. 84, Galle Road, Kalutara',
    city: 'Kalutara',
    district: 'Kalutara',
    latitude: 6.5854,
    longitude: 79.9607,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-matara',
    shortTitle: 'Matara — Anagarika Dharmapala Mawatha',
    displayName: 'Anagarika Dharmapala Mawatha, Matara, Southern Province, Sri Lanka',
    addressLine1: 'No. 45, Anagarika Dharmapala Mawatha',
    city: 'Matara',
    district: 'Matara',
    latitude: 5.9549,
    longitude: 80.555,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-jaffna',
    shortTitle: 'Jaffna — Hospital Road / Town Centre',
    displayName: 'Hospital Road, Jaffna, Northern Province, Sri Lanka',
    addressLine1: 'No. 120, Hospital Road',
    city: 'Jaffna',
    district: 'Jaffna',
    latitude: 9.6615,
    longitude: 80.0255,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-anuradhapura',
    shortTitle: 'Anuradhapura — Maithripala Senanayake Mawatha',
    displayName: 'Maithripala Senanayake Mawatha, Anuradhapura, Sri Lanka',
    addressLine1: 'No. 78, Maithripala Senanayake Mawatha',
    city: 'Anuradhapura',
    district: 'Anuradhapura',
    latitude: 8.3114,
    longitude: 80.4037,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-ratnapura',
    shortTitle: 'Ratnapura — Main Street',
    displayName: 'Main Street, Ratnapura, Sabaragamuwa Province, Sri Lanka',
    addressLine1: 'No. 63, Main Street, Ratnapura',
    city: 'Ratnapura',
    district: 'Ratnapura',
    latitude: 6.6828,
    longitude: 80.3992,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-badulla',
    shortTitle: 'Badulla —Bandarawela Road',
    displayName: 'Bandarawela Road, Badulla, Uva Province, Sri Lanka',
    addressLine1: 'No. 34, Bandarawela Road, Badulla',
    city: 'Badulla',
    district: 'Badulla',
    latitude: 6.9934,
    longitude: 81.055,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-trincomalee',
    shortTitle: 'Trincomalee — Dockyard Road',
    displayName: 'Dockyard Road, Trincomalee, Eastern Province, Sri Lanka',
    addressLine1: 'No. 19, Dockyard Road, Trincomalee',
    city: 'Trincomalee',
    district: 'Trincomalee',
    latitude: 8.5874,
    longitude: 81.2152,
    source: 'sri-lanka-gazetteer',
  },
  {
    id: 'lk-batticaloa',
    shortTitle: 'Batticaloa — Trinco Road',
    displayName: 'Trinco Road, Batticaloa, Eastern Province, Sri Lanka',
    addressLine1: 'No. 91, Trinco Road, Batticaloa',
    city: 'Batticaloa',
    district: 'Batticaloa',
    latitude: 7.731,
    longitude: 81.6747,
    source: 'sri-lanka-gazetteer',
  },
];

// ---------------------------------------------------------------------------
// Web Mercator (EPSG:3857) Projection Helpers for Interactive Slippy Map
// ---------------------------------------------------------------------------

const TILE_SIZE = 256;
const EARTH_CIRCUMFERENCE_METERS = 40075016.686;

/**
 * Clamp latitude and longitude to valid geographic bounds and round to 6 decimals.
 */
export function clampCoordinates(lat: number, lng: number): { latitude: number; longitude: number } {
  const safeLat = Math.max(-85.0511, Math.min(85.0511, Number.isFinite(lat) ? lat : DEFAULT_SRI_LANKA_CENTER.latitude));
  const safeLng = Math.max(-180, Math.min(180, Number.isFinite(lng) ? lng : DEFAULT_SRI_LANKA_CENTER.longitude));
  return {
    latitude: Number(safeLat.toFixed(6)),
    longitude: Number(safeLng.toFixed(6)),
  };
}

/**
 * Convert (latitude, longitude) at a given zoom level into Web Mercator world pixel coordinates.
 */
export function latLngToWorldPixel(
  lat: number,
  lng: number,
  zoom: number
): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const y =
    (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Convert Web Mercator world pixel coordinates back into (latitude, longitude).
 */
export function worldPixelToLatLng(
  x: number,
  y: number,
  zoom: number
): { latitude: number; longitude: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return clampCoordinates(lat, lng);
}

/**
 * Ground resolution in meters per pixel at a given latitude and zoom level.
 * Used to convert Member 03's `maxRadiusKm` into an exact pixel radius on the map.
 */
export function getMetersPerPixel(latitude: number, zoom: number): number {
  const latRad = (latitude * Math.PI) / 180;
  return (
    (EARTH_CIRCUMFERENCE_METERS * Math.cos(latRad)) /
    (TILE_SIZE * Math.pow(2, zoom))
  );
}

/**
 * Convert a service-area radius in kilometres (`maxRadiusKm`) to pixels at the given latitude and zoom.
 */
export function radiusKmToPixels(
  radiusKm: number,
  latitude: number,
  zoom: number
): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return 0;
  const metersPerPx = getMetersPerPixel(latitude, zoom);
  if (metersPerPx <= 0) return 0;
  return (radiusKm * 1000) / metersPerPx;
}

/**
 * Recommend an appropriate map zoom level so a service-area radius in kilometres fits comfortably.
 */
export function getRecommendedZoomForRadiusKm(radiusKm: number): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return 14;
  if (radiusKm <= 2.5) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 16) return 11;
  if (radiusKm <= 32) return 10;
  return 9;
}

// ---------------------------------------------------------------------------
// Gazetteer & Nominatim Geocoding / Reverse Geocoding
// ---------------------------------------------------------------------------

function getGeocodingBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_GEOCODING_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://nominatim.openstreetmap.org';
}

/**
 * Search built-in Sri Lankan gazetteer for matching places/addresses.
 */
export function searchSriLankanGazetteer(query: string): GeocodingSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return SRI_LANKAN_LOCATION_GAZETTEER.slice(0, 6);
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  return SRI_LANKAN_LOCATION_GAZETTEER.filter((item) => {
    const haystack =
      `${item.shortTitle} ${item.displayName} ${item.addressLine1} ${item.city} ${item.district ?? ''}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

interface NominatimSearchItem {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state_district?: string;
  };
}

function parseNominatimItem(item: NominatimSearchItem, index: number): GeocodingSuggestion | null {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const addr = item.address ?? {};
  const city =
    addr.city ||
    addr.town ||
    addr.municipality ||
    addr.suburb ||
    addr.village ||
    addr.state_district ||
    addr.county ||
    'Colombo';

  const streetParts = [addr.house_number, addr.road, addr.neighbourhood || addr.suburb].filter(
    Boolean
  );
  const rawDisplay = item.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const firstSegments = rawDisplay
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let addressLine1 =
    streetParts.length > 0
      ? streetParts.join(', ')
      : firstSegments.slice(0, 2).join(', ') || item.name || city;

  if (addressLine1.length < 5) {
    addressLine1 = `${addressLine1}, ${city}`;
  }

  const district = inferSriLankanDistrict(
    city,
    addr.state_district || addr.county || undefined
  );

  return {
    id: `nom-${item.place_id ?? index}-${lat.toFixed(4)}`,
    shortTitle: firstSegments.slice(0, 2).join(', ') || addressLine1,
    displayName: rawDisplay,
    addressLine1: addressLine1.slice(0, 500),
    city: city.slice(0, 255),
    district,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    source: 'nominatim',
  };
}

/**
 * Search for Sri Lankan or global locations by place name or street address.
 * Queries Nominatim (`countrycodes=lk` prioritized, then general) and merges with the
 * built-in Sri Lankan gazetteer so results are always fast and resilient.
 */
export async function searchLocations(
  query: string,
  signal?: AbortSignal
): Promise<{ suggestions: GeocodingSuggestion[]; warning: string | null }> {
  const trimmed = query.trim();
  const localMatches = searchSriLankanGazetteer(trimmed);

  if (trimmed.length < 2) {
    return { suggestions: localMatches.slice(0, 6), warning: null };
  }

  try {
    const baseUrl = getGeocodingBaseUrl();
    const url = new URL(`${baseUrl}/search`);
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '6');
    url.searchParams.set('countrycodes', 'lk');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Geocoding service returned HTTP ${response.status}`);
    }

    const rawData = (await response.json()) as unknown;
    const remoteItems = Array.isArray(rawData)
      ? (rawData as NominatimSearchItem[])
          .map((item, idx) => parseNominatimItem(item, idx))
          .filter((item): item is GeocodingSuggestion => item !== null)
      : [];

    // Combine remote Nominatim results with local Sri Lankan gazetteer matches (deduplicating by proximity)
    const combined: GeocodingSuggestion[] = [...remoteItems];
    for (const local of localMatches) {
      const duplicate = combined.some(
        (r) =>
          Math.abs(r.latitude - local.latitude) < 0.005 &&
          Math.abs(r.longitude - local.longitude) < 0.005
      );
      if (!duplicate) {
        combined.push(local);
      }
    }

    return {
      suggestions: combined.slice(0, 8),
      warning: null,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    return {
      suggestions: localMatches.slice(0, 8),
      warning:
        localMatches.length > 0
          ? null
          : 'Live geocoding service is currently unreachable. Try searching a Sri Lankan city or click directly on the map.',
    };
  }
}

/**
 * Find the nearest Sri Lankan gazetteer entry for offline reverse-geocoding fallback.
 */
export function findNearestSriLankanLocality(
  latitude: number,
  longitude: number
): GeocodingSuggestion {
  let best = SRI_LANKAN_LOCATION_GAZETTEER[0];
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (const item of SRI_LANKAN_LOCATION_GAZETTEER) {
    const dLat = latitude - item.latitude;
    const dLng = longitude - item.longitude;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = item;
    }
  }

  return best;
}

/**
 * Reverse geocode (latitude, longitude) into a street address and city when the marker is clicked or dragged.
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  const clamped = clampCoordinates(latitude, longitude);

  try {
    const baseUrl = getGeocodingBaseUrl();
    const url = new URL(`${baseUrl}/reverse`);
    url.searchParams.set('lat', String(clamped.latitude));
    url.searchParams.set('lon', String(clamped.longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (response.ok) {
      const data = (await response.json()) as NominatimSearchItem;
      const parsed = parseNominatimItem(
        {
          ...data,
          lat: String(clamped.latitude),
          lon: String(clamped.longitude),
        },
        0
      );
      if (parsed) {
        return {
          displayName: parsed.displayName,
          addressLine1: parsed.addressLine1,
          city: parsed.city,
          district: parsed.district || inferSriLankanDistrict(parsed.city),
          latitude: clamped.latitude,
          longitude: clamped.longitude,
          source: 'nominatim',
        };
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
  }

  // Fallback to nearest Sri Lankan locality if within ~15 km (0.15 deg), otherwise coordinates
  const nearest = findNearestSriLankanLocality(clamped.latitude, clamped.longitude);
  const approxDegDist = Math.hypot(
    clamped.latitude - nearest.latitude,
    clamped.longitude - nearest.longitude
  );

  if (approxDegDist <= 0.15) {
    return {
      displayName: `Near ${nearest.shortTitle} (${clamped.latitude.toFixed(4)}, ${clamped.longitude.toFixed(4)})`,
      addressLine1: `${nearest.addressLine1} (${clamped.latitude.toFixed(4)}°N, ${clamped.longitude.toFixed(4)}°E)`,
      city: nearest.city,
      district: nearest.district || inferSriLankanDistrict(nearest.city),
      latitude: clamped.latitude,
      longitude: clamped.longitude,
      source: 'sri-lanka-gazetteer',
    };
  }

  return {
    displayName: `Selected Location (${clamped.latitude.toFixed(5)}, ${clamped.longitude.toFixed(5)})`,
    addressLine1: `Location at ${clamped.latitude.toFixed(4)}° N, ${clamped.longitude.toFixed(4)}° E`,
    city: nearest.city,
    district: nearest.district || inferSriLankanDistrict(nearest.city),
    latitude: clamped.latitude,
    longitude: clamped.longitude,
    source: 'coordinates-only',
  };
}

