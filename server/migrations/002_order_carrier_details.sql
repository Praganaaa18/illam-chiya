ALTER TABLE orders
    ADD COLUMN carrier_name VARCHAR(120) NULL,
    ADD COLUMN tracking_number VARCHAR(100) NULL;
