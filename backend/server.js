/**
 * LIBROBUDDY BACKEND SERVER
 * 
 * This is the main server file that handles:
 * - User authentication (login/register)
 * - Book management (CRUD operations)
 * - Order processing
 * - Review system
 * - Category management
 * 
 * Security features:
 * - Password hashing with bcrypt
 * - JWT token authentication
 * - Input validation
 * - Role-based access control (RBAC)
 */

// ============================================
// IMPORT DEPENDENCIES
// ============================================
require('dotenv').config();                // Load environment variables from .env file
const express = require('express');        // Web framework for Node.js
const sqlite3 = require('sqlite3').verbose(); // SQLite database driver
const bcrypt = require('bcrypt');          // Password hashing library
const jwt = require('jsonwebtoken');       // JSON Web Token for authentication
const cors = require('cors');              // Enable Cross-Origin Resource Sharing
const path = require('path');              // File path utilities
const crypto = require('crypto');          // Cryptographic functions for encryption

// ============================================
// SERVER CONFIGURATION
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;     // Server port (default 3000)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'; // Secret for JWT signing

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32); // 32 bytes for AES-256
const ENCRYPTION_IV_LENGTH = 16; // AES block size

// Database connection
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database/librobuddy.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('✓ Connected to LibroBuddy database');
  }
});

// Enable foreign keys in SQLite
db.run('PRAGMA foreign_keys = ON');

