require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const ejs = require("ejs");
const multer = require('multer');
const path = require('path');

// Initialize Express App
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));
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

app.use(session({
  secret: 'your-secret-key', // Change this to a secure random string
  resave: false,             // Do not resave the session if it hasn't been modified
  saveUninitialized: true,   // Save uninitialized sessions
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
  }
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
    return res.redirect('/');
  }
  next();
}

// Home page to select Buyer/Seller
app.get('/', (req, res) => {
  res.render('');
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
app.get('/seller/orders', authenticateSession, (req, res) => {
  if (req.session.user.role === 'Seller') {
    const userId = req.session.user.user_id;

    // Query to fetch all orders for the seller
    db.query(`
      SELECT O.o_id, O.o_date, O.p_id, O.user_id, P.p_title, P.price, C.quantity 
      FROM Order O
      JOIN Product P ON O.p_id = P.p_id
      JOIN Cart C ON C.cart_id = O.cart_id
      WHERE P.user_id = ?`, [userId], (err, orders) => {
      
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      // Render the dashboard view and pass orders to the view
      res.render('sellerDashboard', {
        user: req.session.user,
        products: [], // Empty as not needed in this case
        oldProducts: [], // Empty as not needed in this case
        pendingOrders: [], // Empty as not needed in this case
        orders: orders // Pass orders to the view
      });
    });
  } else {
    res.redirect('/');
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
// Route to show all products (for Buyer)
// Route to show all products (for Buyer)
app.get('/products', (req, res) => {
  // Fetch all new products
  db.query("SELECT * FROM New_Product", (err, newProducts) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    // Fetch all old products
    db.query("SELECT * FROM Old_Product", (err, oldProducts) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      // Combine both new and old products into one array
      const allProducts = [
        ...newProducts.map(product => ({
          ...product,
          op_type: 'new', // mark as new product
        })),
        ...oldProducts.map(product => ({
          ...product,
          op_type: 'old', // mark as old product
        }))
      ];

      // Render the products page and pass all products data
      res.render('product', { products: allProducts });
    });
  });
});



app.get('/seller-dashboard', authenticateSession, (req, res) => {
  if (req.session.user.role === 'Seller') {
    const userId = req.session.user.user_id;

    // Fetch new products added by the seller
    db.query("SELECT * FROM New_Product WHERE user_id = ?", [userId], (err, newProducts) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      // Fetch old products added by the seller
      db.query("SELECT * FROM Old_Product WHERE user_id = ?", [userId], (err, oldProducts) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // Fetch all cart items for the seller's products (pending orders)
        db.query(`
          SELECT c.cart_id, c.user_id, c.p_id
          FROM Cart c
          JOIN New_Product p ON c.p_id = p.p_id
          WHERE p.user_id = ?`, [userId], (err, pendingOrders) => {
          if (err) return res.status(500).json({ success: false, error: err.message });

          // Render the dashboard view with products and pending orders
          res.render('sellerDashboard', {
            user: req.session.user, 
            products: newProducts, 
            oldProducts: oldProducts, 
            pendingOrders: pendingOrders // Pass pending orders to the view
          });
        });
      });
    });
  } else {
    res.redirect('/');
  }
});


app.post('/order/approve/:cartId', authenticateSession, (req, res) => {
  const cartId = req.params.cartId;

  // Fetch the cart item details
  db.query("SELECT * FROM Cart WHERE cart_id = ?", [cartId], (err, cartItem) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
    // If no cart item is found, return a 404 error
    if (cartItem.length === 0) {
      return res.status(404).json({ success: false, message: "Cart item not found." });
    }

    const item = cartItem[0];

    // Insert the item into the Orders table
    db.query("INSERT INTO `Order` (o_date, p_id, user_id) VALUES (NOW(), ?, ?)", 
      [item.p_id, item.user_id], 
      (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        const orderId = result.insertId;  // Get the order ID from the insert result

        // Optionally, remove the cart item after moving it to the Orders table
        db.query("DELETE FROM Cart WHERE cart_id = ?", [cartId], (err) => {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }

          // If everything went well, return success
          res.json({ success: true, message: 'Order approved and cart item removed successfully!', orderId });
        });
      });
  });
});


