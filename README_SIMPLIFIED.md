# LibroBuddy - Simplified Explanation Guide

**Created for: Project Owner**  
**Purpose: Understanding how everything works without technical jargon**

---

## What Is This System?

LibroBuddy is like an online bookstore that you can visit in your web browser. Think of it like Amazon, but specifically for books. Customers can browse books, add them to a shopping cart, and place orders. Administrators can manage the inventory and track sales.

---

## How to Get Started

### Starting the System

1. **Install the software it needs** (you only do this once):
   ```
   npm install
   ```
   This downloads all the "helper programs" the system needs to run.

2. **Set up the database** (creates the book inventory, customer accounts, etc.):
   ```
   npm run init-db
   ```
   This creates a database with some sample books and accounts for testing.

3. **Start the server** (turns the system on):
   ```
   npm start
   ```
   The system is now running!

4. **Open your web browser** and go to:
   ```
   http://localhost:3000
   ```
   You'll see the LibroBuddy website!

### Setting Up VS Code & GitHub (one-time)

1) **Install the tools**
   - VS Code: download and install from code.visualstudio.com
   - Git for Windows: download from git-scm.com and choose “Use Git from the command line” during setup
   - Node.js (if not already installed): download LTS from nodejs.org

2) **Sign in to GitHub inside VS Code**
   - Open VS Code → press Ctrl+Shift+P → type `GitHub: Sign in` → follow the browser prompt to authorize