// Ensure audit_log table exists (for setups created without init.js)
db.run(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`, (err) => {
  if (err) {
    console.error('Error creating audit_log table:', err.message);
  }
});

// ============================================
// MIDDLEWARE
// ============================================
// Middleware are functions that run before route handlers

app.use(cors());                           // Allow requests from different origins (frontend)
app.use(express.json());                   // Parse JSON request bodies
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static frontend files

// Request logging middleware - logs all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next(); // Pass control to next middleware
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Middleware to verify JWT token and authenticate user
 * Extracts token from Authorization header and verifies it
 * Adds user data to req.user for use in route handlers
 */
function authenticateToken(req, res, next) {
  // Get token from Authorization header (format: "Bearer TOKEN")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token part

  // No token provided
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Verify token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Token is invalid or expired
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    
    // Token is valid - attach user data to request
    req.user = user;
    next(); // Continue to route handler
  });
}

/**
 * Middleware to check if user has admin role
 * Must be used after authenticateToken middleware
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

/**
 * Middleware to check if user has any of the allowed roles
 * Must be used after authenticateToken middleware
 */
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    next();
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize input to prevent XSS attacks
 * Removes potentially dangerous characters
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, ''); // Remove < and > characters
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Encrypt sensitive data (AES-256-CBC)
 */
function encryptData(text) {
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
function decryptData(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return encryptedText; // Return original if decryption fails (backward compatibility)
  }
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

/**
 * POST /api/auth/register
 * Register a new user account
 * 
 * Body: { username, email, password }
 * Returns: { message, userId }
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Sanitize inputs
    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email);

    // Validate email format
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Hash password (10 salt rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // Encrypt email for data protection
    const encryptedEmail = encryptData(cleanEmail);

    // Insert user into database
    const sql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
    db.run(sql, [cleanUsername, encryptedEmail, passwordHash], function(err) {
      if (err) {
        // Check for unique constraint violation
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Username or email already exists.' });
        }
        console.error('Registration error:', err.message);
        return res.status(500).json({ error: 'Registration failed.' });
      }

      // Success - user created
      res.status(201).json({
        message: 'User registered successfully.',
        userId: this.lastID
      });
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 * 
 * Body: { username, password }
 * Returns: { token, user: { id, username, email, role } }
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Find user in database
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [sanitizeInput(username)], async (err, user) => {
      if (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ error: 'Login failed.' });
      }

      // User not found or password incorrect
      // Use generic message to prevent user enumeration
      if (!user) {
        logAudit(null, 'LOGIN_FAILED', { username, reason: 'User not found' }, req.ip);
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Compare password with hash
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        logAudit(user.id, 'LOGIN_FAILED', { username, reason: 'Invalid password' }, req.ip);
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Generate JWT token (expires in 24 hours)
      const token = jwt.sign(
        { 
          userId: user.id,
          username: user.username,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log successful login
      logAudit(user.id, 'LOGIN_SUCCESS', { username: user.username }, req.ip);

      // Return token and user info (without password hash)
      res.json({
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ============================================
// BOOK ROUTES
// ============================================

/**
 * GET /api/books
 * Get all books with optional filtering
 * 
 * Query params: ?category=1&search=gatsby
 * Returns: Array of books
 */
app.get('/api/books', (req, res) => {
  const { category, search } = req.query;
  
  let sql = `
    SELECT books.*, categories.name as category_name 
    FROM books 
    LEFT JOIN categories ON books.category_id = categories.id 
    WHERE 1=1
  `;
  const params = [];

  // Filter by category if provided
  if (category) {
    sql += ' AND books.category_id = ?';
    params.push(category);
  }

  // Search by title or author if provided
  if (search) {
    sql += ' AND (books.title LIKE ? OR books.author LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  sql += ' ORDER BY books.title';

  // Execute query
  db.all(sql, params, (err, books) => {
    if (err) {
      console.error('Error fetching books:', err.message);
      return res.status(500).json({ error: 'Failed to fetch books.' });
    }
    res.json(books);
  });
});

/**
 * GET /api/books/:id
 * Get single book by ID with reviews
 * 
 * Returns: Book object with reviews array
 */
app.get('/api/books/:id', (req, res) => {
  const bookId = req.params.id;

  // Get book details
  const bookSql = `
    SELECT books.*, categories.name as category_name 
    FROM books 
    LEFT JOIN categories ON books.category_id = categories.id 
    WHERE books.id = ?
  `;

  db.get(bookSql, [bookId], (err, book) => {
    if (err) {
      console.error('Error fetching book:', err.message);
      return res.status(500).json({ error: 'Failed to fetch book.' });
    }

    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    // Get reviews for this book
    const reviewsSql = `
      SELECT reviews.*, users.username 
      FROM reviews 
      JOIN users ON reviews.user_id = users.id 
      WHERE reviews.book_id = ? 
      ORDER BY reviews.created_at DESC
    `;

    db.all(reviewsSql, [bookId], (err, reviews) => {
      if (err) {
        console.error('Error fetching reviews:', err.message);
        reviews = []; // Continue without reviews if error
      }

      // Attach reviews to book object
      book.reviews = reviews;
      res.json(book);
    });
  });
});

/**
 * POST /api/books
 * Create new book (Admin only)
 * 
 * Requires authentication and admin role
 * Body: { title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year, image_url }
 */
app.post('/api/books', authenticateToken, requireAdmin, (req, res) => {
  const { title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year, image_url } = req.body;

  // Validate required fields
  if (!title || !author || !isbn || !price) {
    return res.status(400).json({ error: 'Title, author, ISBN, and price are required.' });
  }

  // Validate price and stock are non-negative
  if (price < 0 || (stock_quantity && stock_quantity < 0)) {
    return res.status(400).json({ error: 'Price and stock quantity must be non-negative.' });
  }

  // Insert book
  const sql = `
    INSERT INTO books (title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    sanitizeInput(title),
    sanitizeInput(author),
    sanitizeInput(isbn),
    category_id || null,
    sanitizeInput(description),
    price,
    stock_quantity || 0,
    sanitizeInput(publisher),
    publication_year || null,
    sanitizeInput(image_url) || null
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Book with this ISBN already exists.' });
      }
      console.error('Error creating book:', err.message);
      return res.status(500).json({ error: 'Failed to create book.' });
    }

    res.status(201).json({
      message: 'Book created successfully.',
      bookId: this.lastID
    });
  });
});

/**
 * PUT /api/books/:id
 * Update existing book (Admin only)
 */
