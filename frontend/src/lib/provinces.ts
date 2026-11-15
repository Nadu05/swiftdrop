/**
 * Sri Lanka's nine provinces and the districts in each. Mirrors the Order Service's Provinces class, which is
 * the source of truth (GET /api/v1/orders/cities returns each town's province); this copy only keeps the
 * Province -> District dropdowns working when the backend cannot be reached.
 */
export const PROVINCE_BY_DISTRICT: Record<string, string> = {
  Colombo: 'Western', Gampaha: 'Western', Kalutara: 'Western',
  Kandy: 'Central', Matale: 'Central', 'Nuwara Eliya': 'Central',
  Galle: 'Southern', Matara: 'Southern', Hambantota: 'Southern',
  Jaffna: 'Northern', Kilinochchi: 'Northern', Mannar: 'Northern', Mullaitivu: 'Northern', Vavuniya: 'Northern',
  Ampara: 'Eastern', Batticaloa: 'Eastern', Trincomalee: 'Eastern',
  Kurunegala: 'North Western', Puttalam: 'North Western',
  Anuradhapura: 'North Central', Polonnaruwa: 'North Central',
  Badulla: 'Uva', Monaragala: 'Uva',
  Kegalle: 'Sabaragamuwa', Ratnapura: 'Sabaragamuwa',
};

export function provinceOfDistrict(district?: string): string | undefined {
  return district ? PROVINCE_BY_DISTRICT[district.trim()] : undefined;
}
