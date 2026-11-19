SET @carrier_name_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'carrier_name'
);
SET @carrier_name_sql = IF(
    @carrier_name_exists = 0,
    'ALTER TABLE orders ADD COLUMN carrier_name VARCHAR(120) NULL',
    'SELECT 1'
);
PREPARE carrier_name_statement FROM @carrier_name_sql;
EXECUTE carrier_name_statement;
DEALLOCATE PREPARE carrier_name_statement;

SET @tracking_number_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'tracking_number'
);
SET @tracking_number_sql = IF(
    @tracking_number_exists = 0,
    'ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100) NULL',
    'SELECT 1'
);
PREPARE tracking_number_statement FROM @tracking_number_sql;
EXECUTE tracking_number_statement;
DEALLOCATE PREPARE tracking_number_statement;
