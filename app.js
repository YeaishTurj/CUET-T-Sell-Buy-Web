require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const session = require("express-session");
const ejs = require("ejs");
const multer = require('multer');
const path = require('path');
const methodOverride = require('method-override');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));
app.use(methodOverride('_method'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});


const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Please upload an image file'), false);
  }
};

app.use(session({
  secret: 'your-secret-key',
  resave: false,            
  saveUninitialized: true,  
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}));

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

function getUserByEmail(email, callback) {
  db.query("SELECT * FROM User WHERE email = ?", [email], callback);
}

function authenticateSession(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
}

app.get('/', (req, res) => {
  res.render('');
});

app.get('/buyer-seller', (req, res) => {
  res.render('buyerSellerSelect');
});

app.get('/auth/:role', (req, res) => {
  const role = req.params.role;
  if (role !== 'buyer' && role !== 'seller') {
    return res.status(400).send('Invalid role');
  }
  res.render('auth', { role });
});


app.post('/register/seller', async (req, res) => {
  const { email, password, phone, stup_name, wp_no, fb_link } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query("INSERT INTO User (email, password, phone) VALUES (?, ?, ?)", [email, hashedPassword, phone], (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      const userId = result.insertId;
      db.query("INSERT INTO Seller (stup_name, wp_no, fb_link, user_id) VALUES (?, ?, ?, ?)", [stup_name, wp_no, fb_link, userId], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.redirect('/auth/seller');
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
app.get('/seller/orders', authenticateSession, (req, res) => {
  if (req.session.user.role === 'Seller') {
    const userId = req.session.user.user_id;

   
    db.query(`
      SELECT O.o_id, O.o_date, O.p_id, O.user_id, P.p_title, P.price, C.quantity 
      FROM Order O
      JOIN Product P ON O.p_id = P.p_id
      JOIN Cart C ON C.cart_id = O.cart_id
      WHERE P.user_id = ?`, [userId], (err, orders) => {
      
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

     
      res.render('sellerDashboard', {
        user: req.session.user,
        products: [],
        oldProducts: [],
        pendingOrders: [],
        orders: orders
      });
    });
  } else {
    res.redirect('/');
  }
});


app.post('/register/buyer', async (req, res) => {
  const { email, password, phone, buyer_name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query("INSERT INTO User (email, password, phone) VALUES (?, ?, ?)", [email, hashedPassword, phone], (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      const userId = result.insertId;
      db.query("INSERT INTO Buyer (buyer_name, user_id) VALUES (?, ?)", [buyer_name, userId], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.redirect('/auth/buyer');
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


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

     
      req.session.user = { user_id: user.user_id, email: user.email, role: "Seller" };
      res.redirect('/seller-dashboard');
    });
  });
});


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

     
      req.session.user = { user_id: user.user_id, email: user.email, role: "Buyer" };
      res.redirect('/buyer-dashboard');
    });
  });
});


app.get('/products', (req, res) => {
 
  db.query("SELECT * FROM New_Product", (err, newProducts) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

   
    db.query("SELECT * FROM Old_Product", (err, oldProducts) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

     
      const allProducts = [
        ...newProducts.map(product => ({
          ...product,
          op_type: 'new',
        })),
        ...oldProducts.map(product => ({
          ...product,
          op_type: 'old',
        }))
      ];

     
      res.render('product', { products: allProducts });
    });
  });
});



