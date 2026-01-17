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
      // ============================================
      // SUPPLIERS TABLE
      // ============================================
      db.run(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact_email TEXT,
          contact_phone TEXT,
          address TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating suppliers table:', err.message);
        } else {
          console.log('✓ Suppliers table created/verified');
        }
      });

      // ============================================
      // AUDIT LOG TABLE
      // ============================================
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
        } else {
          console.log('✓ Audit log table created/verified');
        }
      });

      // ============================================
      // SUPPLIER ORDERS TABLE
      // ============================================
      db.run(`
        CREATE TABLE IF NOT EXISTS supplier_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          supplier_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Shipped', 'Received', 'Cancelled')),
          expected_delivery DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES books(id),
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating supplier_orders table:', err.message);
        } else {
          console.log('✓ Supplier orders table created/verified');
        }
      });
  // Wrap everything in serialize to ensure sequential execution
  db.serialize(() => {
    
    // ============================================
    // USERS TABLE
    // ============================================
    // Stores user authentication and profile data
    // Roles: 'customer', 'admin', 'manager', 'cashier'
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin', 'manager', 'cashier')),
        employee_id TEXT,
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
        reorder_threshold INTEGER DEFAULT 5 CHECK(reorder_threshold >= 0),
        publisher TEXT,
        publication_year INTEGER,
        image_url TEXT,
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
        employee_id INTEGER,
        total_amount REAL NOT NULL CHECK(total_amount >= 0),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (employee_id) REFERENCES users(id)
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

    // Create cashier user
    // Password: "cashier123"
    const cashierPassword = bcrypt.hashSync('cashier123', 10);
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password_hash, role, employee_id)
      VALUES ('cashier', 'cashier@librobuddy.com', ?, 'cashier', 'EMP001')
    `, [cashierPassword], (err) => {
      if (err) {
        console.error('Error creating cashier user:', err.message);
      } else {
        console.log('✓ Cashier user created (username: cashier, password: cashier123)');
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

    // Insert sample suppliers
    const suppliers = [
      ['Book Distributors Inc.', 'contact@bookdistributors.com', '555-1234', '123 Main St, City'],
      ['Rare Books Ltd.', 'info@rarebooksltd.com', '555-5678', '456 Elm St, City']
    ];
    const supplierStmt = db.prepare('INSERT OR IGNORE INTO suppliers (name, contact_email, contact_phone, address) VALUES (?, ?, ?, ?)');
    suppliers.forEach(supplier => {
      supplierStmt.run(supplier);
    });
    supplierStmt.finalize(() => {
      console.log('✓ Sample suppliers added');
    });

    // Insert sample books
    const books = [
      ['The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 1, 'A classic American novel', 12.99, 25, 'Scribner', 1925, 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg'],
      ['To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 1, 'A gripping tale of racial injustice', 14.99, 30, 'HarperCollins', 1960, 'https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg'],
      ['1984', 'George Orwell', '978-0451524935', 1, 'Dystopian social science fiction', 13.99, 40, 'Signet Classic', 1949, 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg'],
      ['Sapiens', 'Yuval Noah Harari', '978-0062316097', 2, 'A brief history of humankind', 18.99, 20, 'Harper', 2015, 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg'],
      ['Educated', 'Tara Westover', '978-0399590504', 2, 'A memoir about education and self-invention', 16.99, 15, 'Random House', 2018, 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg'],
      ['A Brief History of Time', 'Stephen Hawking', '978-0553380163', 3, 'Cosmology and physics explained', 15.99, 18, 'Bantam', 1988, 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg'],
      ['The Selfish Gene', 'Richard Dawkins', '978-0198788607', 3, 'Gene-centered view of evolution', 14.99, 22, 'Oxford University Press', 1976, 'https://covers.openlibrary.org/b/isbn/9780198788607-L.jpg'],
      ['The Diary of Anne Frank', 'Anne Frank', '978-0553296983', 4, 'WWII diary of a Jewish girl in hiding', 11.99, 35, 'Bantam', 1947, 'https://covers.openlibrary.org/b/isbn/9780553296983-L.jpg'],
      ['Clean Code', 'Robert Martin', '978-0132350884', 5, 'A handbook of agile software craftsmanship', 42.99, 12, 'Prentice Hall', 2008, 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg'],
      ['The Da Vinci Code', 'Dan Brown', '978-0307474278', 6, 'Mystery thriller about religious conspiracy', 15.99, 28, 'Anchor', 2003, 'https://covers.openlibrary.org/b/isbn/9780307474278-L.jpg']
      // Rare or less common books
      // Uncommon but real books with actual cover images
      ,['The Master and Margarita', 'Mikhail Bulgakov', '978-0679760801', 1, 'A fantastical and satirical novel set in Soviet Russia.', 16.99, 7, 'Vintage', 1967, 'https://ia800100.us.archive.org/view_archive.php?archive=/5/items/l_covers_0012/l_covers_0012_62.zip&file=0012627518-L.jpg']
      ,['The Wind-Up Bird Chronicle', 'Haruki Murakami', '978-0679775433', 1, 'A surreal mystery blending reality and fantasy.', 17.99, 5, 'Vintage', 1997, 'https://ia800100.us.archive.org/view_archive.php?archive=/5/items/l_covers_0012/l_covers_0012_97.zip&file=0012976127-L.jpg']
      ,['The Dispossessed', 'Ursula K. Le Guin', '978-0060512750', 1, 'A philosophical science fiction classic.', 15.99, 6, 'Harper Perennial', 1974, 'https://covers.openlibrary.org/b/isbn/9780060512750-L.jpg']
      ,['The Man Who Was Thursday', 'G.K. Chesterton', '978-0140183887', 6, 'A metaphysical thriller and detective story.', 13.99, 4, 'Penguin Classics', 1908, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Chesterton_-_The_Man_Who_Was_Thursday.djvu/page1-375px-Chesterton_-_The_Man_Who_Was_Thursday.djvu.jpg']
      ,['The Book of Disquiet', 'Fernando Pessoa', '978-0141183046', 2, 'A modernist masterpiece of existential prose.', 18.99, 3, 'Penguin Classics', 1982, 'https://covers.openlibrary.org/b/isbn/9780141183046-L.jpg']
      ,['The Invention of Morel', 'Adolfo Bioy Casares', '978-1590170571', 1, 'A science fiction novella of obsession and immortality.', 14.99, 2, 'NYRB Classics', 1940, 'https://covers.openlibrary.org/b/isbn/9781590170571-L.jpg']
      ,['The Third Policeman', 'Flann O’Brien', '978-0156033237', 1, 'A darkly comic Irish novel of the absurd.', 15.99, 3, 'Dalkey Archive Press', 1967, 'https://m.media-amazon.com/images/I/61JOhNzm+aL._SY522_.jpg']
      ,['The Hearing Trumpet', 'Leonora Carrington', '978-1878972194', 1, 'A surreal feminist classic.', 16.99, 2, 'Exact Change', 1976, 'https://covers.openlibrary.org/b/isbn/9781878972194-L.jpg']
    ];

    const bookStmt = db.prepare(`
      INSERT OR IGNORE INTO books (title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
