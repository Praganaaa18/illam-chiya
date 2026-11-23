CREATE TABLE IF NOT EXISTS seller_drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    driver_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_seller_drivers_seller_name (seller_id, driver_name),
    CONSTRAINT fk_seller_drivers_seller
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);
