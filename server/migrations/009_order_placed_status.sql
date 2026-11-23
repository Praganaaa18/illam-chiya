ALTER TABLE orders
    MODIFY COLUMN order_status
    ENUM('order_placed', 'pending', 'processing', 'shipped', 'delivered', 'cash_received', 'cancelled')
    DEFAULT 'order_placed';