app.get('/seller-dashboard', authenticateSession, (req, res) => {
  if (req.session.user.role === 'Seller') {
    const userId = req.session.user.user_id;

   
    db.query("SELECT * FROM New_Product WHERE user_id = ?", [userId], (err, newProducts) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

     
      db.query("SELECT * FROM Old_Product WHERE user_id = ?", [userId], (err, oldProducts) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

       
        db.query(`
          SELECT c.cart_id, c.user_id, c.p_id
          FROM Cart c
          JOIN New_Product p ON c.p_id = p.p_id
          WHERE p.user_id = ?`, [userId], (err, pendingOrders) => {
          if (err) return res.status(500).json({ success: false, error: err.message });

         
          res.render('sellerDashboard', {
            user: req.session.user, 
            products: newProducts, 
            oldProducts: oldProducts, 
            pendingOrders: pendingOrders
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

 
  db.query("SELECT * FROM Cart WHERE cart_id = ?", [cartId], (err, cartItem) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    
   
    if (cartItem.length === 0) {
      return res.status(404).json({ success: false, message: "Cart item not found." });
    }

    const item = cartItem[0];

   
    db.query("INSERT INTO `Order` (o_date, p_id, user_id) VALUES (NOW(), ?, ?)", 
      [item.p_id, item.user_id], 
      (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        const orderId = result.insertId; 

       
        db.query("DELETE FROM Cart WHERE cart_id = ?", [cartId], (err) => {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }

         
          res.json({ success: true, message: 'Order approved and cart item removed successfully!', orderId });
        });
      });
  });
});



app.get("/seller/old-products", authenticateSession, (req, res) => {
  if (req.session.user.role === "Seller") {
    res.render('addOldProduct');
  } else {
    res.redirect('/');
  }
});


const uploadOldProduct = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});


app.post("/seller/old-products", authenticateSession, uploadOldProduct.single('image'), (req, res) => {
 
  let image = null;
  if (req.file) {
    image = `/uploads/${req.file.filename}`;
  }

  const { op_title, asking_price, avail_dur, op_desc } = req.body;

 
  if (!op_title || !asking_price || !avail_dur || !op_desc) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

 
  db.query(
    "INSERT INTO Old_Product (op_title, asking_price, avail_dur, op_desc, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [op_title, asking_price, avail_dur, op_desc, image, req.session.user.user_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.redirect('/seller-dashboard');
    }
  );
});


app.get("/old-products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;
  const userID = req.session.user.user_id;

 
  db.query(`
    SELECT p.*, s.stup_name, s.wp_no, s.fb_link
    FROM Old_Product p
    JOIN Seller s ON p.user_id = s.user_id
    WHERE p.op_id = ?`, 
    [id],
    (err, productResult) => {
      if (err) return res.status(500).json({ error: err.message });
      if (productResult.length === 0) return res.status(404).json({ error: "Product not found" });

      const product = productResult[0];
      const selling_price = product.selling_price;

     
      db.query(`
        SELECT b.*, u.email AS buyer_email
        FROM Bid b
        JOIN User u ON b.buyer_id = u.user_id
        WHERE b.op_id = ? ORDER BY b.bid_date DESC`, 
        [id],
        (err, bidResult) => {
          if (err) return res.status(500).json({ error: err.message });

          const bids = bidResult;
          const currentTime= new Date();

         
          res.render('oldProductDetails', { product, seller: productResult[0], bids, userID, currentTime, selling_price });
        }
      );
    }
  );
});




app.post("/old-products/:id/bid", authenticateSession, (req, res) => {
  const { id } = req.params;
  const { bid_price } = req.body;
  const user = req.session.user; 

  if (!user) {
    return res.status(403).send("You must be logged in as a buyer to place a bid.");
  }

  if (!bid_price || bid_price <= 0) {
    return res.status(400).send("Invalid bid price.");
  }

 
  const query = `
    INSERT INTO Bid (op_id, buyer_id, bid_price, user_id, bid_date)
    VALUES (?, ?, ?, ?, NOW())`;
  db.query(query, [id, user.user_id, bid_price, user.user_id], (err, result) => {
    if (err) {
      return res.status(500).send("Error placing the bid.");
    }

   
    res.redirect(`/old-products/${id}`);
  });
});


app.get("/old-products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;

 
  db.query(
    `SELECT p.*, s.stup_name, s.wp_no, s.fb_link
     FROM Old_Product p
     JOIN Seller s ON p.user_id = s.user_id
     WHERE p.op_id = ?`, 
    [id],
    (err, productResult) => {
      if (err) return res.status(500).json({ error: err.message });
      if (productResult.length === 0) return res.status(404).json({ error: "Product not found" });

      const product = productResult[0];

     
      db.query(
        `SELECT b.*, u.email as buyer_email FROM Bid b 
         JOIN User u ON b.buyer_id = u.user_id
         WHERE b.op_id = ? ORDER BY b.bid_date DESC`,
        [id],
        (err, bidResult) => {
          if (err) return res.status(500).json({ error: err.message });

          const bids = bidResult;

         
          res.render('productDetails', { product, seller: productResult[0], bids });
        }
      );
    }
  );
});



