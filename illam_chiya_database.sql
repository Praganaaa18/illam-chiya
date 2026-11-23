DROP DATABASE IF EXISTS illam_chiya_db;
CREATE DATABASE illam_chiya_db;
USE illam_chiya_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('buyer', 'seller', 'superadmin') DEFAULT 'buyer',
    delivery_address TEXT,
    address_type ENUM('Home', 'Office'),
    gender ENUM('Male', 'Female', 'Other'),
    business_name VARCHAR(150),
    identity_type ENUM('Citizenship', 'Passport'),
    id_number VARCHAR(50),
    id_document_url VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected', 'active') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seller_drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    driver_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_seller_drivers_seller_name (seller_id, driver_name),
    CONSTRAINT fk_seller_drivers_seller
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    pack_size VARCHAR(20) NOT NULL DEFAULT '100 g',
    stock_quantity INT NOT NULL DEFAULT 0,
    elevation VARCHAR(50) DEFAULT '5,000 ft',
    process_type VARCHAR(50) DEFAULT 'Orthodox',
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    order_status ENUM('pending', 'processing', 'shipped', 'delivered', 'cash_received', 'cancelled') DEFAULT 'pending',
    carrier_name VARCHAR(120) NULL,
    tracking_number VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id)
);

CREATE TABLE order_tracking_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_tracking_events_order_created (order_id, created_at),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    seller_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    pack_size VARCHAR(20) NOT NULL DEFAULT '100 g',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    recipient_role ENUM('buyer', 'seller') NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(255) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_recipient (recipient_id, recipient_role, created_at),
    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    buyer_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id)
);

ALTER TABLE users 
ADD COLUMN address VARCHAR(255) NULL,
ADD COLUMN pan_vat VARCHAR(100) NULL,
ADD COLUMN document_path VARCHAR(255) NULL;

INSERT INTO categories (name, description) VALUES ('Orthodox Tea', 'Authentic high-altitude Orthodox tea leaves');