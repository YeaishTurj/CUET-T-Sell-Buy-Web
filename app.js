require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const ejs = require("ejs");

// Initialize Express App
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret: 'your-secret-key', // A secret key to sign the session ID cookie
  resave: false, // Whether to save the session if it was not modified
  saveUninitialized: true, // Save the session if it is new but not modified
  cookie: { secure: false } // Set `secure: true` if you're using HTTPS
}));
// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
  console.log("Connected to database");
});

// Helper function to find user by email
function getUserByEmail(email, callback) {
  db.query("SELECT * FROM User WHERE email = ?", [email], callback);
}

// Middleware to check if user is authenticated (session-based)
function authenticateSession(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/index');
  }
  next();
}

// Home page to select Buyer/Seller
app.get('/', (req, res) => {
  res.render('index');
});

// Page to select Buyer or Seller
app.get('/buyer-seller', (req, res) => {
  res.render('buyerSellerSelect');
});

// Buyer/Seller Registration and Login Forms as Tabs
app.get('/auth/:role', (req, res) => {
  const role = req.params.role;
  if (role !== 'buyer' && role !== 'seller') {
    return res.status(400).send('Invalid role');
  }
  res.render('auth', { role });
});

// Handle Seller Registration (POST)
app.post('/register/seller', async (req, res) => {
  const { email, password, phone, stup_name, wp_no, fb_link } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query("INSERT INTO User (email, password, phone) VALUES (?, ?, ?)", [email, hashedPassword, phone], (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      const userId = result.insertId;
      db.query("INSERT INTO Seller (stup_name, wp_no, fb_link, user_id) VALUES (?, ?, ?, ?)", [stup_name, wp_no, fb_link, userId], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.redirect('/auth/seller'); // Redirect to Seller login page after successful registration
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle Buyer Registration (POST)
app.post('/register/buyer', async (req, res) => {
  const { email, password, phone, buyer_name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query("INSERT INTO User (email, password, phone) VALUES (?, ?, ?)", [email, hashedPassword, phone], (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      const userId = result.insertId;
      db.query("INSERT INTO Buyer (buyer_name, user_id) VALUES (?, ?)", [buyer_name, userId], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.redirect('/auth/buyer'); // Redirect to Buyer login page after successful registration
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle Seller Login (POST)
app.post('/login/seller', (req, res) => {
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

    db.query("SELECT * FROM Seller WHERE user_id = ?", [user.user_id], (err, sellerRows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (sellerRows.length === 0) return res.status(401).json({ success: false, message: "Not a seller account" });

      // Store user session
      req.session.user = { user_id: user.user_id, email: user.email, role: "Seller" };
      res.redirect('/seller-dashboard');
    });
  });
});

// Handle Buyer Login (POST)
app.post('/login/buyer', (req, res) => {
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

    db.query("SELECT * FROM Buyer WHERE user_id = ?", [user.user_id], (err, buyerRows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (buyerRows.length === 0) return res.status(401).json({ success: false, message: "Not a buyer account" });

      // Store user session
      req.session.user = { user_id: user.user_id, email: user.email, role: "Buyer" };
      res.redirect('/buyer-dashboard');
    });
  });
});

// Seller Dashboard (Authenticated page)
app.get('/seller-dashboard', authenticateSession, (req, res) => {
  if (req.session.user.role === 'Seller') {
    const userId = req.session.user.user_id;

    // Fetch products added by the seller
    db.query("SELECT * FROM New_Product WHERE user_id = ?", [userId], (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      // Pass the products data to the template
      res.render('sellerDashboard', { user: req.session.user, products: rows });
    });
  } else {
    res.redirect('/');
  }
});

// Route to show all products (for Buyer)
app.get('/products', (req, res) => {
  // Fetch all new products
  db.query("SELECT * FROM New_Product", (err, newProducts) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    // Fetch all old products
    db.query("SELECT * FROM Old_Product", (err, oldProducts) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      // Combine both new and old products into one array
      const allProducts = [...newProducts, ...oldProducts];

      // Render the products page and pass all products data
      res.render('product', { products: allProducts });
    });
  });
});

app.get("/products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  // Query the product and seller info
  db.query(`
      SELECT p.*, s.stup_name, s.wp_no, s.fb_link
      FROM New_Product p
      JOIN Seller s ON p.user_id = s.user_id
      WHERE p.p_id = ?`,
      [id],
      (err, productResult) => {
          if (err) return res.status(500).json({ error: err.message });
          if (productResult.length === 0) return res.status(404).json({ error: "Product not found" });

          const product = productResult[0];

          // Fetch bids for the product
          db.query(`
              SELECT b.*, u.email AS buyer_email
              FROM Bids b
              JOIN User u ON b.buyer_id = u.user_id
              WHERE b.p_id = ? ORDER BY b.bid_date DESC`,
              [id],
              (err, bidResult) => {
                  if (err) return res.status(500).json({ error: err.message });

                  const bids = bidResult;

                  // Render the product details page with bids and product info
                  res.render('productDetails', { product, seller: productResult[0], bids, user });
              }
          );
      }
  );
});

// Add a bid for a product
app.post("/products/:id/bid", authenticateSession, (req, res) => {
  const { id } = req.params;
  const { bid_price } = req.body; // Get the bid price
  const user = req.session.user;  // Get the logged-in user

  if (!user) {
      return res.status(403).send("You must be logged in as a buyer to place a bid.");
  }

  if (!bid_price || bid_price <= 0) {
      return res.status(400).send("Invalid bid price.");
  }

  // Insert the bid into the database
  const query = `
      INSERT INTO Bids (p_id, buyer_id, bid_price, bid_date)
      VALUES (?, ?, ?, NOW())
  `;
  db.query(query, [id, user.user_id, bid_price], (err, result) => {
      if (err) {
          return res.status(500).send("Error placing the bid.");
      }

      // Redirect back to the product details page after placing the bid
      res.redirect(`/products/${id}`);
  });
});

// Get a single product along with seller details and bids
app.get("/products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;

  // Query to get the product and seller information, along with all bids
  db.query(
      `SELECT p.*, s.stup_name, s.wp_no, s.fb_link
       FROM New_Product p
       JOIN Seller s ON p.user_id = s.user_id
       WHERE p.p_id = ?`,
      [id],
      (err, productResult) => {
          if (err) return res.status(500).json({ error: err.message });
          if (productResult.length === 0) return res.status(404).json({ error: "Product not found" });

          const product = productResult[0];

          // Fetch all bids for the product
          db.query(
              `SELECT b.*, u.email as buyer_email FROM Bids b
               JOIN User u ON b.buyer_id = u.user_id
               WHERE b.p_id = ? ORDER BY b.bid_date DESC`,
              [id],
              (err, bidResult) => {
                  if (err) return res.status(500).json({ error: err.message });

                  const bids = bidResult;

                  // Render product details page with bids
                  res.render('productDetails', { product, seller: productResult[0], bids });
              }
          );
      }
  );
});

// Buyer Dashboard (Authenticated page)
app.get('/buyer-dashboard', authenticateSession, (req, res) => {
  if (req.session.user.role === 'Buyer') {
    res.render('buyerDashboard', { user: req.session.user });
  } else {
    res.redirect('/');
  }
});

// Logout (Clear session)
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Failed to destroy session" });
    }
    res.redirect('/');
  });
});

