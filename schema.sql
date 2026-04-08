-- ============================================================
-- Protein Store Database Management System
-- Complete MySQL Schema + Sample Data + Advanced DBMS Features
-- ============================================================
-- HOW TO RUN (command line only):
--   mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS protein_store;
USE protein_store;

-- ---------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Users (
    user_id    INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    role       ENUM('user','admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 2. PRODUCTS
--    low_stock: automatically managed by trg_low_stock_flag
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Products (
    product_id  INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    description TEXT,
    price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    in_stock    TINYINT(1) NOT NULL DEFAULT 1,
    low_stock   TINYINT(1) NOT NULL DEFAULT 0,
    image_url   VARCHAR(500) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 3. CART
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Cart (
    cart_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 4. CART_ITEMS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Cart_Items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id      INT NOT NULL,
    product_id   INT NOT NULL,
    quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    FOREIGN KEY (cart_id)    REFERENCES Cart(cart_id)        ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
    UNIQUE KEY uq_cart_product (cart_id, product_id)
);

-- ---------------------------------------------------------------
-- 5. ORDERS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Orders (
    order_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status       ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'confirmed',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 6. ORDER_ITEMS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Order_Items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT NOT NULL,
    product_id    INT NOT NULL,
    quantity      INT NOT NULL,
    price         DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES Orders(order_id)     ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 7. PAYMENTS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Payments (
    payment_id     INT AUTO_INCREMENT PRIMARY KEY,
    order_id       INT NOT NULL UNIQUE,
    amount         DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'card',
    status         ENUM('pending','success','failed') DEFAULT 'success',
    paid_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_products_category ON Products(category);
CREATE INDEX idx_orders_user_id    ON Orders(user_id);
CREATE INDEX idx_order_items_order ON Order_Items(order_id);
CREATE INDEX idx_cart_items_cart   ON Cart_Items(cart_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- TRIGGER 1: Prevent negative stock (BEFORE UPDATE)
-- Hard guard at DB level — rejects any UPDATE that would make
-- stock go below 0, even if the application has a bug.
CREATE TRIGGER trg_prevent_negative_stock
BEFORE UPDATE ON Products
FOR EACH ROW
BEGIN
  IF NEW.stock < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Stock cannot be negative. Update rejected.';
  END IF;
END;

-- TRIGGER 2: Auto-manage in_stock flag (AFTER UPDATE)
-- When stock hits 0 → in_stock = 0 (out of stock).
-- When stock is restored above 0 → in_stock = 1 again.
-- Admin never needs to manually toggle this flag.
CREATE TRIGGER trg_auto_out_of_stock
AFTER UPDATE ON Products
FOR EACH ROW
BEGIN
  IF NEW.stock = 0 THEN
    UPDATE Products SET in_stock = 0 WHERE product_id = NEW.product_id;
  ELSEIF NEW.stock > 0 AND OLD.stock = 0 THEN
    UPDATE Products SET in_stock = 1 WHERE product_id = NEW.product_id;
  END IF;
END;

-- TRIGGER 3: Set low_stock flag when stock <= 3 (AFTER UPDATE)
-- Sets low_stock = 1 when stock drops to 3 or below.
-- React frontend reads this column and shows the
-- "Only X left — Order soon!" warning badge on product cards.
CREATE TRIGGER trg_low_stock_flag
AFTER UPDATE ON Products
FOR EACH ROW
BEGIN
  IF NEW.stock <= 3 AND NEW.stock > 0 THEN
    UPDATE Products SET low_stock = 1 WHERE product_id = NEW.product_id;
  ELSE
    UPDATE Products SET low_stock = 0 WHERE product_id = NEW.product_id;
  END IF;
END;

-- ============================================================
-- VIEWS
-- ============================================================

-- VIEW 1: vw_product_stock_status
-- Adds a human-readable stock_status label to every product.
-- Used by the admin Stock Status tab.
CREATE OR REPLACE VIEW vw_product_stock_status AS
SELECT
  product_id,
  name,
  category,
  price,
  stock,
  in_stock,
  low_stock,
  image_url,
  CASE
    WHEN stock = 0  THEN 'Out of Stock'
    WHEN stock <= 3 THEN 'Low Stock'
    ELSE                 'In Stock'
  END AS stock_status
FROM Products;

-- VIEW 2: vw_order_summary
-- Flat view joining Orders + Users + Payments.
-- Admin dashboard queries this instead of repeating the JOIN.
CREATE OR REPLACE VIEW vw_order_summary AS
SELECT
  o.order_id,
  o.created_at,
  o.status         AS order_status,
  o.total_amount,
  u.name           AS customer_name,
  u.email          AS customer_email,
  p.payment_method,
  p.status         AS payment_status,
  p.paid_at
FROM Orders o
JOIN      Users    u ON o.user_id  = u.user_id
LEFT JOIN Payments p ON o.order_id = p.order_id;

-- ============================================================
-- STORED PROCEDURE WITH CURSOR: sp_category_revenue_report
--
-- Uses a CURSOR to walk through each product category one by
-- one, aggregate revenue and units sold, then return a full
-- report table sorted by revenue descending.
--
-- Demo command: CALL sp_category_revenue_report();
-- ============================================================

DROP PROCEDURE IF EXISTS sp_category_revenue_report;

DELIMITER $$

CREATE PROCEDURE sp_category_revenue_report()
BEGIN
  DECLARE v_category  VARCHAR(100);
  DECLARE v_revenue   DECIMAL(10,2);
  DECLARE v_units     INT;
  DECLARE v_done      INT DEFAULT FALSE;

  -- Cursor: one row per category with total revenue + units
  DECLARE category_cursor CURSOR FOR
    SELECT
      pr.category,
      COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue,
      COALESCE(SUM(oi.quantity), 0)            AS units_sold
    FROM Products pr
    LEFT JOIN Order_Items oi ON pr.product_id = oi.product_id
    LEFT JOIN Orders o       ON oi.order_id   = o.order_id
                             AND o.status != 'cancelled'
    GROUP BY pr.category;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

  -- Temp table to hold results while cursor iterates
  DROP TEMPORARY TABLE IF EXISTS tmp_revenue_report;
  CREATE TEMPORARY TABLE tmp_revenue_report (
    category           VARCHAR(100),
    total_revenue      DECIMAL(10,2),
    units_sold         INT,
    avg_price_per_unit DECIMAL(10,2)
  );

  OPEN category_cursor;

  read_loop: LOOP
    FETCH category_cursor INTO v_category, v_revenue, v_units;
    IF v_done THEN LEAVE read_loop; END IF;

    INSERT INTO tmp_revenue_report
      (category, total_revenue, units_sold, avg_price_per_unit)
    VALUES (
      v_category,
      v_revenue,
      v_units,
      IF(v_units > 0, ROUND(v_revenue / v_units, 2), 0.00)
    );
  END LOOP;

  CLOSE category_cursor;

  SELECT * FROM tmp_revenue_report ORDER BY total_revenue DESC;
END$$

DELIMITER ;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO Users (name, email, password, role) VALUES
('Admin User',     'admin@proteinstore.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHui', 'admin'),
('Nitya Mehrotra', 'nitya@example.com',      '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHui', 'user'),
('Rijul Yadav',    'rijul@example.com',      '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHui', 'user');

INSERT INTO Products (name, category, description, price, stock, in_stock, low_stock, image_url) VALUES
('Optimum Nutrition Gold Standard Whey', 'Whey Protein',
 'Classic whey protein with 24g protein per serving. Double Rich Chocolate flavor.',
 3499.00, 50, 1, 0, 'https://m.media-amazon.com/images/I/71Lw7FkgniL._AC_UF1000,1000_QL80_.jpg'),

('MuscleBlaze Whey Active', 'Whey Protein',
 'High-quality whey blend. 20g protein per scoop. Great for beginners.',
 1799.00, 80, 1, 0, 'https://m.media-amazon.com/images/I/71RkH0DHD2L._SL1500_.jpg'),

('MyProtein Impact Whey Isolate', 'Whey Isolate',
 '90% protein content. Low fat, low carb. Ideal for lean muscle.',
 2999.00, 40, 1, 0, 'https://musclepharm.com/cdn/shop/files/2ln_Combat_Protein_chocolate_1800x.jpg?v=1770923567'),

('Nakpro Platinum Creatine', 'Creatine',
 'Pure micronised creatine monohydrate. 3g per serving. Unflavored.',
 799.00, 100, 1, 0, 'https://m.media-amazon.com/images/I/61welF3EJGL._AC_UF1000,1000_QL80_.jpg'),

('HealthKart HK Vitals Fish Oil', 'Omega-3',
 'High-EPA omega-3 capsules. Supports heart and joint health.',
 599.00, 150, 1, 0, 'https://cdn01.pharmeasy.in/dam/products_otc/D25244/hk-vitals-fish-oil-60-capsules-for-men-and-women-1000mg-omega-3-2-1770215721.jpg?dim=400x0&dpr=1&q=100'),

('AS-IT-IS Nutrition BCAA', 'Amino Acids',
 '2:1:1 BCAA ratio. Instantised for fast mixing. Watermelon flavor.',
 999.00, 60, 1, 0, 'https://asitisnutrition.com/cdn/shop/files/Atom_Bcaa_Wm_Front.jpg?v=1766469212&width=600'),

('Dymatize ISO100', 'Whey Isolate',
 'Hydrolysed whey isolate. 25g protein, <1g sugar per serving.',
 5499.00, 25, 1, 0, 'https://m.media-amazon.com/images/I/81dCh2H3dZL._AC_UF1000,1000_QL80_.jpg'),

('Scitron Nitro Series Mass Gainer', 'Mass Gainer',
 '3000 calories per serving. 100g protein. For hardgainers.',
 2499.00, 35, 1, 0, 'https://m.media-amazon.com/images/I/71OpySLUyyL._AC_UF1000,1000_QL80_.jpg'),

('MuscleTech Nitro-Tech', 'Whey Protein',
 'Whey protein + creatine blend. 30g protein per serving.',
 4199.00, 20, 1, 0, 'https://m.media-amazon.com/images/I/71AyER7LmIL.jpg'),

('GNC Pro Performance 100% Whey', 'Whey Protein',
 'Blend of whey concentrate and isolate. 25g protein.',
 2799.00, 45, 1, 0, 'https://m.media-amazon.com/images/I/61xcYT2S9OL.jpg'),

('Optimum Nutrition Serious Mass', 'Mass Gainer',
 '1250 calories per serving with 50g protein. Ideal for hardgainers looking to bulk up fast.',
 5499.00, 30, 1, 0, 'https://m.media-amazon.com/images/I/61DQLVMdwsL._AC_UF1000,1000_QL80_.jpg'),

('MuscleBlaze Mass Gainer XXL', 'Mass Gainer',
 '3:1 carb-to-protein ratio. 60.7g protein per serving. Chocolate flavour.',
 2799.00, 40, 1, 0, 'https://img1.hkrtcdn.com/16054/prd_1605310-MuscleBlaze-Mass-Gainer-XXL-6.6-lb-Mango-Burst_o.jpg'),

('Myprotein THE Whey+', 'Whey Isolate',
 'Ultra-premium whey isolate with added Velositol for enhanced muscle protein synthesis.',
 4299.00, 25, 1, 0, 'https://www.myprotein.co.in/images?url=https://static.thcdn.com/productimg/original/14005421-1335129211759648.jpg&format=webp&auto=avif&crop=1100,1200,smart'),

('BSN SYNTHA-6', 'Whey Protein',
 'Multi-functional protein matrix with 22g protein per serving. Milkshake-like taste.',
 3799.00, 35, 1, 0, 'https://m.media-amazon.com/images/I/71Rjqwy8XLL._AC_UF1000,1000_QL80_.jpg'),

('Healthkart Plant Protein', 'Plant Protein',
 'Pea + brown rice protein blend. 25g protein per scoop. Vegan-friendly.',
 2499.00, 50, 1, 0, 'https://img2.hkrtcdn.com/34398/prd_3439741-bGREEN-Plant-Protein-by-HealthKart-2.2-lb-Chocolate_o.jpg'),

('Muscle Pharm Assault', 'Pre-Workout',
 'High-stim pre-workout with caffeine, beta-alanine and creatine. Blue Raspberry flavor.',
 2199.00, 45, 1, 0, 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/msf/msf04581/y/42.jpg'),

('ON Pre-Workout Gold Standard', 'Pre-Workout',
 '175mg caffeine, 3g creatine, beta-alanine. Clinically dosed. Fruit Punch flavor.',
 2999.00, 38, 1, 0, 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/opn/opn05269/l/37.jpg'),

('Sattu Naturals Plant Protein', 'Plant Protein',
 'Made from roasted chana (sattu). 20g protein, high fibre. No artificial flavours.',
 1299.00, 3, 1, 1, 'https://m.media-amazon.com/images/I/51W5WPWklAL._AC_UF1000,1000_QL80_.jpg'),

('AS-IT-IS Whey Protein Concentrate', 'Whey Protein',
 'Unflavored 80% whey concentrate. No additives. Lab tested for purity.',
 1699.00, 70, 1, 0, 'https://asitisnutrition.com/cdn/shop/files/AS-IT-ISWPC250g.jpg?v=1766467417&width=3000'),

('MuscleTech Phase8', 'Whey Protein',
 '8-hour sustained release protein blend. 26g protein per serving. Vanilla flavor.',
 4599.00, 20, 1, 0, 'https://cdn11.bigcommerce.com/s-ilgxsy4t82/images/stencil/original/products/66063/149496/71cK2ijWj0L._AC_SL1500___81448.1661507562.jpg?c=1');