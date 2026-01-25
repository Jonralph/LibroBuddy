-- ============================================
-- SQL SCHEMA FOR LIBROBUDDY DATABASE
-- ============================================
-- This file contains the complete database schema
-- for reference purposes. The actual database is
-- created using init.js which runs these same queries.
-- ============================================

-- Enable foreign key support (SQLite specific)
PRAGMA foreign_keys = ON;

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores user account information and authentication data
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,           -- Unique username for login
  email TEXT UNIQUE NOT NULL,              -- User's email address
  password_hash TEXT NOT NULL,             -- Bcrypt hashed password
  role TEXT DEFAULT 'customer'             -- Role: customer, admin, manager, or cashier
    CHECK(role IN ('customer', 'admin', 'manager', 'cashier')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
-- Book categories for organization
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,               -- Category name (e.g., "Fiction")
  description TEXT                         -- Optional description
);

-- ============================================
-- BOOKS TABLE
-- ============================================
-- Main book inventory
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                     -- Book title
  author TEXT NOT NULL,                    -- Author name
  isbn TEXT UNIQUE NOT NULL,               -- ISBN-13 for book identification
  category_id INTEGER,                     -- Link to categories table
  description TEXT,                        -- Book description/summary
  price REAL NOT NULL CHECK(price >= 0),   -- Price in dollars
  stock_quantity INTEGER DEFAULT 0         -- Number of books in stock
    CHECK(stock_quantity >= 0),
  publisher TEXT,                          -- Publishing company
  publication_year INTEGER,                -- Year published
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ============================================
-- ORDERS TABLE
-- ============================================
-- Customer orders tracking
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,                -- Customer who placed order
  total_amount REAL NOT NULL               -- Total order cost
    CHECK(total_amount >= 0),
  status TEXT DEFAULT 'pending'            -- Order status
    CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- ORDER_ITEMS TABLE
-- ============================================
-- Individual items within each order
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,               -- Which order this belongs to
  book_id INTEGER NOT NULL,                -- Which book was purchased
  quantity INTEGER NOT NULL                -- How many copies
    CHECK(quantity > 0),
  price_at_purchase REAL NOT NULL          -- Price when purchased
    CHECK(price_at_purchase >= 0),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id)
);

-- ============================================
-- REVIEWS TABLE
-- ============================================
-- Customer reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,                -- Book being reviewed
  user_id INTEGER NOT NULL,                -- User who wrote review
  rating INTEGER NOT NULL                  -- Star rating 1-5
    CHECK(rating >= 1 AND rating <= 5),
  review_text TEXT,                        -- Optional review content
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(book_id, user_id)                 -- One review per user per book
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
-- Payment transaction records
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,               -- Associated order
  user_id INTEGER NOT NULL,                -- User who made payment
  payment_id TEXT UNIQUE NOT NULL,         -- Unique payment transaction ID
  payment_method TEXT NOT NULL,            -- Payment method (credit_card, paypal, etc.)
  amount REAL NOT NULL CHECK(amount >= 0), -- Amount paid
  currency TEXT DEFAULT 'USD',             -- Currency code
  status TEXT DEFAULT 'completed'          -- Payment status
    CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  cardholder_name TEXT,                    -- Name on card (encrypted in real app)
  last_four_digits TEXT,                   -- Last 4 digits of card (for display)
  billing_name TEXT,                       -- Billing name
  billing_email TEXT,                      -- Billing email
  billing_address TEXT,                    -- Billing address
  billing_city TEXT,                       -- City
  billing_state TEXT,                      -- State/Province
  billing_zipcode TEXT,                    -- ZIP/Postal code
  billing_country TEXT,                    -- Country
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- These indexes speed up common queries

-- Index for searching books by title or author
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);

-- Index for finding books by category
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);

-- Index for finding user's orders
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- Index for finding order items
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Index for finding book reviews
CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id);

-- Index for finding payments by order
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- Index for finding payments by user
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
