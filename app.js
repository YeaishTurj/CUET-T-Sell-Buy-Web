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

const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

app.get('/seller-dashboard', authenticateSession, async (req, res) => {
  if (req.session.user.role !== 'Seller') {
    return res.redirect('/');
  }

  const userId = req.session.user.user_id;

  try {
    // Fetch new products
    const newProducts = await query("SELECT * FROM New_Product WHERE user_id = ?", [userId]);

    // Fetch old products
    const oldProducts = await query("SELECT * FROM Old_Product WHERE user_id = ?", [userId]);

    // Fetch new pending orders
    const q1 = `
      SELECT 
        \`Order\`.o_id, New_Product.p_title as title, New_Product.price as price, \`Order\`.o_date, \`Order\`.user_id 
      FROM 
        \`Order\` 
      INNER JOIN 
        New_Product ON \`Order\`.np_id = New_Product.p_id 
      WHERE 
        New_Product.user_id = ?`;
    const newPendingOrders = await query(q1, [userId]);

    // Fetch old pending orders
    const q2 = `
      SELECT 
        \`Order\`.o_id, Old_Product.op_title as title, Old_Product.selling_price as price, \`Order\`.o_date , \`Order\`.user_id
      FROM 
        \`Order\` 
      INNER JOIN 
        Old_Product ON \`Order\`.op_id = Old_Product.op_id 
      WHERE 
        Old_Product.user_id = ?`;
    const oldPendingOrders = await query(q2, [userId]);

    // Combine pending orders
    const pendingOrders = [
      ...newPendingOrders.map(order => ({
        ...order,
        op_type: 'new',
      })),
      ...oldPendingOrders.map(order => ({
        ...order,
        op_type: 'old',
      })),
    ];

    // Render the seller dashboard
    res.render('sellerDashboard', {
      user: req.session.user,
      products: newProducts,
      oldProducts: oldProducts,
      pendingOrders: pendingOrders,
    });

  } catch (error) {
    console.error('Error fetching data for seller dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the seller dashboard data.',
      error: error.message,
    });
  }
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
          const currentTime = new Date();


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


    db.query("SELECT * FROM Cart WHERE user_id = ? AND cart_item_id = ?", [user_id, id], (err, cartRows) => {
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

  res.redirect(`http://localhost:55000/seller-dashboard`);
});

// permit order to be processed by a selected user
app.put('/permit-order/:id', (req, res) => {
  const oldProductID = req.params.id;
  const selectedBid = req.body.selectedBid; // e.g., "123|250.00"
  const [userID, bid_price] = selectedBid.split('|');

  db.query('UPDATE Old_Product SET canOrder = ?, selling_price = ?  WHERE op_id = ?', [userID, bid_price, oldProductID], (err) => {
    if (err) {
      console.error('Error permitting order:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }
  );

  res.redirect('http://localhost:55000/seller-dashboard'); // Redirect to the seller dashboard or wherever you prefer
});

// won bid
app.get('/wonBids/:email', (req, res) => {
  const { email } = req.params;

  // Query to fetch user ID
  db.query('SELECT user_id FROM User WHERE email = ?', [email], (err, result) => {
    if (err) {
      console.error('Error fetching user ID:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userID = result[0].user_id;

    // Query to fetch all bids for the user
    db.query(
      'SELECT Old_Product.op_id, op_title, asking_price, Bid.bid_price ' +
      'FROM Old_Product ' +
      'JOIN Bid ON Old_Product.op_id = Bid.op_id ' +
      'WHERE Bid.buyer_id = ?',
      [userID],
      (err, allBids) => {
        if (err) {
          console.error('Error fetching won bids:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        // Query to fetch products where canOrder equals the user ID
        db.query('SELECT * FROM Old_Product WHERE canOrder = ?', [userID], (err, products) => {
          if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          // Render the bidsWon page with all fetched data
          res.render('bidsWon', { email: email, userID: userID, products: products, allBids: allBids });
        });
      }
    );
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


    db.query("SELECT * FROM Cart WHERE user_id = ? AND cart_item_id = ?", [user_id, id], (err, cartRows) => {
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

  res.redirect('http://localhost:55000/seller-dashboard');
});

// add product to cart
app.post('/cart/add', authenticateSession, (req, res) => {
  var cart_item_id = req.body.p_id;
  var user_id = req.session.user.user_id;

  db.query('INSERT INTO Cart (user_id, cart_item_id) VALUES (?, ?)', [user_id, cart_item_id], (err) => {
    if (err) {
      console.error('Error adding product to cart:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.redirect(`/new-products/${cart_item_id}`);
  });
});

// show cart
app.get('/cart/show', authenticateSession, (req, res) => {
  const user_id = req.session.user.user_id;

  // Query to fetch all products in the user's cart
  db.query("SELECT p_title,price,p_id FROM New_Product WHERE p_id IN (SELECT cart_item_id FROM Cart WHERE user_id = ?)", [user_id], (err, cartItems) => {
    if (err) {
      console.error('Error fetching cart items:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Render the cart page with the fetched data
    res.render('cart', { cartItems: cartItems });
  });
});

// remove product from cart
app.post('/cart/remove', authenticateSession, (req, res) => {
  const user_id = req.session.user.user_id;
  const cart_item_id = req.body.p_id;

  // Query to delete the product from the user's cart
  db.query('DELETE FROM Cart WHERE user_id = ? AND cart_item_id = ?', [user_id, cart_item_id], (err) => {
    if (err) {
      console.error('Error removing product from cart:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.redirect('/cart/show');
  });
});

// place order
app.post('/order/placeNew', authenticateSession, (req, res) => {
  const user_id = req.session.user.user_id;

  var prod_id = req.body.p_id;

  // Query to insert the order into the database

  var q = 'INSERT INTO `Order` (o_date, user_id, np_id) VALUES (NOW(), ?, ?)';

  db.query(q, [user_id, prod_id], (err) => {
    if (err) {
      console.error('Error placing order:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.redirect(`/order/view`);
  }


  );
});

// palce order for old product
app.post('/order/placeOld', authenticateSession, (req, res) => {
  const user_id = req.session.user.user_id;

  var op_id = req.body.op_id;

  // Query to insert the order into the database

  var q = 'INSERT INTO `Order` (o_date, user_id, op_id) VALUES (NOW(), ?, ?)';

  db.query(q, [user_id, op_id], (err) => {
    if (err) {
      console.error('Error placing order:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.redirect(`/order/view`);
  });
});

// view placed orders
app.get('/order/view', authenticateSession, (req, res) => {
  const user_id = req.session.user.user_id;
  // find placed order from new product
  var q1 = 'select New_Product.p_title,New_Product.price,Order.o_date from New_Product inner join `Order`' +
    ' on New_Product.p_id=Order.np_id ' +
    'where Order.user_id=? and Order.np_id is not null';

  // find placed order from old product
  var q2 = 'select Old_Product.op_title,Old_Product.selling_price,Order.o_date from Old_Product inner join `Order`' +
    ' on Old_Product.op_id=Order.op_id ' +
    'where Order.user_id=? and Order.op_id is not null';

  db.query(q1, [user_id], (err, newOrders) => {
    if (err) {
      console.error('Error fetching new orders:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    db.query(q2, [user_id], (err, oldOrders) => {
      if (err) {
        console.error('Error fetching old orders:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      res.render('orders', { newOrders: newOrders, oldOrders: oldOrders });
    });
  });


});

// order approval by seller
app.delete('/order/approve/:id', (req, res) => {
  const orderId = req.params.id;

  db.query('DELETE FROM `Order` WHERE o_id = ?', [orderId], (err) => {
    if (err) {
      console.error('Error approving order:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.redirect('/seller-dashboard');
  });
}
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});