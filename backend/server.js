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

// ============================================
// SERVER CONFIGURATION
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;     // Server port (default 3000)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'; // Secret for JWT signing

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

    // Insert user into database
    const sql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
    db.run(sql, [cleanUsername, cleanEmail, passwordHash], function(err) {
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
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Compare password with hash
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
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
 * Body: { title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year }
 */
app.post('/api/books', authenticateToken, requireAdmin, (req, res) => {
  const { title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year } = req.body;

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
    INSERT INTO books (title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    publication_year || null
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
  const { title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year } = req.body;

  const sql = `
    UPDATE books 
    SET title = ?, author = ?, isbn = ?, category_id = ?, description = ?, 
        price = ?, stock_quantity = ?, publisher = ?, publication_year = ?
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
    bookId
  ], function(err) {
    if (err) {
      console.error('Error updating book:', err.message);
      return res.status(500).json({ error: 'Failed to update book.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }

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
      db.run('INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
        [req.user.userId, totalAmount, 'pending'],
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
 * Update order status (Admin only)
 * 
 * Body: { status: 'processing' | 'shipped' | 'delivered' | 'cancelled' }
 */
app.put('/api/orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  db.run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, orderId],
    function(err) {
      if (err) {
        console.error('Error updating order status:', err.message);
        return res.status(500).json({ error: 'Failed to update order status.' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      res.json({ message: 'Order status updated successfully.' });
    }
  );
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
// STATISTICS ROUTES (Admin only)
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
