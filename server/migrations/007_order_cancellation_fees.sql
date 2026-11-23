SET @cancellation_fee_amount_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'cancellation_fee_amount'
);
SET @cancellation_fee_amount_sql = IF(
    @cancellation_fee_amount_exists = 0,
    'ALTER TABLE orders ADD COLUMN cancellation_fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE cancellation_fee_amount_statement FROM @cancellation_fee_amount_sql;
EXECUTE cancellation_fee_amount_statement;
DEALLOCATE PREPARE cancellation_fee_amount_statement;

SET @cancellation_fee_status_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'cancellation_fee_status'
);
SET @cancellation_fee_status_sql = IF(
    @cancellation_fee_status_exists = 0,
    CONCAT(
        'ALTER TABLE orders ADD COLUMN cancellation_fee_status VARCHAR(20) NOT NULL DEFAULT ',
        QUOTE('none')
    ),
    'SELECT 1'
);
PREPARE cancellation_fee_status_statement FROM @cancellation_fee_status_sql;
EXECUTE cancellation_fee_status_statement;
DEALLOCATE PREPARE cancellation_fee_status_statement;

SET @cancellation_fee_proof_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'cancellation_fee_proof'
);
SET @cancellation_fee_proof_sql = IF(
    @cancellation_fee_proof_exists = 0,
    'ALTER TABLE orders ADD COLUMN cancellation_fee_proof VARCHAR(255) NULL',
    'SELECT 1'
);
PREPARE cancellation_fee_proof_statement FROM @cancellation_fee_proof_sql;
EXECUTE cancellation_fee_proof_statement;
DEALLOCATE PREPARE cancellation_fee_proof_statement;