app.put('/api/books/:id', authenticateToken, requireAdmin, (req, res) => {
  const bookId = req.params.id;
  const { title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year, image_url } = req.body;

  const sql = `
    UPDATE books 
    SET title = ?, author = ?, isbn = ?, category_id = ?, description = ?, 
        price = ?, stock_quantity = ?, publisher = ?, publication_year = ?, image_url = ?
    WHERE id = ?
  `;

  db.run(sql, [
    sanitizeInput(title),
    sanitizeInput(author),
    sanitizeInput(isbn),
    category_id,
    sanitizeInput(description),
    price,
    stock_quantity,
    sanitizeInput(publisher),
    publication_year,
    sanitizeInput(image_url) || null,
    bookId
  ], function(err) {
    if (err) {
      console.error('Error updating book:', err.message);
      return res.status(500).json({ error: 'Failed to update book.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    // Log book update
    logAudit(req.user.userId, 'BOOK_UPDATED', { book_id: bookId, title, stock_quantity }, req.ip);

    res.json({ message: 'Book updated successfully.' });
  });
});

/**
 * DELETE /api/books/:id
 * Delete book (Admin only)
 */
app.delete('/api/books/:id', authenticateToken, requireAdmin, (req, res) => {
  const bookId = req.params.id;

  db.run('DELETE FROM books WHERE id = ?', [bookId], function(err) {
    if (err) {
      console.error('Error deleting book:', err.message);
      return res.status(500).json({ error: 'Failed to delete book.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    // Log book deletion
    logAudit(req.user.userId, 'BOOK_DELETED', { book_id: bookId }, req.ip);

    res.json({ message: 'Book deleted successfully.' });
  });
});

// ============================================
// CATEGORY ROUTES
// ============================================

/**
 * GET /api/categories
 * Get all categories
 */
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', (err, categories) => {
    if (err) {
      console.error('Error fetching categories:', err.message);
      return res.status(500).json({ error: 'Failed to fetch categories.' });
    }
    res.json(categories);
  });
});

/**
 * POST /api/categories
 * Create new category (Admin only)
 */
app.post('/api/categories', authenticateToken, requireAdmin, (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  db.run('INSERT INTO categories (name, description) VALUES (?, ?)', 
    [sanitizeInput(name), sanitizeInput(description)], 
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Category already exists.' });
        }
        console.error('Error creating category:', err.message);
        return res.status(500).json({ error: 'Failed to create category.' });
      }

      res.status(201).json({
        message: 'Category created successfully.',
        categoryId: this.lastID
      });
    }
  );
});

// ============================================
// ORDER ROUTES
// ============================================

/**
 * GET /api/orders
 * Get user's orders (or all orders if admin)
 */
app.get('/api/orders', authenticateToken, (req, res) => {
  let sql = `
    SELECT orders.*, users.username 
    FROM orders 
    JOIN users ON orders.user_id = users.id
  `;
  const params = [];

  // Non-admin users can only see their own orders
  if (req.user.role !== 'admin') {
    sql += ' WHERE orders.user_id = ?';
    params.push(req.user.userId);
  }

  sql += ' ORDER BY orders.created_at DESC';

  db.all(sql, params, (err, orders) => {
    if (err) {
      console.error('Error fetching orders:', err.message);
      return res.status(500).json({ error: 'Failed to fetch orders.' });
    }
    res.json(orders);
  });
});

/**
 * GET /api/orders/all
 * Get all orders (admin and cashier only)
 */
app.get('/api/orders/all', authenticateToken, checkRole(['admin', 'cashier']), (req, res) => {
  const sql = `
    SELECT orders.*, users.username 
    FROM orders 
    JOIN users ON orders.user_id = users.id
    ORDER BY orders.created_at DESC
  `;

  db.all(sql, [], (err, orders) => {
    if (err) {
      console.error('Error fetching all orders:', err.message);
      return res.status(500).json({ error: 'Failed to fetch orders.' });
    }
    res.json(orders);
  });
});

