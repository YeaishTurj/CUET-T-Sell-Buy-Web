require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Initialize Express App
const app = express();
app.use(bodyParser.json());
app.use(cors());

// JWT Secret Key (from environment variable)
const JWT_SECRET = process.env.JWT_SECRET;

// Database connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Connect to Database
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
  console.log("Connected to database");
});

// Static files from the "public" folder
app.use(express.static("public"));

// Helper functions for user queries
function getUserByEmail(email, callback) {
  db.query("SELECT * FROM User WHERE email = ?", [email], callback);
}

function getUserRole(userId, callback) {
  db.query("SELECT * FROM Seller WHERE user_id = ?", [userId], (err, sellerRows) => {
    if (err) return callback(err, null);
    if (sellerRows.length > 0) return callback(null, "Seller");

    db.query("SELECT * FROM Buyer WHERE user_id = ?", [userId], (err, buyerRows) => {
      if (err) return callback(err, null);
      if (buyerRows.length > 0) return callback(null, "Buyer");
      callback(null, "Unknown");
    });
  });
}

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ success: false, message: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

//////////////////////////////////////////////////////////////
// AUTHENTICATION (Register and Login)
//////////////////////////////////////////////////////////////

// Register Seller or Buyer
app.post("/register", async (req, res) => {
  const { email, password, phone, isSeller, stup_name, wp_no, fb_link, buyer_name } = req.body;

  // Validate input
  if (!email || !password || !phone) {
    return res.status(400).json({ success: false, message: "Email, password, and phone are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert User
    db.query(
      "INSERT INTO User (email, password, phone) VALUES (?, ?, ?)",
      [email, hashedPassword, phone],
      (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        const userId = result.insertId;

        // Register Seller or Buyer
        if (isSeller) {
          db.query(
            "INSERT INTO Seller (stup_name, wp_no, fb_link, user_id) VALUES (?, ?, ?, ?)",
            [stup_name, wp_no, fb_link, userId],
            (err) => {
              if (err) return res.status(500).json({ success: false, error: err.message });
              res.status(201).json({ success: true, message: "Seller registered successfully" });
            }
          );
        } else {
          db.query(
            "INSERT INTO Buyer (buyer_name, user_id) VALUES (?, ?)",
            [buyer_name, userId],
            (err) => {
              if (err) return res.status(500).json({ success: false, error: err.message });
              res.status(201).json({ success: true, message: "Buyer registered successfully" });
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login for Seller or Buyer
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  getUserByEmail(email, async (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });

    // Get user role (Seller or Buyer)
    getUserRole(user.user_id, (err, role) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      res.status(200).json({
        success: true,
        message: `Login successful (${role})`,
        token,
        user,
        role,
      });
    });
  });
});

//////////////////////////////////////////////////////////////
// NEW PRODUCTS (For Buyer and Seller)
//////////////////////////////////////////////////////////////

// Get all products (for Buyer)
app.get("/products", authenticateToken, (req, res) => {
  db.query("SELECT * FROM New_Product", (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.status(200).json({ success: true, data: rows });
  });
});

// Get a single product (for Buyer)
app.get("/products/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM New_Product WHERE p_id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, data: rows[0] });
  });
});

// Add new product (for Seller)
app.post("/seller/products", authenticateToken, (req, res) => {
  const { p_title, price, quantity, desc, image } = req.body;

  // Validate input
  if (!p_title || !price || !quantity || !desc || !image) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  db.query(
    "INSERT INTO New_Product (p_title, price, quantity, `desc`, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [p_title, price, quantity, desc, image, req.user.user_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.status(201).json({ success: true, message: "Product added successfully" });
    }
  );
});

// Get all products added by a specific Seller
app.get("/seller/:user_id/products", authenticateToken, (req, res) => {
  const { user_id } = req.params;

  db.query("SELECT * FROM New_Product WHERE user_id = ?", [user_id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.status(200).json({ success: true, data: rows });
  });
});

//////////////////////////////////////////////////////////////
// OLD PRODUCTS AND BIDS (For Seller and Buyer)
//////////////////////////////////////////////////////////////

// Get all old products (for Buyer)
app.get("/old-products", authenticateToken, (req, res) => {
  db.query("SELECT * FROM Old_Product", (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.status(200).json({ success: true, data: rows });
  });
});

// Get a single old product (for Buyer)
app.get("/old-products/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM Old_Product WHERE op_id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Old Product not found" });

    res.status(200).json({ success: true, data: rows[0] });
  });
});

// Add an old product (for Seller)
app.post("/old-products", authenticateToken, (req, res) => {
  const { post_date, avail_dur, asking_price } = req.body;

  // Validate input
  if (!post_date || !avail_dur || !asking_price) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  db.query(
    "INSERT INTO Old_Product (post_date, avail_dur, asking_price, user_id) VALUES (?, ?, ?, ?)",
    [post_date, avail_dur, asking_price, req.user.user_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.status(201).json({ success: true, message: "Old product added successfully" });
    }
  );
});

// Add bid to an old product
app.post("/old-product/:op_id/bid", authenticateToken, (req, res) => {
  const { op_id } = req.params;
  const { bid_price } = req.body;

  // Validate input
  if (!bid_price) {
    return res.status(400).json({ success: false, message: "Bid price is required" });
  }

  db.query(
    "INSERT INTO Bid (bid_price, op_id, user_id) VALUES (?, ?, ?)",
    [bid_price, op_id, req.user.user_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.status(201).json({ success: true, message: "Bid placed successfully" });
    }
  );
});

// Get all bids for an old product
app.get("/old-product/:op_id/bids", authenticateToken, (req, res) => {
  const { op_id } = req.params;

  db.query(
    "SELECT Bid.bid_id, Bid.bid_price, User.email FROM Bid JOIN User ON Bid.user_id = User.user_id WHERE Bid.op_id = ?",
    [op_id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.status(200).json({ success: true, data: rows });
    }
  );
});

//////////////////////////////////////////////////////////////
// START SERVER
//////////////////////////////////////////////////////////////

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
