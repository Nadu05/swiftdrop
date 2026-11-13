-- Pricing inputs and result are stored with the order so receipts and tracking show what was actually
-- charged, even if tariff rates or the town list change later.
--   pickup_city / dropoff_city : supported town codes (see locations/cities.csv). Nullable only because orders
--                                created before this migration have none; new orders always set them.
--   base_fee .. zone_surcharge : the parts of delivery_fee (see docs/pricing.md)

ALTER TABLE delivery_orders
    ADD COLUMN pickup_city    VARCHAR(40),
    ADD COLUMN dropoff_city   VARCHAR(40),
    ADD COLUMN base_fee       NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN weight_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN distance_fee   NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN zone_surcharge NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Orders created before the breakdown existed: the whole fee is reported as the base fee so the parts add up.
UPDATE delivery_orders SET base_fee = delivery_fee;

ALTER TABLE delivery_orders
    ADD CONSTRAINT chk_orders_fee_parts_non_negative
        CHECK (base_fee >= 0 AND weight_fee >= 0 AND distance_fee >= 0 AND zone_surcharge >= 0),
    ADD CONSTRAINT chk_orders_fee_breakdown
        CHECK (delivery_fee = base_fee + weight_fee + distance_fee + zone_surcharge);
