-- The province and district of the pickup and delivery towns are stored with the order, next to the town code
-- (pickup_city / dropoff_city), so they stay correct even if the town list changes later.
-- They are derived from the chosen town by the Order Service. Nullable only for orders whose town was never
-- recorded; orders created before this migration are filled in below from their town code.

ALTER TABLE delivery_orders
    ADD COLUMN pickup_province  VARCHAR(40),
    ADD COLUMN pickup_district  VARCHAR(40),
    ADD COLUMN dropoff_province VARCHAR(40),
    ADD COLUMN dropoff_district VARCHAR(40);

-- Backfill existing orders from the town code (same data as locations/cities.csv and the Provinces class)
UPDATE delivery_orders o
   SET pickup_district = t.district,
       pickup_province = t.province
  FROM (VALUES
    ('COLOMBO', 'Colombo', 'Western'),
    ('DEHIWALA', 'Colombo', 'Western'),
    ('KOTTE', 'Colombo', 'Western'),
    ('MORATUWA', 'Colombo', 'Western'),
    ('NEGOMBO', 'Gampaha', 'Western'),
    ('GAMPAHA', 'Gampaha', 'Western'),
    ('KALUTARA', 'Kalutara', 'Western'),
    ('PANADURA', 'Kalutara', 'Western'),
    ('KANDY', 'Kandy', 'Central'),
    ('MATALE', 'Matale', 'Central'),
    ('DAMBULLA', 'Matale', 'Central'),
    ('NUWARA_ELIYA', 'Nuwara Eliya', 'Central'),
    ('GALLE', 'Galle', 'Southern'),
    ('MATARA', 'Matara', 'Southern'),
    ('HAMBANTOTA', 'Hambantota', 'Southern'),
    ('RATNAPURA', 'Ratnapura', 'Sabaragamuwa'),
    ('KEGALLE', 'Kegalle', 'Sabaragamuwa'),
    ('BADULLA', 'Badulla', 'Uva'),
    ('MONARAGALA', 'Monaragala', 'Uva'),
    ('BATTICALOA', 'Batticaloa', 'Eastern'),
    ('AMPARA', 'Ampara', 'Eastern'),
    ('TRINCOMALEE', 'Trincomalee', 'Eastern'),
    ('JAFFNA', 'Jaffna', 'Northern'),
    ('KILINOCHCHI', 'Kilinochchi', 'Northern'),
    ('MANNAR', 'Mannar', 'Northern'),
    ('MULLAITIVU', 'Mullaitivu', 'Northern'),
    ('VAVUNIYA', 'Vavuniya', 'Northern'),
    ('KURUNEGALA', 'Kurunegala', 'North Western'),
    ('PUTTALAM', 'Puttalam', 'North Western'),
    ('CHILAW', 'Puttalam', 'North Western'),
    ('ANURADHAPURA', 'Anuradhapura', 'North Central'),
    ('POLONNARUWA', 'Polonnaruwa', 'North Central')
  ) AS t(code, district, province)
 WHERE o.pickup_city = t.code;

UPDATE delivery_orders o
   SET dropoff_district = t.district,
       dropoff_province = t.province
  FROM (VALUES
    ('COLOMBO', 'Colombo', 'Western'),
    ('DEHIWALA', 'Colombo', 'Western'),
    ('KOTTE', 'Colombo', 'Western'),
    ('MORATUWA', 'Colombo', 'Western'),
    ('NEGOMBO', 'Gampaha', 'Western'),
    ('GAMPAHA', 'Gampaha', 'Western'),
    ('KALUTARA', 'Kalutara', 'Western'),
    ('PANADURA', 'Kalutara', 'Western'),
    ('KANDY', 'Kandy', 'Central'),
    ('MATALE', 'Matale', 'Central'),
    ('DAMBULLA', 'Matale', 'Central'),
    ('NUWARA_ELIYA', 'Nuwara Eliya', 'Central'),
    ('GALLE', 'Galle', 'Southern'),
    ('MATARA', 'Matara', 'Southern'),
    ('HAMBANTOTA', 'Hambantota', 'Southern'),
    ('RATNAPURA', 'Ratnapura', 'Sabaragamuwa'),
    ('KEGALLE', 'Kegalle', 'Sabaragamuwa'),
    ('BADULLA', 'Badulla', 'Uva'),
    ('MONARAGALA', 'Monaragala', 'Uva'),
    ('BATTICALOA', 'Batticaloa', 'Eastern'),
    ('AMPARA', 'Ampara', 'Eastern'),
    ('TRINCOMALEE', 'Trincomalee', 'Eastern'),
    ('JAFFNA', 'Jaffna', 'Northern'),
    ('KILINOCHCHI', 'Kilinochchi', 'Northern'),
    ('MANNAR', 'Mannar', 'Northern'),
    ('MULLAITIVU', 'Mullaitivu', 'Northern'),
    ('VAVUNIYA', 'Vavuniya', 'Northern'),
    ('KURUNEGALA', 'Kurunegala', 'North Western'),
    ('PUTTALAM', 'Puttalam', 'North Western'),
    ('CHILAW', 'Puttalam', 'North Western'),
    ('ANURADHAPURA', 'Anuradhapura', 'North Central'),
    ('POLONNARUWA', 'Polonnaruwa', 'North Central')
  ) AS t(code, district, province)
 WHERE o.dropoff_city = t.code;

CREATE INDEX idx_orders_pickup_district  ON delivery_orders (pickup_district);
CREATE INDEX idx_orders_dropoff_district ON delivery_orders (dropoff_district);