// Route to add old product (for Seller)
app.get("/seller/old-products", authenticateSession, (req, res) => {
  if (req.session.user.role === "Seller") {
    res.render('addOldProduct'); // Render the page where a seller can add old products
  } else {
    res.redirect('/');
  }
});

// Create the upload middleware for old products (if applicable)
const uploadOldProduct = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Set file size limit (5MB)
});

// Handle adding old product (POST)
app.post("/seller/old-products", authenticateSession, uploadOldProduct.single('image'), (req, res) => {
  // Check if the image was uploaded (if applicable)
  let image = null;
  if (req.file) {
    image = `/uploads/${req.file.filename}`; // The path to the uploaded image
  }

  const { op_title, asking_price, avail_dur, op_desc } = req.body;

  // Validate input
  if (!op_title || !asking_price || !avail_dur || !op_desc) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  // Insert the old product into the database
  db.query(
    "INSERT INTO Old_Product (op_title, asking_price, avail_dur, op_desc, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [op_title, asking_price, avail_dur, op_desc, image, req.session.user.user_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.redirect('/seller-dashboard'); // Redirect seller after old product is added
    }
  );
});

// Route to view a single old product with bids
app.get("/old-products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  // Query the product and seller info
  db.query(`
    SELECT p.*, s.stup_name, s.wp_no, s.fb_link
    FROM Old_Product p
    JOIN Seller s ON p.user_id = s.user_id
    WHERE p.op_id = ?`,  // Updated to op_id
    [id],
    (err, productResult) => {
      if (err) return res.status(500).json({ error: err.message });
      if (productResult.length === 0) return res.status(404).json({ error: "Product not found" });

      const product = productResult[0];

      // Fetch bids for the product
      db.query(`
        SELECT b.*, u.email AS buyer_email
        FROM Bid b
        JOIN User u ON b.buyer_id = u.user_id
        WHERE b.op_id = ? ORDER BY b.bid_date DESC`,  // Updated to op_id
        [id],
        (err, bidResult) => {
          if (err) return res.status(500).json({ error: err.message });

          const bids = bidResult;

          // Render the product details page with bids and product info
          res.render('oldProductDetails', { product, seller: productResult[0], bids, user });
        }
      );
    }
  );
});