app.get('/buyer-dashboard', authenticateSession, (req, res) => {
  if (req.session.user.role === 'Buyer') {
    res.render('buyerDashboard', { user: req.session.user });
  } else {
    res.redirect('/');
  }
});


app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Failed to destroy session" });
    }
    res.redirect('/');
  });
});




app.get("/new-products/:id", authenticateSession, (req, res) => {
  const { id } = req.params;
  const user_id = req.session.user.user_id;

 
  db.query("SELECT * FROM New_Product WHERE p_id = ?", [id], (err, rows) => {
    if (err) {
     
      return res.status(500).json({ success: false, error: err.message });
    }

    if (rows.length === 0) {
     
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = rows[0];

   
    db.query("SELECT * FROM Cart WHERE user_id = ? AND p_id = ?", [user_id, id], (err, cartRows) => {
      if (err) {
       
        return res.status(500).json({ success: false, error: err.message });
      }

     
      const isInCart = cartRows.length > 0;

     
      res.render('newProductDetail', { product, isInCart });
    });
  });
});

app.post("/new-products/delete/:id", authenticateSession, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM New_Product WHERE p_id = ?", [id], (err) => {
      if (err) {
          return res.status(500).send("Error deleting product.");
      }
      res.redirect("/seller-dashboard"); // Redirect to the new products page
  });
});

app.post("/old-products/delete/:id", authenticateSession, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM Old_Product WHERE op_id = ?", [id], (err) => {
      if (err) {
          return res.status(500).send("Error deleting product.");
      }
      res.redirect("/seller-dashboard"); // Redirect to the old products page
  });
});


app.post("/cart/confirm-order", authenticateSession, (req, res) => {
  const user_id = req.session.user.user_id;

 
  db.query("SELECT * FROM Cart WHERE user_id = ?", [user_id], (err, cartItems) => {
      if (err) {
          return res.status(500).json({ success: false, error: err.message });
      }

      if (cartItems.length === 0) {
          return res.status(400).json({ success: false, message: "Your cart is empty." });
      }

     
      const orderItems = [];
      cartItems.forEach(item => {
          orderItems.push({
              user_id,
              p_id: item.p_id,
              quantity: item.quantity,
              price: item.price,
              order_date: new Date()
          });

         
          db.query("UPDATE New_Product SET quantity = quantity - ? WHERE p_id = ?", [item.quantity, item.p_id], (err) => {
              if (err) {
                  return res.status(500).json({ success: false, error: err.message });
              }
          });
      });

     
      db.query("INSERT INTO Order (user_id, status, order_date) VALUES (?, 'Confirmed', NOW())", [user_id], (err, result) => {
          if (err) {
              return res.status(500).json({ success: false, error: err.message });
          }

          const order_id = result.insertId;

         
          orderItems.forEach(item => {
              db.query("INSERT INTO OrderItems (order_id, p_id, quantity, price) VALUES (?, ?, ?, ?)", [order_id, item.p_id, item.quantity, item.price], (err) => {
                  if (err) {
                      return res.status(500).json({ success: false, error: err.message });
                  }
              });
          });

         
          db.query("DELETE FROM Cart WHERE user_id = ?", [user_id], (err) => {
              if (err) {
                  return res.status(500).json({ success: false, error: err.message });
              }

              res.json({ success: true, message: "Order confirmed successfully!" });
          });
      });
  });
});



