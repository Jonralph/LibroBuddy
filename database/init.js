/**
 * DATABASE INITIALIZATION SCRIPT
 * 
 * This script creates the SQLite database and all necessary tables
 * for the LibroBuddy online library system.
 * 
 * Tables created:
 * - users: Stores user account information (username, email, hashed password, role)
 * - categories: Book categories (Fiction, Non-Fiction, Science, etc.)
 * - books: Main book inventory (title, author, ISBN, price, stock quantity)
 * - orders: Customer orders with status tracking
 * - order_items: Individual items within each order
 * - reviews: Book reviews and ratings from customers
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Database file path
const dbPath = path.join(__dirname, 'librobuddy.db');

// Create connection to SQLite database
// If file doesn't exist, it will be created automatically
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('✓ Connected to SQLite database');
  }
});

// Enable foreign key constraints (not enabled by default in SQLite)
db.run('PRAGMA foreign_keys = ON');

/**
 * Initialize all database tables
 * This function runs in sequence to ensure proper table creation
 */
function initializeDatabase() {
  // Wrap everything in serialize to ensure sequential execution
  db.serialize(() => {
    
    // ============================================
    // USERS TABLE
    // ============================================
    // Stores user authentication and profile data
    // Roles: 'customer', 'admin', 'manager'
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin', 'manager')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('✓ Users table created/verified');
      }
    });

    // ============================================
    // CATEGORIES TABLE
    // ============================================
    // Organizes books into categories (Fiction, Science, History, etc.)
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating categories table:', err.message);
      } else {
        console.log('✓ Categories table created/verified');
      }
    });

    // ============================================
    // BOOKS TABLE
    // ============================================
    // Main inventory table with book details, pricing, and stock
    db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT UNIQUE NOT NULL,
        category_id INTEGER,
        description TEXT,
        price REAL NOT NULL CHECK(price >= 0),
        stock_quantity INTEGER DEFAULT 0 CHECK(stock_quantity >= 0),
        publisher TEXT,
        publication_year INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating books table:', err.message);
      } else {
        console.log('✓ Books table created/verified');
      }
    });

    // ============================================
    // ORDERS TABLE
    // ============================================
    // Tracks customer orders with status and totals
    // Status values: 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL CHECK(total_amount >= 0),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating orders table:', err.message);
      } else {
        console.log('✓ Orders table created/verified');
      }
    });

    // ============================================
    // ORDER_ITEMS TABLE
    // ============================================
    // Links orders to specific books with quantities and prices
    // This allows one order to contain multiple books
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        price_at_purchase REAL NOT NULL CHECK(price_at_purchase >= 0),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating order_items table:', err.message);
      } else {
        console.log('✓ Order items table created/verified');
      }
    });

    // ============================================
    // REVIEWS TABLE
    // ============================================
    // Customer reviews and ratings for books
    // Rating is 1-5 stars
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        review_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(book_id, user_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating reviews table:', err.message);
      } else {
        console.log('✓ Reviews table created/verified');
      }
    });

    // ============================================
    // SEED DATA - Create sample data for testing
    // ============================================
    
    // Create default admin user
    // Password: "admin123" (hashed with bcrypt)
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password_hash, role)
      VALUES ('admin', 'admin@librobuddy.com', ?, 'admin')
    `, [adminPassword], (err) => {
      if (err) {
        console.error('Error creating admin user:', err.message);
      } else {
        console.log('✓ Admin user created (username: admin, password: admin123)');
      }
    });

    // Create sample customer
    // Password: "customer123"
    const customerPassword = bcrypt.hashSync('customer123', 10);
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password_hash, role)
      VALUES ('johndoe', 'john@example.com', ?, 'customer')
    `, [customerPassword], (err) => {
      if (err) {
        console.error('Error creating sample customer:', err.message);
      } else {
        console.log('✓ Sample customer created (username: johndoe, password: customer123)');
      }
    });

    // Insert sample categories
    const categories = [
      ['Fiction', 'Fictional stories and novels'],
      ['Non-Fiction', 'Educational and factual books'],
      ['Science', 'Scientific literature and research'],
      ['History', 'Historical accounts and biographies'],
      ['Technology', 'Programming, computers, and tech'],
      ['Mystery', 'Mystery and thriller novels']
    ];

    const categoryStmt = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
    categories.forEach(cat => {
      categoryStmt.run(cat);
    });
    categoryStmt.finalize(() => {
      console.log('✓ Sample categories added');
    });

    // Insert sample books
    const books = [
      ['The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 1, 'A classic American novel', 12.99, 25, 'Scribner', 1925],
      ['To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 1, 'A gripping tale of racial injustice', 14.99, 30, 'HarperCollins', 1960],
      ['1984', 'George Orwell', '978-0451524935', 1, 'Dystopian social science fiction', 13.99, 40, 'Signet Classic', 1949],
      ['Sapiens', 'Yuval Noah Harari', '978-0062316097', 2, 'A brief history of humankind', 18.99, 20, 'Harper', 2015],
      ['Educated', 'Tara Westover', '978-0399590504', 2, 'A memoir about education and self-invention', 16.99, 15, 'Random House', 2018],
      ['A Brief History of Time', 'Stephen Hawking', '978-0553380163', 3, 'Cosmology and physics explained', 15.99, 18, 'Bantam', 1988],
      ['The Selfish Gene', 'Richard Dawkins', '978-0198788607', 3, 'Gene-centered view of evolution', 14.99, 22, 'Oxford University Press', 1976],
      ['The Diary of Anne Frank', 'Anne Frank', '978-0553296983', 4, 'WWII diary of a Jewish girl in hiding', 11.99, 35, 'Bantam', 1947],
      ['Clean Code', 'Robert Martin', '978-0132350884', 5, 'A handbook of agile software craftsmanship', 42.99, 12, 'Prentice Hall', 2008],
      ['The Da Vinci Code', 'Dan Brown', '978-0307474278', 6, 'Mystery thriller about religious conspiracy', 15.99, 28, 'Anchor', 2003]
    ];

    const bookStmt = db.prepare(`
      INSERT OR IGNORE INTO books (title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    books.forEach(book => {
      bookStmt.run(book);
    });
    bookStmt.finalize(() => {
      console.log('✓ Sample books added to inventory');
    });

    // Insert sample reviews
    const reviews = [
      [1, 2, 5, 'An absolute masterpiece! A must-read classic.'],
      [2, 2, 5, 'Powerful and moving story that everyone should read.'],
      [3, 2, 4, 'Chilling and thought-provoking. Very relevant today.'],
      [4, 2, 5, 'Mind-blowing perspective on human history!'],
      [9, 2, 5, 'Every developer should read this book. Life-changing!']
    ];

    const reviewStmt = db.prepare('INSERT OR IGNORE INTO reviews (book_id, user_id, rating, review_text) VALUES (?, ?, ?, ?)');
    reviews.forEach(review => {
      reviewStmt.run(review);
    });
    reviewStmt.finalize(() => {
      console.log('✓ Sample reviews added');
      console.log('\n========================================');
      console.log('Database initialization complete!');
      console.log('========================================\n');
    });
  });
}

// Run the initialization
initializeDatabase();

// Close database connection after all operations complete
db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('✓ Database connection closed');
  }
});