// NEW PRODUCTS (For Buyer and Seller)
// Get all products (for Buyer)
app.get("/products", authenticateSession, (req, res) => {
  db.query("SELECT * FROM New_Product", (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.render('products', { products: rows });
  });
});

// Get a single product (for Buyer)
app.get("/products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM New_Product WHERE p_id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Product not found" });

    res.render('productDetail', { product: rows[0] });
  });
});

// Add new product (for Seller)
app.get("/seller/products", authenticateSession, (req, res) => {
  if (req.session.user.role === "Seller") {
    res.render('addProduct'); // Render the page where a seller can add products
  } else {
    res.redirect('/');
  }
});

const multer = require('multer');
const path = require('path');

// Setup Multer storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Folder where images will be stored
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Filename with timestamp
  }
});

// Set file filter to allow only image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Please upload an image file'), false);
  }
};

// Create the upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Set file size limit (5MB)
});

app.post("/seller/products", authenticateSession, upload.single('image'), (req, res) => {
  // Check if the image was uploaded
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Please upload an image." });
  }

  const { p_title, price, quantity, desc } = req.body;
  const image = `/uploads/${req.file.filename}`; // The path to the uploaded image

  // Validate input
  if (!p_title || !price || !quantity || !desc) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  // Insert the product into the database
  db.query(
    "INSERT INTO New_Product (p_title, price, quantity, `desc`, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [p_title, price, quantity, desc, image, req.session.user.user_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.redirect('/seller-dashboard'); // Redirect seller after product is added
    }
  );
});


// Server Start
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