/**
 * GET /api/orders/:id
 * Get order details with items
 */
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;

  // Get order
  let orderSql = 'SELECT * FROM orders WHERE id = ?';
  const orderParams = [orderId];

  // Non-admin users can only see their own orders
  if (req.user.role !== 'admin') {
    orderSql += ' AND user_id = ?';
    orderParams.push(req.user.userId);
  }

  db.get(orderSql, orderParams, (err, order) => {
    if (err) {
      console.error('Error fetching order:', err.message);
      return res.status(500).json({ error: 'Failed to fetch order.' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Get order items
    const itemsSql = `
      SELECT order_items.*, books.title, books.author 
      FROM order_items 
      JOIN books ON order_items.book_id = books.id 
      WHERE order_items.order_id = ?
    `;

    db.all(itemsSql, [orderId], (err, items) => {
      if (err) {
        console.error('Error fetching order items:', err.message);
        items = [];
      }

      order.items = items;
      res.json(order);
    });
  });
});

/**
 * POST /api/orders
 * Create new order
 * 
 * Body: { items: [{ book_id, quantity }] }
 * 
 * This implements atomic transaction to ensure:
 * - Stock is available
 * - Stock is decremented
 * - Order and items are created
 * All happens or nothing happens (no partial orders)
 */
app.post('/api/orders', authenticateToken, (req, res) => {
  const { items } = req.body;

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  // Begin transaction
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to start transaction.' });
    }

    let totalAmount = 0;
    let processedItems = [];

    // Process each item
    let itemsProcessed = 0;
    
    items.forEach((item, index) => {
      const { book_id, quantity } = item;

      // Validate item
      if (!book_id || !quantity || quantity <= 0) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Invalid item data.' });
      }

      // Get book and check stock
      db.get('SELECT * FROM books WHERE id = ?', [book_id], (err, book) => {
        if (err || !book) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: `Book ${book_id} not found.` });
        }

        // Check stock availability
        if (book.stock_quantity < quantity) {
          db.run('ROLLBACK');
          return res.status(400).json({ 
            error: `Insufficient stock for "${book.title}". Available: ${book.stock_quantity}` 
          });
        }

        // Update stock
        db.run('UPDATE books SET stock_quantity = stock_quantity - ? WHERE id = ?', 
          [quantity, book_id], 
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to update stock.' });
            }

            // Calculate item total
            const itemTotal = book.price * quantity;
            totalAmount += itemTotal;

            processedItems.push({
              book_id: book.id,
              quantity: quantity,
              price_at_purchase: book.price
            });

            itemsProcessed++;

            // All items processed - create order
            if (itemsProcessed === items.length) {
              createOrder();
            }
          }
        );
      });
    });

    // Create order after all items validated
    function createOrder() {
      // If user is a cashier, track employee_id
      const employee_id = (req.user.role === 'cashier' || req.user.role === 'admin') ? req.user.userId : null;
      
      db.run('INSERT INTO orders (user_id, employee_id, total_amount, status) VALUES (?, ?, ?, ?)',
        [req.user.userId, employee_id, totalAmount, 'pending'],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create order.' });
          }

          const orderId = this.lastID;

          // Insert order items
          let itemsInserted = 0;
          processedItems.forEach(item => {
            db.run('INSERT INTO order_items (order_id, book_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
              [orderId, item.book_id, item.quantity, item.price_at_purchase],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to create order items.' });
                }

                itemsInserted++;

                // All items inserted - commit transaction
                if (itemsInserted === processedItems.length) {
                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Failed to complete order.' });
                    }

                    // Log order creation
                    logAudit(req.user.userId, 'ORDER_CREATED', { order_id: orderId, total_amount: totalAmount, items: processedItems.length }, req.ip);

                    res.status(201).json({
                      message: 'Order created successfully.',
                      orderId: orderId,
                      totalAmount: totalAmount
                    });
                  });
                }
              }
            );
          });
        }
      );
    }
  });
});

/**
 * PUT /api/orders/:id/status
 * Update order status (Admin/Cashier only)
 * 
 * Body: { status: 'processing' | 'shipped' | 'delivered' | 'cancelled' }
 */
app.put('/api/orders/:id/status', authenticateToken, checkRole(['admin', 'cashier']), (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  db.serialize(() => {
    db.get('SELECT id, status FROM orders WHERE id = ?', [orderId], (err, order) => {
      if (err) {
        console.error('Error fetching order:', err.message);
        return res.status(500).json({ error: 'Failed to update order status.' });
      }
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      db.run('BEGIN TRANSACTION');

      db.run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, orderId],
        function(updateErr) {
          if (updateErr) {
            db.run('ROLLBACK');
            console.error('Error updating order status:', updateErr.message);
            return res.status(500).json({ error: 'Failed to update order status.' });
          }

          const shouldRestock = status === 'cancelled' && order.status !== 'cancelled';
          if (!shouldRestock) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to update order status.' });
              }
              return res.json({ message: 'Order status updated successfully.' });
            });
            return;
          }

          db.all('SELECT book_id, quantity FROM order_items WHERE order_id = ?', [orderId], (itemsErr, items) => {
            if (itemsErr) {
              db.run('ROLLBACK');
              console.error('Error fetching order items:', itemsErr.message);
              return res.status(500).json({ error: 'Failed to update order status.' });
            }

            if (items.length === 0) {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to update order status.' });
                }
                return res.json({ message: 'Order status updated successfully.' });
              });
              return;
            }

            let updated = 0;
            items.forEach(item => {
              db.run(
                'UPDATE books SET stock_quantity = stock_quantity + ? WHERE id = ?',
                [item.quantity, item.book_id],
                (stockErr) => {
                  if (stockErr) {
                    db.run('ROLLBACK');
                    console.error('Error restocking book:', stockErr.message);
                    return res.status(500).json({ error: 'Failed to update order status.' });
                  }

                  updated += 1;
                  if (updated === items.length) {
                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to update order status.' });
                      }
                      res.json({ message: 'Order status updated successfully.' });
                    });
                  }
                }
              );
            });
          });
        }
      );
    });
  });
});