3) **Get the project code**
   - In VS Code: Source Control (left sidebar) → “Clone Repository” → paste your repo URL (e.g., https://github.com/your-name/librobuddy.git) → pick a folder → “Open” when prompted
   - Or with a terminal: `git clone https://github.com/your-name/librobuddy.git && cd librobuddy`

4) **Open and run it in VS Code**
   - File → Open Folder… → choose the `LibroBuddy` folder
   - Open the VS Code terminal (Ctrl+`) and run:
     - `npm install`
     - `npm run init-db`
     - `npm start`
   - Visit http://localhost:3000 in your browser

5) **Save your changes back to GitHub**
   - `git status` (see what changed)
   - `git add .`
   - `git commit -m "your message"`
   - `git push` (sign in if prompted)

### Logging In

The system comes with two test accounts:

**Admin Account** (has full control):
- Username: `admin`
- Password: `admin123`

**Customer Account** (can shop and order):
- Username: `johndoe`
- Password: `customer123`

---

## How the System Works

### The Big Picture

The system has three main parts:

1. **Frontend** (What you see in your browser)
   - The website interface
   - Buttons, forms, images, etc.
   - Located in the `frontend` folder

2. **Backend** (The brain of the system)
   - Handles logins, orders, security
   - Manages all the business logic
   - Located in the `backend` folder

3. **Database** (The memory)
   - Stores all the books, customers, orders
   - Like a digital filing cabinet
   - Located in the `database` folder

**How they work together:**
- You click a button on the website (Frontend)
- The website sends a request to the Backend
- The Backend processes your request and checks the Database
- The Backend sends a response back to the website
- The website shows you the result

---

## Understanding the Code Files

### Backend (Server) - `backend/server.js`

This is the "command center" of the system. Let me explain what it does:

#### 1. Authentication (Security)
```javascript
// When someone tries to log in:
// 1. Check if the username exists
// 2. Check if the password matches (it's encrypted for security)
// 3. If correct, give them a "token" (like a temporary ID badge)
// 4. They use this token for all future requests
```

**Real-world analogy:** It's like showing your ID card to enter a building. Once verified, you get a temporary badge to move around.

#### 2. Book Management
```javascript
// GET /api/books - Show all books (like browsing shelves)
// GET /api/books/:id - Show details of one book (like picking up a book to read)
// POST /api/books - Add a new book (admin only)
// PUT /api/books/:id - Update book info (admin only)
// DELETE /api/books/:id - Remove a book (admin only)
```

**What happens when you search for books:**
1. You type "Gatsby" in the search box
2. Frontend sends: "Hey backend, find books with 'Gatsby' in the title"
3. Backend asks database: "SELECT books WHERE title LIKE '%Gatsby%'"
4. Database returns matching books
5. Backend sends them to Frontend
6. Frontend displays them on your screen

#### 3. Order Processing
```javascript
// When you checkout:
// 1. Check if all books are in stock
// 2. Calculate the total price
// 3. Create an order record
// 4. Reduce the stock quantity for each book
// 5. Save everything to the database
// 
// This all happens in a "transaction" - meaning if ANY step fails,
// everything is canceled (so you don't get charged without getting your books)
```

**Real-world analogy:** Like buying groceries - the cashier scans items, checks if they're available, calculates total, takes payment, and gives you a receipt. If your card is declined, nothing happens - you don't get the groceries AND you don't get charged.

#### 4. Security Features

**Password Security:**
```javascript
// Passwords are NEVER stored in plain text!
// 
// When you register:
// - You enter: "mypassword123"
// - System stores: "$2b$10$XxXxXxXxXxXxXxXxXxXxXx..." (encrypted gibberish)
// 
// When you login:
// - You enter: "mypassword123"
// - System encrypts it and compares to the stored gibberish
// - If they match, you're in!
```

**Token Authentication (JWT):**
```javascript
// After login, you get a token that looks like:
// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQ..."
// 
// This token contains:
// - Your user ID
// - Your username
// - Your role (customer or admin)
// - Expiration time (24 hours)
// 
// Every time you do something, you send this token
// The server checks: "Is this token valid? Has it expired? Is this user allowed?"
```

---

### Frontend (Website) - `frontend/app.js`

This is the code that runs in your web browser. It makes the website interactive.

#### 1. Authentication Flow

```javascript
// Registration Process:
// 1. User fills out form (username, email, password)
// 2. Click "Register" button
// 3. JavaScript collects form data
// 4. Sends it to backend: POST /api/auth/register
// 5. Backend creates account
// 6. Shows success message

// Login Process:
// 1. User enters username and password
// 2. Click "Login"
// 3. JavaScript sends credentials to backend
// 4. Backend verifies and sends back a token
// 5. JavaScript saves token in browser's localStorage
// 6. JavaScript shows main content (books, cart, etc.)
```

#### 2. Shopping Cart

```javascript
// The cart is stored in your browser's localStorage
// (like a temporary notepad that remembers even after closing the browser)

// Adding to cart:
// 1. Click "Add to Cart" on a book
// 2. JavaScript checks if book is already in cart
//    - If yes: increase quantity
//    - If no: add new item
// 3. Save updated cart to localStorage
// 4. Update cart badge (number next to cart icon)

// Cart contents look like this in memory:
// [
//   { book: {id: 1, title: "Gatsby", price: 12.99}, quantity: 2 },
//   { book: {id: 3, title: "1984", price: 13.99}, quantity: 1 }
// ]
```

#### 3. How Searching Works

```javascript
// When you type in search box and press Enter:
// 1. JavaScript gets your search text
// 2. Builds URL: /api/books?search=your-text
// 3. Sends request to backend
// 4. Backend searches database
// 5. Returns matching books
// 6. JavaScript creates HTML for each book
// 7. Displays them in a grid on the page
```

#### 4. Modal Windows (Popups)

```javascript
// When you click "View Details" on a book:
// 1. JavaScript fetches full book info from backend
// 2. Gets reviews for that book
// 3. Calculates average rating
// 4. Builds HTML for the modal popup
// 5. Shows modal on screen
// 
// When you click outside the modal or click X:
// - JavaScript hides the modal
```

---

### Database - `database/init.js`

This file creates all the "tables" where data is stored. Think of it like creating filing cabinets with labeled drawers.

#### Tables Explained

**1. Users Table** (Customer accounts)
```
+----+----------+-------------------+-------------------+----------+
| id | username | email             | password_hash     | role     |
+----+----------+-------------------+-------------------+----------+
| 1  | admin    | admin@libro.com   | $2b$10$Xxx...    | admin    |
| 2  | johndoe  | john@example.com  | $2b$10$Yyy...    | customer |
+----+----------+-------------------+-------------------+----------+
```

**2. Books Table** (Inventory)
```
+----+-------------------+------------------+-------+-------+-------+
| id | title             | author           | price | stock | isbn  |
+----+-------------------+------------------+-------+-------+-------+
| 1  | The Great Gatsby  | F. Scott Fitz... | 12.99 | 25    | 978.. |
| 2  | 1984              | George Orwell    | 13.99 | 40    | 978.. |
+----+-------------------+------------------+-------+-------+-------+
```

**3. Orders Table** (Customer orders)
```
+----+---------+--------------+------------+
| id | user_id | total_amount | status     |
+----+---------+--------------+------------+
| 1  | 2       | 26.98        | delivered  |
| 2  | 2       | 13.99        | pending    |
+----+---------+--------------+------------+
```

**4. Order Items Table** (What's in each order)
```
+----+----------+---------+----------+--------------------+
| id | order_id | book_id | quantity | price_at_purchase  |
+----+----------+---------+----------+--------------------+
| 1  | 1        | 1       | 2        | 12.99              |
| 2  | 2        | 2       | 1        | 13.99              |
+----+----------+---------+----------+--------------------+
```

**5. Reviews Table**
```
+----+---------+---------+--------+------------------+
| id | book_id | user_id | rating | review_text      |
+----+---------+---------+--------+------------------+
| 1  | 1       | 2       | 5      | "Amazing book!"  |
+----+---------+---------+--------+------------------+
```

**6. Categories Table**
```
+----+-----------+------------------------+
| id | name      | description            |
+----+-----------+------------------------+
| 1  | Fiction   | Fictional stories...   |
| 2  | Science   | Scientific books...    |
+----+-----------+------------------------+
```

#### How Tables Connect (Relationships)

```
Users (customers)
  └─→ Orders (their orders)
       └─→ Order Items (books in the order)
            └─→ Books (which book)

Books
  ├─→ Categories (what type of book)
  └─→ Reviews (customer reviews)
       └─→ Users (who wrote the review)
```

---

### Styling - `frontend/styles.css`

This makes everything look nice. CSS is like the "interior decorator" of the website.

#### Key Concepts:

**Colors:**
```css
/* The system uses consistent colors defined at the top */
--primary-color: #2c3e50;    /* Dark blue (navigation bar) */
--secondary-color: #3498db;   /* Bright blue (buttons) */
--success-color: #27ae60;     /* Green (prices, success messages) */
--danger-color: #e74c3c;      /* Red (delete buttons, errors) */
```

**Responsive Design:**
```css
/* The website looks good on all screen sizes */
/* On big screens: books show in 4 columns */
/* On tablets: books show in 2 columns */
/* On phones: books show in 1 column */
/* 
/* This is done with CSS Grid and media queries */
```

**Animations:**
```css
/* When you hover over a button: */
/* - It moves up slightly */
/* - Gets a shadow (looks like it's floating) */
/* - Changes color */
/* 
/* This makes the website feel more interactive */
```

---

## Step-by-Step User Journeys

### Journey 1: Customer Browses and Buys Books

1. **Arrive at website** → See login/register forms
2. **Register account** → Enter username, email, password → Account created
3. **Login** → Enter credentials → Get token → See main page
4. **Browse books** → See grid of books with covers, titles, prices
5. **Filter by category** → Click "Fiction" tab → Only fiction books show
6. **Search** → Type "Gatsby" → Only matching books show
7. **View details** → Click "View Details" → Modal opens with full info and reviews
8. **Add to cart** → Click "Add to Cart" → Success message → Cart badge updates
9. **Add more books** → Repeat for other books
10. **Open cart** → Click cart icon → Panel slides in from right
11. **Review cart** → See all items, quantities, total price
12. **Checkout** → Click "Checkout" button
    - Backend checks stock
    - Creates order
    - Reduces stock
    - Saves to database
13. **Order confirmation** → See success message with order number
14. **View orders** → Click "My Orders" → See order history

### Journey 2: Admin Manages Inventory

1. **Login as admin** → Use admin credentials
2. **See admin panel** → Extra buttons appear (Add Book, View Orders, Statistics)
3. **Add new book** → Click "Add New Book"
   - Form appears with fields
   - Fill in: title, author, ISBN, price, stock, etc.
   - Click "Save"
   - Book added to database
   - Book appears in grid
4. **Edit book** → Click "Edit" on existing book
   - Form opens with current values
   - Change price from $12.99 to $9.99
   - Click "Save"
   - Book updated
5. **Check statistics** → Click "Statistics"
   - See total books, users, orders, revenue
   - See low stock alerts
6. **View orders** → Click "View All Orders"
   - See all customer orders
   - Click order to see details
   - Change status from "pending" to "shipped"
   - Customer can now see updated status

---

## Common Questions Answered

### Q: Where is my data stored?
**A:** Everything is stored in a file called `librobuddy.db` in the `database` folder. This is a SQLite database file - think of it like an Excel spreadsheet, but more powerful and secure.

### Q: What happens when I restart the server?
**A:** All your data remains! The database file persists. However, you will need to login again because tokens expire.

### Q: Can multiple people use this at the same time?
**A:** Yes! The server can handle multiple users simultaneously. Each user has their own session (token) and can browse/order independently.

### Q: How does the search work?
**A:** When you search for "Gatsby":
1. Backend queries database: `SELECT * FROM books WHERE title LIKE '%Gatsby%'`
2. Database returns all books with "Gatsby" in the title
3. Also checks the author field
4. Returns results to frontend
5. Frontend displays them

### Q: What's this "token" everyone keeps mentioning?
**A:** A token (JWT) is like a temporary ID badge. After you login:
- You get a token (a long random string)
- Your browser stores it
- Every request includes this token
- Server verifies: "Yes, this is valid user X"
- Token expires after 24 hours (for security)

### Q: How are passwords kept secure?
**A:** Passwords are "hashed" using bcrypt:
- Your password: "mypassword123"
- Hashed version: "$2b$10$eEyJxB9FPAa6zxz0h3a8s.j3k..."
- Even if someone steals the database, they can't read passwords
- When you login, your password is hashed and compared
- If hashes match → you're in!

### Q: What happens if I try to order more books than available?
**A:** The system checks stock during checkout:
```javascript
if (requested_quantity > available_stock) {
  // Reject the order
  // Show error: "Only 5 copies available"
  // Transaction is rolled back (nothing is saved)
}
```

### Q: Can I delete a book that has been ordered?
**A:** Yes, but the order history is preserved! The order_items table stores the book information at the time of purchase, so even if the book is deleted from inventory, past orders still show what was purchased.

### Q: What's a "transaction" in the order process?
**A:** A transaction ensures "all or nothing":

**Without transaction:**
```
1. Create order ✓
2. Deduct stock ✓
3. Add order items ✗ (fails due to error)
Result: Order exists, stock reduced, but no items! 😱
```

**With transaction:**
```
1. Start transaction
2. Create order ✓
3. Deduct stock ✓
4. Add order items ✗ (fails)
5. ROLLBACK - undo everything
Result: Nothing changed, like it never happened ✅
```

---

## File Structure Explained

```
Project-demo/
│
├── backend/
│   └── server.js                   # The "brain" - handles all requests
│
├── database/
│   ├── init.js                     # Creates the database and tables
│   ├── schema.sql                  # Documentation of database structure
│   └── librobuddy.db              # The actual database file (created after init)
│
├── frontend/
│   ├── index.html                  # The webpage structure (skeleton)
│   ├── app.js                      # Makes the page interactive (behavior)
│   └── styles.css                  # Makes it look pretty (appearance)
│
├── .env                            # Secret configuration (JWT key, etc.)
├── .env.example                    # Example configuration
├── package.json                    # List of software dependencies
│
├── README.md                       # Developer documentation (technical)
└── README_SIMPLIFIED.md           # This file! (non-technical explanation)
```

---

## What Each Technology Does

### Node.js
**What:** JavaScript runtime (lets you run JavaScript outside the browser)  
**Why:** Allows us to build the backend server in JavaScript

### Express.js
**What:** Web framework for Node.js  
**Why:** Makes it easy to create API endpoints (the routes like `/api/books`)

### SQLite
**What:** Lightweight database  
**Why:** Stores all our data without needing a separate database server

### bcrypt
**What:** Password hashing library  
**Why:** Encrypts passwords so they're secure

### JWT (JSON Web Tokens)
**What:** Authentication standard  
**Why:** Creates secure tokens for logged-in users

### HTML
**What:** HyperText Markup Language  
**Why:** Defines the structure of the webpage (headings, buttons, forms)

### CSS
**What:** Cascading Style Sheets  
**Why:** Makes the webpage look good (colors, layouts, fonts)

### JavaScript (Frontend)
**What:** Programming language for browsers  
**Why:** Makes the webpage interactive (clicking buttons, showing/hiding elements)

---

## Security Explained Simply

### 1. Password Hashing
```
Your password: "hello123"
                  ↓
           Hash function (bcrypt)
                  ↓
Stored in database: "$2b$10$Xe3kja9dj3k..."

• One-way process (can't reverse it)
• Same password → same hash
• Different password → completely different hash
• Even if database is stolen, passwords are safe
```

### 2. SQL Injection Prevention
```
❌ UNSAFE (vulnerable):
sql = "SELECT * FROM users WHERE username = '" + userInput + "'"
// Hacker could enter: admin' OR '1'='1
// Resulting query: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
// Returns all users!

✅ SAFE (parameterized):
sql = "SELECT * FROM users WHERE username = ?"
db.query(sql, [userInput])
// User input is properly escaped
// Hacker's input is treated as literal text
```

### 3. XSS Prevention
```
❌ UNSAFE:
innerHTML = userInput  // If user enters: <script>alert('hacked')</script>

✅ SAFE:
innerHTML = sanitize(userInput)  // Removes < and > characters
// User's malicious script is neutralized
```

### 4. Authentication Flow
```
1. User logs in
2. Server verifies password
3. Server creates token with expiration
4. Client stores token
5. Every request includes token
6. Server verifies token before processing
7. After 24 hours, token expires → user must login again
```

---

## Troubleshooting Guide

### Problem: "npm install" fails
**Solution:** 
- Make sure Node.js is installed: `node --version`
- Try: `npm cache clean --force` then `npm install` again

### Problem: Database error when starting
**Solution:** 
- Delete `database/librobuddy.db`
- Run `npm run init-db` again
- This recreates a fresh database

### Problem: Can't login
**Solution:**
- Check username and password (case-sensitive!)
- Try default accounts: admin/admin123 or johndoe/customer123
- Check browser console for errors (F12)

### Problem: "Port 3000 already in use"
**Solution:**
- Another program is using port 3000
- Change port in `.env`: `PORT=3001`
- Or stop the other program

### Problem: Books don't show up
**Solution:**
- Make sure you're logged in
- Check browser console (F12) for errors
- Make sure backend server is running
- Try refreshing the page

### Problem: Cart is empty after closing browser
**Solution:**
- This is normal if you logout
- Cart is saved in localStorage (browser storage)
- Logging out clears it for security
- If logged in, cart persists

---

## How to Customize

### Change Colors
Edit `frontend/styles.css`, at the top:
```css
:root {
  --primary-color: #2c3e50;     /* Change this! */
  --secondary-color: #3498db;   /* And this! */
  /* etc. */
}
```

### Add New Book Category
1. Login as admin
2. Click "Add Category"
3. Enter name and description
4. Done! It appears in filter tabs

### Change Token Expiration
Edit `backend/server.js`:
```javascript
jwt.sign({ /* data */ }, JWT_SECRET, { expiresIn: '24h' })
// Change '24h' to '1h', '7d', etc.
```

### Add More Sample Books
Edit `database/init.js`:
```javascript
const books = [
  // Add more rows here
  ['New Book Title', 'Author Name', 'ISBN', 1, 'Description', 19.99, 30, 'Publisher', 2025],
];
```
Then run `npm run init-db`

---

## Summary

**LibroBuddy is a complete online bookstore with:**
- Secure user accounts (customers and admins)
- Book inventory with search and filtering
- Shopping cart and order system
- Customer reviews
- Admin management tools

**It uses:**
- Node.js + Express for the backend server
- SQLite for data storage
- HTML/CSS/JavaScript for the website
- bcrypt + JWT for security

**To use it:**
1. `npm install` (install dependencies)
2. `npm run init-db` (create database)
3. `npm start` (start server)
4. Open `http://localhost:3000` in browser
5. Login with admin/admin123 or johndoe/customer123

**Everything is well-commented, secure, and ready to use!**

---

*If you have any questions or need clarification on any part, the code files have extensive comments explaining every function and decision!*
