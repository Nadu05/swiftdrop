/**
 * Town-centre coordinates for the pickup / delivery towns.
 *
 * The branch resolution endpoint (POST /api/v1/organization/branches/resolve) works from latitude /
 * longitude, but the booking form only asks for the nearest town. The pickup town's centre is therefore
 * used as the pickup point.
 *
 * The codes and values mirror services/order-service/src/main/resources/locations/cities.csv, which is
 * the source of the town list (GET /api/v1/orders/cities does not return coordinates). Keep both in step.
 * Values are approximate (about 1 km), so a pickup right on the edge of a service area may resolve to a
 * different branch than its exact street address would.
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

const CITY_COORDINATES: Record<string, Coordinates> = {
  COLOMBO: { latitude: 6.9271, longitude: 79.8612 },
  DEHIWALA: { latitude: 6.8518, longitude: 79.865 },
  KOTTE: { latitude: 6.894, longitude: 79.902 },
  MORATUWA: { latitude: 6.773, longitude: 79.8816 },
  NEGOMBO: { latitude: 7.2083, longitude: 79.8358 },
  GAMPAHA: { latitude: 7.0873, longitude: 79.9925 },
  KALUTARA: { latitude: 6.5854, longitude: 79.9607 },
  PANADURA: { latitude: 6.7133, longitude: 79.9026 },
  KANDY: { latitude: 7.2906, longitude: 80.6337 },
  MATALE: { latitude: 7.4675, longitude: 80.6234 },
  DAMBULLA: { latitude: 7.8731, longitude: 80.6511 },
  NUWARA_ELIYA: { latitude: 6.9497, longitude: 80.7891 },
  GALLE: { latitude: 6.0535, longitude: 80.221 },
  MATARA: { latitude: 5.9549, longitude: 80.555 },
  HAMBANTOTA: { latitude: 6.1241, longitude: 81.1185 },
  RATNAPURA: { latitude: 6.7056, longitude: 80.3847 },
  KEGALLE: { latitude: 7.2513, longitude: 80.3464 },
  BADULLA: { latitude: 6.9934, longitude: 81.055 },
  MONARAGALA: { latitude: 6.8728, longitude: 81.3507 },
  BATTICALOA: { latitude: 7.7102, longitude: 81.6924 },
  AMPARA: { latitude: 7.2912, longitude: 81.6724 },
  TRINCOMALEE: { latitude: 8.5874, longitude: 81.2152 },
  JAFFNA: { latitude: 9.6615, longitude: 80.0255 },
  KILINOCHCHI: { latitude: 9.3803, longitude: 80.377 },
  MANNAR: { latitude: 8.981, longitude: 79.9044 },
  MULLAITIVU: { latitude: 9.2671, longitude: 80.8142 },
  VAVUNIYA: { latitude: 8.7542, longitude: 80.4982 },
  KURUNEGALA: { latitude: 7.4863, longitude: 80.3647 },
  PUTTALAM: { latitude: 8.0408, longitude: 79.8394 },
  CHILAW: { latitude: 7.5758, longitude: 79.7953 },
  ANURADHAPURA: { latitude: 8.3114, longitude: 80.4037 },
  POLONNARUWA: { latitude: 7.9403, longitude: 81.0188 },
};

/** Coordinates of a town by its code (e.g. COLOMBO), or null for an unknown code. */
export function getCityCoordinates(code: string): Coordinates | null {
  return CITY_COORDINATES[code] ?? null;
}