// ============================================
// REVIEW ROUTES
// ============================================

/**
 * POST /api/reviews
 * Create book review
 * 
 * Body: { book_id, rating, review_text }
 */
app.post('/api/reviews', authenticateToken, (req, res) => {
  const { book_id, rating, review_text } = req.body;

  // Validate input
  if (!book_id || !rating) {
    return res.status(400).json({ error: 'Book ID and rating are required.' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  // Insert review
  db.run('INSERT INTO reviews (book_id, user_id, rating, review_text) VALUES (?, ?, ?, ?)',
    [book_id, req.user.userId, rating, sanitizeInput(review_text)],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'You have already reviewed this book.' });
        }
        console.error('Error creating review:', err.message);
        return res.status(500).json({ error: 'Failed to create review.' });
      }

      res.status(201).json({
        message: 'Review created successfully.',
        reviewId: this.lastID
      });
    }
  );
});

/**
 * DELETE /api/reviews/:id
 * Delete review (own reviews only, or admin)
 */
app.delete('/api/reviews/:id', authenticateToken, (req, res) => {
  const reviewId = req.params.id;

  // Check if review belongs to user (unless admin)
  let sql = 'DELETE FROM reviews WHERE id = ?';
  const params = [reviewId];

  if (req.user.role !== 'admin') {
    sql += ' AND user_id = ?';
    params.push(req.user.userId);
  }

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error deleting review:', err.message);
      return res.status(500).json({ error: 'Failed to delete review.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Review not found or unauthorized.' });
    }

    res.json({ message: 'Review deleted successfully.' });
  });
});

// ============================================
// SUPPLIER ORDERING ROUTES (Admin only)
// ============================================

/**
 * GET /api/suppliers
 * Get all suppliers
 */
app.get('/api/suppliers', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM suppliers ORDER BY name', (err, suppliers) => {
    if (err) {
      console.error('Error fetching suppliers:', err.message);
      return res.status(500).json({ error: 'Failed to fetch suppliers.' });
    }
    res.json(suppliers);
  });
});

/**
 * GET /api/supplier-orders
 * Get all supplier orders
 */
app.get('/api/supplier-orders', authenticateToken, requireAdmin, (req, res) => {
  const sql = `
    SELECT supplier_orders.*, books.title, books.author, suppliers.name as supplier_name
    FROM supplier_orders
    JOIN books ON supplier_orders.book_id = books.id
    JOIN suppliers ON supplier_orders.supplier_id = suppliers.id
    ORDER BY supplier_orders.created_at DESC
  `;
  db.all(sql, (err, orders) => {
    if (err) {
      console.error('Error fetching supplier orders:', err.message);
      return res.status(500).json({ error: 'Failed to fetch supplier orders.' });
    }
    res.json(orders);
  });
});

/**
 * POST /api/supplier-orders
 * Create a new supplier order
 */
app.post('/api/supplier-orders', authenticateToken, requireAdmin, (req, res) => {
  const { book_id, supplier_id, quantity, expected_delivery } = req.body;
  
  if (!book_id || !supplier_id || !quantity) {
    return res.status(400).json({ error: 'Book, supplier, and quantity are required.' });
  }

  const sql = 'INSERT INTO supplier_orders (book_id, supplier_id, quantity, expected_delivery) VALUES (?, ?, ?, ?)';
  db.run(sql, [book_id, supplier_id, quantity, expected_delivery], function(err) {
    if (err) {
      console.error('Error creating supplier order:', err.message);
      return res.status(500).json({ error: 'Failed to create supplier order.' });
    }
    res.status(201).json({ message: 'Supplier order created successfully.', orderId: this.lastID });
  });
});

