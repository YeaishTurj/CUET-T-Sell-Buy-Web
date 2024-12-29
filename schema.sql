-- Table: User
CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,              -- User ID (Auto Increment)
    email VARCHAR(255) NOT NULL UNIQUE,                   -- User Email (Unique)
    password_hash VARCHAR(255) NOT NULL,                  -- User Password (Hashed)
    phone VARCHAR(20) UNIQUE                              -- User Phone Number (Unique)
) ENGINE=InnoDB;

-- Table: Seller
CREATE TABLE Seller (
    seller_id INT AUTO_INCREMENT PRIMARY KEY,            -- Seller ID (Auto Increment)
    stup_name VARCHAR(255),                               -- Store Name
    wp_no VARCHAR(20),                                    -- WhatsApp Number
    fb_link VARCHAR(255),                                 -- Facebook Link
    user_id INT NOT NULL,                                 -- User ID (Foreign Key referencing User)
    FOREIGN KEY (user_id) REFERENCES User(user_id)        -- Foreign Key constraint
) ENGINE=InnoDB;

-- Table: New_Product
CREATE TABLE New_Product (
    p_id INT AUTO_INCREMENT PRIMARY KEY,                  -- Product ID (Auto Increment)
    p_title VARCHAR(255) NOT NULL,                         -- Product Title
    price DECIMAL(10, 2) NOT NULL,                         -- Product Price (with two decimal places)
    quantity INT NOT NULL CHECK (quantity >= 0),           -- Product Quantity (Non-negative values)
    description TEXT,                                      -- Product Description
    image VARCHAR(255),                                    -- Product Image URL (nullable)
    user_id INT NOT NULL,                                  -- User ID (Foreign Key referencing User)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,        -- Timestamp of when the product was added
    FOREIGN KEY (user_id) REFERENCES User(user_id)        -- Foreign Key constraint
) ENGINE=InnoDB;

-- Table: Old_Product
CREATE TABLE Old_Product (
    op_id INT AUTO_INCREMENT PRIMARY KEY,                  -- Old Product ID (Auto Increment)
    op_title VARCHAR(255) NOT NULL,                         -- Product Title
    asking_price DECIMAL(10, 2) NOT NULL,                  -- Asking Price (with two decimal places)
    avail_dur INT NOT NULL,                                -- Available Duration (in days)
    op_desc TEXT NOT NULL,                                  -- Product Description (Escaped 'desc' keyword)
    image VARCHAR(255),                                    -- Product Image URL (nullable)
    user_id INT NOT NULL,                                  -- User ID (Foreign Key referencing User)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,        -- Timestamp of when the product was added
    FOREIGN KEY (user_id) REFERENCES User(user_id)        -- Foreign Key constraint
) ENGINE=InnoDB;

-- Table: Order
CREATE TABLE `Order` (
    o_id INT AUTO_INCREMENT PRIMARY KEY,                   -- Order ID (Auto Increment)
    o_date DATE NOT NULL,                                   -- Order Date
    p_id INT NOT NULL,                                      -- Product ID (Foreign Key referencing New_Product)
    user_id INT NOT NULL,                                   -- User ID (Foreign Key referencing User)
    FOREIGN KEY (p_id) REFERENCES New_Product(p_id),        -- Foreign Key constraint (New Product)
    FOREIGN KEY (user_id) REFERENCES User(user_id)         -- Foreign Key constraint (User)
) ENGINE=InnoDB;

-- Table: Bid
CREATE TABLE Bid (
    bid_id INT AUTO_INCREMENT PRIMARY KEY,                 -- Bid ID (Auto Increment)
    bid_price DECIMAL(10, 2) NOT NULL,                      -- Bid Price
    buyer_id INT NOT NULL,                                  -- Buyer ID (Foreign Key referencing User)
    op_id INT NOT NULL,                                     -- Old Product ID (Foreign Key referencing Old_Product)
    user_id INT NOT NULL,                                   -- User ID (Foreign Key referencing User)
    FOREIGN KEY (buyer_id) REFERENCES User(user_id),        -- Foreign Key constraint (Buyer)
    FOREIGN KEY (op_id) REFERENCES Old_Product(op_id),      -- Foreign Key constraint (Old Product)
    FOREIGN KEY (user_id) REFERENCES User(user_id)         -- Foreign Key constraint (User)
) ENGINE=InnoDB;

-- Table: Buyer
CREATE TABLE Buyer (
    buyer_name VARCHAR(255),                                -- Buyer Name
    user_id INT PRIMARY KEY,                                -- User ID (Foreign Key referencing User)
    FOREIGN KEY (user_id) REFERENCES User(user_id)          -- Foreign Key constraint
) ENGINE=InnoDB;

-- Table: Cart
CREATE TABLE Cart (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,                 -- Cart ID (Auto Increment)
    user_id INT NOT NULL,                                    -- User ID (Foreign Key referencing User)
    FOREIGN KEY (user_id) REFERENCES User(user_id)           -- Foreign Key constraint (User)
) ENGINE=InnoDB;

-- Table: Contains
CREATE TABLE Contains (
    cart_item_id INT NOT NULL,                              -- Cart Item ID (Foreign Key referencing Cart)
    p_id INT NOT NULL,                                      -- New Product ID (Foreign Key referencing New_Product)
    FOREIGN KEY (cart_item_id) REFERENCES Cart(cart_id),     -- Foreign Key constraint (Cart Item)
    FOREIGN KEY (p_id) REFERENCES New_Product(p_id)         -- Foreign Key constraint (New Product)
) ENGINE=InnoDB;