app.get("/seller/new-products", authenticateSession, (req, res) => {
  if (req.session.user.role === "Seller") {
    res.render('addNewProduct');
  } else {
    res.redirect('/');
  }
});





const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.post("/seller/new-products", authenticateSession, upload.single('image'), (req, res) => {
 
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Please upload an image." });
  }

  const { p_title, price, quantity, desc } = req.body;
  const image = `/uploads/${req.file.filename}`;

 
  if (!p_title || !price || !quantity || !desc) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

 
  db.query(
    "INSERT INTO New_Product (p_title, price, quantity, `desc`, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [p_title, price, quantity, desc, image, req.session.user.user_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.redirect('/seller-dashboard');
    }
  );
});

app.post('/cart/add', authenticateSession, (req, res) => {
  const { p_id } = req.body; 
  const user_id = req.session.user.user_id;

  // Validate input
  if (!p_id) {
    return res.status(400).json({ success: false, message: "Product ID is required" });
  }

  // Check if the product exists
  db.query("SELECT * FROM New_Product WHERE p_id = ?", [p_id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Product not found" });

    // Check if the user already has a cart
    db.query("SELECT * FROM Cart WHERE user_id = ?", [user_id], (err, cartRows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      // If the user doesn't have a cart, create one
      if (cartRows.length === 0) {
        db.query("INSERT INTO Cart (user_id) VALUES (?)", [user_id], (err, result) => {
          if (err) return res.status(500).json({ success: false, error: err.message });
          
          const cart_id = result.insertId;

          // Add product to 'contains' table
          db.query("INSERT INTO contains (cart_item_id, p_id) VALUES (?, ?)", [cart_id, p_id], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.status(200).json({ success: true, message: "Product added to cart successfully" });
          });
        });
      } else {
        // Cart exists, check if the product is already in the cart
        const cart_id = cartRows[0].cart_id;

        db.query("SELECT * FROM contains WHERE cart_item_id = ? AND p_id = ?", [cart_id, p_id], (err, containsRows) => {
          if (err) return res.status(500).json({ success: false, error: err.message });

          if (containsRows.length > 0) {
            return res.status(400).json({ success: false, message: "Product already in cart" });
          }

          // If product is not in cart, add it to 'contains' table
          db.query("INSERT INTO contains (cart_item_id, p_id) VALUES (?, ?)", [cart_id, p_id], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.status(200).json({ success: true, message: "Product added to cart successfully" });
          });
        });
      }
    });
  });
});

// POST /orders endpoint
app.post('/orders', (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
      return res.status(401).json({ message: 'You must be logged in to place an order.' });
  }

  // Extract user information and order details
  const userId = req.session.user.user_id; // User ID from session
  const { p_id } = req.body; // Product ID from the request body

  if (!p_id) {
      return res.status(400).json({ message: 'Product ID is required.' });
  }

  // Insert the order into the database
  const o_date = new Date().toISOString().slice(0, 10); // Current date in YYYY-MM-DD format
  const orderData = {
      o_date,
      p_id,
      user_id: userId
  };

  const insertQuery = 'INSERT INTO `order` (o_date, p_id, user_id) VALUES (?, ?, ?)';
  db.query(insertQuery, [orderData.o_date, orderData.p_id, orderData.user_id], (err, result) => {
      if (err) {
          console.error('Error inserting order:', err);
          return res.status(500).json({ message: 'Internal server error.' });
      }
      res.status(201).json({ message: 'Order created successfully.', orderId: result.insertId });
  });
});


