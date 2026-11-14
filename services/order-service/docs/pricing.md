# Delivery pricing

How the Order service calculates a delivery fee. The same calculation is used by the quote
(`POST /api/v1/orders/quote`) and when an order is created (`POST /api/v1/orders`), so the fee a customer sees
before confirming is the fee charged.

## Formula

```
fee = baseFee
    + max(0, weightKg - includedWeightKg) x extraWeightFeePerKg      (weight fee)
    + distanceKm x distanceFeePerKm                                  (distance fee)
    + (pickup and delivery towns in different districts ? zoneSurcharge : 0)   (zone surcharge)
```

- Every component is rounded **half-up to 2 decimals**, and the total is the **sum of the rounded components**, so a
  receipt always adds up. The database also enforces `delivery_fee = base_fee + weight_fee + distance_fee + zone_surcharge`.
- Weight below the included weight never reduces the fee (the weight fee is 0, never negative).
- Amounts are in the configured currency (LKR).

## Current tariff (placeholder rates)

Configured under `swiftdrop.pricing.*` in `application.yml`. **These rates are placeholders until the team agrees the
real tariff**; the formula itself is what is implemented and tested.

| Setting | Value | Meaning |
|---|---|---|
| `base-fee` | 500.00 | charged on every delivery |
| `included-weight-kg` | 1.00 | weight covered by the base fee |
| `extra-weight-fee-per-kg` | 100.00 | per kg above the included weight |
| `distance-fee-per-km` | 10.00 | per km between the two towns |
| `zone-surcharge` | 200.00 | when the towns are in different districts |
| `road-distance-factor` | 1.0 | multiplier on the straight-line distance (1.0 = straight line) |

### Parcel size and weight limits

A parcel's weight must suit its size (otherwise `422`, for both the quote and the order). Parcel size does not
change the price; it only limits the weight.

| Size | Max weight |
|---|---|
| SMALL | 2 kg |
| MEDIUM | 10 kg |
| LARGE | 30 kg |
| EXTRA_LARGE | 100 kg |

Weight must also be between 0.01 and 100 kg with at most 2 decimal places.

## Distance and zones

Customers choose the **pickup town** and **delivery town** from a fixed list (`GET /api/v1/orders/cities`); street
addresses are free text and are not used for pricing.

- **Distance** = straight-line (Haversine) distance between the two town centres, times `road-distance-factor`,
  rounded to 2 decimals. The server always computes it; a client can never send a distance.
- **Zone** = the town's district. Two towns in different districts are "cross-zone" and pay the zone surcharge.
- The same town on both ends gives distance 0 (no distance fee, no surcharge).
- The town list is `src/main/resources/locations/cities.csv` (code, name, district, latitude, longitude).
  It is validated at startup; a malformed file stops the service.

Limitations (by design for now): the distance is between town **centres**, not exact addresses, and it is a
**straight line**, shorter than the road distance. The starter coordinates were drafted by hand and **must be
verified** against an authoritative source (GeoNames / OpenStreetMap) before production use.

## Worked examples (placeholder rates)

| Delivery | Weight | Distance | Calculation | Fee |
|---|---|---|---|---|
| Colombo to Colombo | 1.5 kg | 0 km | 500 + 0.5x100 | **550.00** |
| Colombo to Dehiwala (same district) | 1.5 kg | 8.38 km | 500 + 50 + 8.38x10 (83.80) | **633.80** |
| Colombo to Kandy | 1.5 kg | 94.34 km | 500 + 50 + 943.40 + 200 | **1693.40** |
| Colombo to Kandy | 2 kg | 94.34 km | 500 + 100 + 943.40 + 200 | **1743.40** |
| Colombo to Jaffna | 100 kg | 304.59 km | 500 + 9900 + 3045.90 + 200 | **13645.90** |

## API

`POST /api/v1/orders/quote` (no data is stored, no event is emitted):

```json
{ "pickupCity": "COLOMBO", "dropoffCity": "KANDY", "parcelSize": "MEDIUM", "weightKg": 1.5 }
```
```json
{
  "estimatedFee": 1693.40,
  "currency": "LKR",
  "estimatedDistanceKm": 94.34,
  "breakdown": { "baseFee": 500.00, "weightFee": 50.00, "distanceFee": 943.40, "zoneSurcharge": 200.00,
                 "totalFee": 1693.40, "currency": "LKR" }
}
```

`POST /api/v1/orders` takes the same `pickupCity`, `dropoffCity`, `parcelSize` and `weightKg` plus the contact and
address fields. It may also include **`expectedFee`** (the `estimatedFee` the customer confirmed): if the fee
calculated now is different (for example the tariff changed in between) the order is **not** created and the API
answers `409` so the client can show the new fee. The created order returns `deliveryFee`, `feeBreakdown`,
`distanceKm`, `pickupCity` and `dropoffCity`, and stores them, so receipts show what was actually charged even if the
tariff changes later.

| Problem | Response |
|---|---|
| Missing or unsupported town, invalid weight | `400` with `fieldErrors` |
| Weight too heavy for the parcel size | `422` |
| `expectedFee` no longer matches | `409` |

## Changing the tariff or the towns

- **Rates / limits / road factor:** edit `swiftdrop.pricing.*` in `application.yml` (invalid values stop the service
  at startup). Existing orders keep the fee they were charged.
- **Towns:** edit `locations/cities.csv`. Do not rename or remove a code that existing orders use.
- **A different pricing model** (for example express delivery) is a new implementation of the `FeeCalculator`
  interface; `PricingService` is the only caller.
