CREATE TABLE IF NOT EXISTS order_tracking_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_tracking_events_order_created (order_id, created_at),
    CONSTRAINT fk_order_tracking_events_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