// view old product details for seller
app.get("/old-products-seller/:id", authenticateSession, (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

 
  db.query(`
    SELECT p.*, s.stup_name, s.wp_no, s.fb_link
    FROM Old_Product p
    JOIN Seller s ON p.user_id = s.user_id
    WHERE p.op_id = ?`, 
    [id],
    (err, productResult) => {
      if (err) return res.status(500).json({ error: err.message });
      if (productResult.length === 0) return res.status(404).json({ error: "Product not found" });

      const product = productResult[0];

     
      db.query(`
        SELECT b.*, u.email AS buyer_email
        FROM Bid b
        JOIN User u ON b.buyer_id = u.user_id
        WHERE b.op_id = ? ORDER BY b.bid_date DESC`, 
        [id],
        (err, bidResult) => {
          if (err) return res.status(500).json({ error: err.message });

          const bids = bidResult;

          res.render('oldProductSeller', { product, seller: productResult[0], bids, user });
        }
      );
    }
  );
});


// update old product details
app.put('/update-old-product/:id', (req, res) => {
  const { op_title, asking_price, avail_dur, op_desc } = req.body;
  const productId = req.params.id;

  db.query(
    "UPDATE Old_Product SET op_title = ?, asking_price = ?, avail_dur = ?, op_desc = ? WHERE op_id = ?",
    [op_title, asking_price, avail_dur, op_desc, productId],
    (err) => {
      if (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ message: 'Internal server error.' });
      }
    }
  );

  console.log(`Product with ID ${productId} updated`);
  res.redirect(`http://localhost:5000/seller-dashboard`); 
});

// permit order to be processed by a selected user
app.put('/permit-order/:id', (req, res) => {
  const oldProductID = req.params.id;
  const selectedBid = req.body.selectedBid; // e.g., "123|250.00"
  const [userID, bid_price] = selectedBid.split('|');

  db.query('UPDATE Old_Product SET canOrder = ?, selling_price = ?  WHERE op_id = ?', [userID,bid_price, oldProductID], (err) => {
    if (err) {
      console.error('Error permitting order:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }
  );

  console.log(`Order with ID ${oldProductID} permitted to be processed by user with ID ${userID}`);
  res.redirect('http://localhost:5000/seller-dashboard'); // Redirect to the seller dashboard or wherever you prefer
});

// won bid
app.get('/wonBids/:email', (req, res) => {
  const { email } = req.params;

  db.query('SELECT user_id FROM User WHERE email = ?', [email], (err, result) => {
    if (err) {
      console.error('Error fetching user ID:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userID = result[0].user_id;

    // Query Old_Product table for products where canOrder == userID
    db.query('SELECT * FROM Old_Product WHERE canOrder = ?', [userID], (err, products) => {
      if (err) {
        console.error('Error fetching won bids:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Render the bidsWon page with the products array
      res.render('bidsWon', { email: email, userID: userID, products: products });
    });
  });
});

// view new product details for seller
app.get("/new-product-seller/:id", authenticateSession, (req, res) => {
  const { id } = req.params;
  const user_id = req.session.user.user_id;

 
  db.query("SELECT * FROM New_Product WHERE p_id = ?", [id], (err, rows) => {
    if (err) {
     
      return res.status(500).json({ success: false, error: err.message });
    }

    if (rows.length === 0) {
     
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = rows[0];

   
    db.query("SELECT * FROM Cart WHERE user_id = ? AND p_id = ?", [user_id, id], (err, cartRows) => {
      if (err) {
       
        return res.status(500).json({ success: false, error: err.message });
      }

     
      const isInCart = cartRows.length > 0;

     
      res.render('newProductSeller', { product, isInCart });
    });
  });
});

// update new product details
app.put('/update-new-product/:id', (req, res) => {
  const { p_title, price, desc } = req.body;
  const productId = req.params.id;

  
  db.query(
    "UPDATE New_Product SET p_title = ?, price = ?, `desc` = ? WHERE p_id = ?",
    [p_title, price, desc, productId],
    (err) => {
      if (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ message: 'Internal server error.' });
      }
    }
  );

  console.log(`Product with ID ${productId} updated`);
  res.redirect('http://localhost:5000/seller-dashboard'); 
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});