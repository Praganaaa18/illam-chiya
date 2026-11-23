ALTER TABLE orders
    MODIFY COLUMN order_status
    ENUM('pending', 'processing', 'shipped', 'delivered', 'cash_received', 'cancelled')
    DEFAULT 'pending';
