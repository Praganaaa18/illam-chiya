UPDATE order_tracking_events
SET status = 'order_placed',
    description = 'Order Placed'
WHERE status = 'pending';

UPDATE orders
SET order_status = 'order_placed'
WHERE order_status = 'pending';
