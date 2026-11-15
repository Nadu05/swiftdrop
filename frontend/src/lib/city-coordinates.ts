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
  MAHARAGAMA: { latitude: 6.848, longitude: 79.9265 },
  HOMAGAMA: { latitude: 6.8441, longitude: 80.0021 },
  PILIYANDALA: { latitude: 6.8018, longitude: 79.9226 },
  WATTALA: { latitude: 6.989, longitude: 79.8913 },
  JA_ELA: { latitude: 7.0744, longitude: 79.892 },
  KELANIYA: { latitude: 6.9553, longitude: 79.9217 },
  MINUWANGODA: { latitude: 7.17, longitude: 79.95 },
  HORANA: { latitude: 6.7159, longitude: 80.0626 },
  BERUWALA: { latitude: 6.4788, longitude: 79.9828 },
  ALUTHGAMA: { latitude: 6.4306, longitude: 79.9986 },
  PERADENIYA: { latitude: 7.259, longitude: 80.597 },
  GAMPOLA: { latitude: 7.164, longitude: 80.574 },
  KATUGASTOTA: { latitude: 7.3256, longitude: 80.6205 },
  HATTON: { latitude: 6.8916, longitude: 80.5958 },
  TALAWAKELE: { latitude: 6.937, longitude: 80.661 },
  HIKKADUWA: { latitude: 6.1395, longitude: 80.1063 },
  AMBALANGODA: { latitude: 6.2355, longitude: 80.054 },
  ELPITIYA: { latitude: 6.294, longitude: 80.165 },
  WELIGAMA: { latitude: 5.9733, longitude: 80.4296 },
  AKURESSA: { latitude: 6.099, longitude: 80.48 },
  DIKWELLA: { latitude: 5.965, longitude: 80.69 },
  TANGALLE: { latitude: 6.024, longitude: 80.797 },
  TISSAMAHARAMA: { latitude: 6.2837, longitude: 81.2877 },
  AMBALANTOTA: { latitude: 6.118, longitude: 81.029 },
  BALANGODA: { latitude: 6.65, longitude: 80.699 },
  EMBILIPITIYA: { latitude: 6.3434, longitude: 80.849 },
  EHELIYAGODA: { latitude: 6.847, longitude: 80.27 },
  MAWANELLA: { latitude: 7.253, longitude: 80.444 },
  WARAKAPOLA: { latitude: 7.225, longitude: 80.197 },
  RAMBUKKANA: { latitude: 7.325, longitude: 80.391 },
  BANDARAWELA: { latitude: 6.831, longitude: 80.999 },
  HAPUTALE: { latitude: 6.7667, longitude: 80.95 },
  WELLAWAYA: { latitude: 6.73, longitude: 81.1 },
  BIBILE: { latitude: 7.166, longitude: 81.216 },
  KATTANKUDY: { latitude: 7.683, longitude: 81.73 },
  ERAVUR: { latitude: 7.774, longitude: 81.606 },
  KALMUNAI: { latitude: 7.4091, longitude: 81.834 },
  AKKARAIPATTU: { latitude: 7.222, longitude: 81.853 },
  SAMMANTHURAI: { latitude: 7.359, longitude: 81.83 },
  KINNIYA: { latitude: 8.5, longitude: 81.187 },
  KANTALE: { latitude: 8.358, longitude: 80.997 },
  CHAVAKACHCHERI: { latitude: 9.66, longitude: 80.165 },
  POINT_PEDRO: { latitude: 9.819, longitude: 80.229 },
  PARANTHAN: { latitude: 9.418, longitude: 80.416 },
  PUTHUKKUDIYIRUPPU: { latitude: 9.301, longitude: 80.649 },
  KULIYAPITIYA: { latitude: 7.47, longitude: 80.04 },
  POLGAHAWELA: { latitude: 7.3333, longitude: 80.298 },
  WARIYAPOLA: { latitude: 7.633, longitude: 80.233 },
  WENNAPPUWA: { latitude: 7.35, longitude: 79.85 },
  MARAWILA: { latitude: 7.417, longitude: 79.833 },
  KEKIRAWA: { latitude: 8.035, longitude: 80.597 },
  MEDAWACHCHIYA: { latitude: 8.533, longitude: 80.495 },
  HINGURAKGODA: { latitude: 8.046, longitude: 80.95 },
  MEDIRIGIRIYA: { latitude: 8.15, longitude: 80.985 },
};

/** Coordinates of a town by its code (e.g. COLOMBO), or null for an unknown code. */
export function getCityCoordinates(code: string): Coordinates | null {
  return CITY_COORDINATES[code] ?? null;
}