/**
 * PUT /api/supplier-orders/:id/status
 * Update supplier order status (and update stock when received)
 */
app.put('/api/supplier-orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!['Pending', 'Shipped', 'Received', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  // Get order details first
  db.get('SELECT * FROM supplier_orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Supplier order not found.' });
    }

    // Update order status
    db.run('UPDATE supplier_orders SET status = ? WHERE id = ?', [status, orderId], function(err) {
      if (err) {
        console.error('Error updating supplier order:', err.message);
        return res.status(500).json({ error: 'Failed to update supplier order.' });
      }

      // If status is 'Received', increase book stock
      if (status === 'Received' && order.status !== 'Received') {
        db.run('UPDATE books SET stock_quantity = stock_quantity + ? WHERE id = ?', [order.quantity, order.book_id], (err) => {
          if (err) {
            console.error('Error updating stock:', err.message);
          }
          // Log inventory update
          logAudit(req.user.userId, 'INVENTORY_UPDATED', { 
            book_id: order.book_id, 
            quantity_added: order.quantity, 
            supplier_order_id: orderId 
          }, req.ip);
        });
      }

      // Log supplier order status change
      logAudit(req.user.userId, 'SUPPLIER_ORDER_UPDATED', { order_id: orderId, new_status: status }, req.ip);

      res.json({ message: 'Supplier order updated successfully.' });
    });
  });
});

/**
 * GET /api/books-below-threshold
 * Get books below reorder threshold
 */
app.get('/api/books-below-threshold', authenticateToken, requireAdmin, (req, res) => {
  const sql = `
    SELECT * FROM books 
    WHERE stock_quantity <= reorder_threshold 
    ORDER BY stock_quantity ASC
  `;
  db.all(sql, (err, books) => {
    if (err) {
      console.error('Error fetching books below threshold:', err.message);
      return res.status(500).json({ error: 'Failed to fetch books.' });
    }
    res.json(books);
  });
});

// ============================================
// STATISTICS ROUTES (Admin and Cashier)

/**
 * GET /api/sales-report
 * Get sales report (optionally filtered by date range)
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD), format=csv (optional)
 * Admin and Cashier access
 */