// Add a bid for a product
app.post("/old-products/:id/bid", authenticateSession, (req, res) => {
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
    INSERT INTO Bid (op_id, buyer_id, bid_price, user_id, bid_date)
    VALUES (?, ?, ?, ?, NOW())`; // Updated column names
  db.query(query, [id, user.user_id, bid_price, user.user_id], (err, result) => {
    if (err) {
      return res.status(500).send("Error placing the bid.");
    }

    // Redirect back to the product details page after placing the bid
    res.redirect(`/old-products/${id}`);
  });
});

// Get a single product along with seller details and bids
app.get("/old-products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;

  // Query to get the product and seller information, along with all bids
  db.query(
    `SELECT p.*, s.stup_name, s.wp_no, s.fb_link
     FROM Old_Product p
     JOIN Seller s ON p.user_id = s.user_id
     WHERE p.op_id = ?`,  // Updated to op_id
    [id],
    (err, productResult) => {
      if (err) return res.status(500).json({ error: err.message });
      if (productResult.length === 0) return res.status(404).json({ error: "Product not found" });

      const product = productResult[0];

      // Fetch all bids for the product
      db.query(
        `SELECT b.*, u.email as buyer_email FROM Bid b  // Updated table name to Bid
         JOIN User u ON b.buyer_id = u.user_id
         WHERE b.op_id = ? ORDER BY b.bid_date DESC`, // Updated to op_id
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

// Get a single product (for Buyer)
app.get("/new-products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;
  const user_id = req.session.user.user_id; // Assuming the user is authenticated and user_id is stored in session

  // Query the database for the product with the specific p_id
  db.query("SELECT * FROM New_Product WHERE p_id = ?", [id], (err, rows) => {
    if (err) {
      // Handle database errors
      return res.status(500).json({ success: false, error: err.message });
    }

    if (rows.length === 0) {
      // Handle case where no product is found
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = rows[0];

    // Check if the product is already in the user's cart
    db.query("SELECT * FROM Cart WHERE user_id = ? AND p_id = ?", [user_id, id], (err, cartRows) => {
      if (err) {
        // Handle database errors
        return res.status(500).json({ success: false, error: err.message });
      }

      // Determine if the product is in the cart
      const isInCart = cartRows.length > 0;

      // Render the productDetail EJS page and pass the product data and isInCart flag
      res.render('newProductDetail', { product, isInCart });
    });
  });
});

app.post("/cart/confirm-order", authenticateSession, (req, res) => {
  const user_id = req.session.user.user_id;

  // Fetch the user's cart items
  db.query("SELECT * FROM Cart WHERE user_id = ?", [user_id], (err, cartItems) => {
      if (err) {
          return res.status(500).json({ success: false, error: err.message });
      }

      if (cartItems.length === 0) {
          return res.status(400).json({ success: false, message: "Your cart is empty." });
      }

      // Process each item in the cart
      const orderItems = [];
      cartItems.forEach(item => {
          orderItems.push({
              user_id,
              p_id: item.p_id,
              quantity: item.quantity,
              price: item.price,
              order_date: new Date()
          });

          // Update inventory by reducing the quantity
          db.query("UPDATE New_Product SET quantity = quantity - ? WHERE p_id = ?", [item.quantity, item.p_id], (err) => {
              if (err) {
                  return res.status(500).json({ success: false, error: err.message });
              }
          });
      });

      // Insert the confirmed order into an Orders table
      db.query("INSERT INTO Order (user_id, status, order_date) VALUES (?, 'Confirmed', NOW())", [user_id], (err, result) => {
          if (err) {
              return res.status(500).json({ success: false, error: err.message });
          }

          const order_id = result.insertId;

          // Insert each item into the OrderItems table
          orderItems.forEach(item => {
              db.query("INSERT INTO OrderItems (order_id, p_id, quantity, price) VALUES (?, ?, ?, ?)", [order_id, item.p_id, item.quantity, item.price], (err) => {
                  if (err) {
                      return res.status(500).json({ success: false, error: err.message });
                  }
              });
          });

          // Clear the user's cart after confirming the order
          db.query("DELETE FROM Cart WHERE user_id = ?", [user_id], (err) => {
              if (err) {
                  return res.status(500).json({ success: false, error: err.message });
              }

              res.json({ success: true, message: "Order confirmed successfully!" });
          });
      });
  });
});


// Add new product (for Seller)
app.get("/seller/new-products", authenticateSession, (req, res) => {
  if (req.session.user.role === "Seller") {
    res.render('addNewProduct'); // Render the page where a seller can add products
  } else {
    res.redirect('/');
  }
});




// Create the upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Set file size limit (5MB)
});

app.post("/seller/new-products", authenticateSession, upload.single('image'), (req, res) => {
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

app.post('/cart/add', authenticateSession, (req, res) => {
  const { p_id } = req.body;  // Get the product ID from the request body
  const user_id = req.session.user.user_id; // Get the logged-in user's ID
  
  if (!p_id) {
    return res.status(400).json({ success: false, message: "Product ID is required" });
  }

  // Ensure the product exists in the New_Product table
  db.query("SELECT * FROM New_Product WHERE p_id = ?", [p_id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Product not found" });

    // Check if the user already has this product in the cart
    db.query("SELECT * FROM Cart WHERE user_id = ? AND p_id = ?", [user_id, p_id], (err, cartRows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      if (cartRows.length > 0) {
        return res.status(400).json({ success: false, message: "Product already in cart" });
      }

      // Insert the product into the Cart
      db.query("INSERT INTO Cart (user_id, p_id) VALUES (?, ?)", [user_id, p_id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.status(200).json({ success: true, message: "Product added to cart successfully" });
      });
    });
  });
});


// Server Start
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
