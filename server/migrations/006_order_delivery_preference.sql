SET @delivery_preference_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'delivery_preference'
);
SET @delivery_preference_sql = IF(
    @delivery_preference_exists = 0,
    CONCAT(
        'ALTER TABLE orders ADD COLUMN delivery_preference VARCHAR(20) NOT NULL DEFAULT ',
        QUOTE('doorstep')
    ),
    'SELECT 1'
);
PREPARE delivery_preference_statement FROM @delivery_preference_sql;
EXECUTE delivery_preference_statement;
DEALLOCATE PREPARE delivery_preference_statement;