app.get('/api/sales-report', authenticateToken, checkRole(['admin', 'cashier']), (req, res) => {
  let { start, end, format } = req.query;
  let params = [];
  let where = 'WHERE orders.status != "cancelled"';
  if (start) {
    where += ' AND DATE(orders.created_at) >= ?';
    params.push(start);
  }
  if (end) {
    where += ' AND DATE(orders.created_at) <= ?';
    params.push(end);
  }
  const sql = `
    SELECT orders.id, orders.created_at, users.username, orders.total_amount, orders.status
    FROM orders
    JOIN users ON orders.user_id = users.id
    ${where}
    ORDER BY orders.created_at DESC
  `;
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching sales report:', err.message);
      return res.status(500).json({ error: 'Failed to fetch sales report.' });
    }
    if (format === 'csv') {
      // Export as CSV
      let csv = 'Order ID,Date,Username,Total Amount,Status\n';
      rows.forEach(r => {
        csv += `${r.id},${r.created_at},${r.username},${r.total_amount},${r.status}\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
      return res.send(csv);
    }
    
    // Calculate summary statistics
    const totalSales = rows.reduce((sum, row) => sum + row.total_amount, 0);
    const totalOrders = rows.length;
    
    // Return formatted response with orders and summary
    res.json({
      orders: rows,
      total_sales: totalSales,
      total_orders: totalOrders
    });
  });
});
// ============================================

/**
 * GET /api/stats
 * Get system statistics
 */
app.get('/api/stats', authenticateToken, requireAdmin, (req, res) => {
  const stats = {};

  // Get total books
  db.get('SELECT COUNT(*) as count FROM books', (err, result) => {
    if (!err) stats.totalBooks = result.count;

    // Get total users
    db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
      if (!err) stats.totalUsers = result.count;

      // Get total orders
      db.get('SELECT COUNT(*) as count FROM orders', (err, result) => {
        if (!err) stats.totalOrders = result.count;

        // Get total revenue
        db.get('SELECT SUM(total_amount) as revenue FROM orders WHERE status != "cancelled"', (err, result) => {
          if (!err) stats.totalRevenue = result.revenue || 0;

          // Get low stock books
          db.all('SELECT * FROM books WHERE stock_quantity < 5 ORDER BY stock_quantity', (err, books) => {
            if (!err) stats.lowStockBooks = books;

            res.json(stats);
          });
        });
      });
    });
  });
});

// ============================================
// ROOT ROUTE - Serve frontend
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================
// PAYMENT GATEWAY & CONFIRMATION EMAIL (MOCK)
// ============================================

// Mock payment endpoint
app.post('/api/process-payment', authenticateToken, async (req, res) => {
  const { order_id, payment_method, card_number, card_expiry, card_cvv } = req.body;

  // Basic validation
  if (!order_id || !payment_method) {
    return res.status(400).json({ error: 'Order ID and payment method are required' });
  }

  // Mock payment processing (in real app, integrate Stripe/PayPal)
  if (payment_method === 'credit_card') {
    if (!card_number || !card_expiry || !card_cvv) {
      return res.status(400).json({ error: 'Credit card details are required' });
    }
    // Validate card number (mock - just check length)
    if (card_number.length < 13 || card_number.length > 19) {
      return res.status(400).json({ error: 'Invalid card number' });
    }
  }

  // Mock successful payment
  const payment_id = 'PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const transaction_date = new Date().toISOString();

  // Update order status to 'Confirmed'
  const updateQuery = `UPDATE orders SET status = 'Confirmed' WHERE id = ?`;
  db.run(updateQuery, [order_id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update order status' });

    // Get order details for confirmation email
    const orderQuery = `
      SELECT o.id, o.total_amount as total_price, u.username, u.email,
             GROUP_CONCAT(b.title || ' x ' || oi.quantity, ', ') as items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN books b ON oi.book_id = b.id
      WHERE o.id = ?
      GROUP BY o.id
    `;
    
    db.get(orderQuery, [order_id], (err, order) => {
      if (err || !order) {
        return res.status(500).json({ error: 'Failed to fetch order details' });
      }

      // Mock sending confirmation email (log to console)
      const confirmationEmail = {
        to: order.email,
        subject: 'Order Confirmation - LibroBuddy',
        body: `
          Dear ${order.username},
          
          Thank you for your order! Your payment has been processed successfully.
          
          Order ID: ${order.id}
          Payment ID: ${payment_id}
          Total: $${order.total_price.toFixed(2)}
          Items: ${order.items}
          
          Your order will be processed shortly.
          
          Best regards,
          LibroBuddy Team
        `
      };

      console.log('\n========== CONFIRMATION EMAIL ==========');
      console.log(`To: ${confirmationEmail.to}`);
      console.log(`Subject: ${confirmationEmail.subject}`);
      console.log(`Body: ${confirmationEmail.body}`);
      console.log('=========================================\n');

      // Return payment confirmation
      res.json({
        success: true,
        payment_id,
        transaction_date,
        message: 'Payment processed successfully. Confirmation email sent.',
        order
      });
    });
  });
});

// ============================================
// AUDIT LOG MODULE
// ============================================

// Log audit entry
function logAudit(user_id, action, details, ip_address) {
  const query = `INSERT INTO audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`;
  db.run(query, [user_id, action, JSON.stringify(details), ip_address], (err) => {
    if (err) console.error('Audit log error:', err.message);
  });
}

// Get audit logs (admin only)
app.get('/api/audit-logs', authenticateToken, requireAdmin, (req, res) => {
  const { start, end, user_id, action } = req.query;
  let params = [];
  let where = [];

  if (start) {
    where.push('DATE(created_at) >= ?');
    params.push(start);
  }
  if (end) {
    where.push('DATE(created_at) <= ?');
    params.push(end);
  }
  if (user_id) {
    where.push('user_id = ?');
    params.push(user_id);
  }
  if (action) {
    where.push('action LIKE ?');
    params.push(`%${action}%`);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const query = `
    SELECT a.*, u.username 
    FROM audit_log a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT 500
  `;

  db.all(query, params, (err, logs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(logs);
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ============================================
// START SERVER
// ============================================
// Listen on 0.0.0.0 to allow connections from outside the container
// This is necessary for dev containers, Codespaces, and Docker environments
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log(`✓ LibroBuddy server running on port ${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
  console.log(`✓ Frontend available at http://localhost:${PORT}`);
  console.log(`✓ Server accessible from all network interfaces`);
  console.log('========================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n✓ Database connection closed');
    }
    process.exit(0);
  });
});
