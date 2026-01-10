# LibroBuddy - Digital Bookstore Management System

## Project Overview

LibroBuddy is a comprehensive online library/bookstore management system designed to modernize and streamline bookstore operations. The system provides a complete digital solution for managing inventory, processing orders, handling customer accounts, and tracking sales.

## Features

### User Authentication & Authorization
- Secure user registration and login
- Password hashing with bcrypt (10 salt rounds)
- JWT-based authentication with 24-hour token expiration
- Role-based access control (Customer, Cashier, Admin, Manager)
- Protected API endpoints
- **NEW:** Email encryption at rest (AES-256-CBC)
- **NEW:** Comprehensive audit logging for security compliance

### Book Management
- Complete CRUD operations for books
- Category-based organization
- Search functionality (by title, author, or ISBN)
- Filter by category
- Stock quantity tracking
- Book cover images from Open Library API
- Detailed book information (ISBN, publisher, publication year, description)
- **NEW:** Reorder threshold tracking
- **NEW:** Low stock alerts for administrators

### Shopping Cart & Orders
- Add/remove items from cart
- Quantity management
- Real-time cart total calculation
- Atomic order processing with transaction support
- Stock validation during checkout
- Order history tracking
- Order status management (pending, processing, shipped, delivered, cancelled)
- **NEW:** Employee tracking for orders processed by cashiers

### Review System
- Customer reviews with 1-5 star ratings
- One review per user per book
- Review text with optional comments
- Display average ratings

### Admin Features
- Add/edit/delete books
- Create categories
- View all orders
- Update order status
- System statistics dashboard
- **NEW:** Sales reporting with date range filtering
- **NEW:** CSV export for sales reports
- **NEW:** Supplier order management
- **NEW:** Reorder threshold monitoring
- **NEW:** Audit log viewer with filtering
- Low stock monitoring

### Cashier Features
- View all customer orders
- Update order status
- View today's sales summary
- Employee ID tracking for accountability

### Advanced Features
- **Payment Gateway (Mock):** Simulated payment processing with confirmation emails
- **Supplier Ordering:** Automated inventory management with reorder thresholds
- **Audit Logging:** Track all critical actions (logins, orders, inventory changes)
- **Data Encryption:** Sensitive data encrypted at rest

## Technology Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 4.x
- **Database:** SQLite3
- **Authentication:** bcrypt + JSON Web Tokens (JWT)
- **Encryption:** crypto (AES-256-CBC for sensitive data)
- **Environment:** dotenv for configuration

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern responsive design with CSS Grid and Flexbox
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Fetch API** - RESTful API communication

## Project Structure

```
Project-demo/
├── backend/
│   └── server.js           # Express server with all API routes
├── database/
│   ├── init.js             # Database initialization script
│   ├── schema.sql          # SQL schema documentation
│   └── librobuddy.db       # SQLite database (created after init)
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── app.js              # Client-side JavaScript
│   └── styles.css          # Complete CSS styling
├── .env                    # Environment variables (JWT secret, etc.)
├── .env.example            # Example environment file
└── package.json            # Node.js dependencies

```

## Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- express
- sqlite3
- bcrypt
- jsonwebtoken
- cors
- dotenv

### Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

**Important:** Change the `JWT_SECRET` in production!

### Step 3: Initialize Database

```bash
npm run init-db
```

This creates the SQLite database with:
- All necessary tables (users, books, categories, orders, order_items, reviews, suppliers, supplier_orders, audit_log)
- Sample categories
- Sample books with cover images
- Admin user (username: `admin`, password: `admin123`)
- Sample customer (username: `johndoe`, password: `customer123`)
- Cashier user (username: `cashier`, password: `cashier123`, employee_id: `EMP001`)

### Step 4: Start the Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

#### Troubleshooting: sqlite3 Installation Issues

If you see an error like:

```
Error: ...node_sqlite3.node is not a valid Win32 application.
```

This means the sqlite3 binary is incompatible or corrupted. To fix:

```bash
npm uninstall sqlite3
npm install sqlite3
```

This will reinstall sqlite3 with the correct binary for your system.

### Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Default Accounts

### Admin Account
- **Username:** admin
- **Password:** admin123
- **Capabilities:** Full system access, book management, order management, sales reports, supplier ordering, audit logs, statistics

### Cashier Account
- **Username:** cashier
- **Password:** cashier123
- **Employee ID:** EMP001
- **Capabilities:** View all orders, update order status, view today's sales

### Sample Customer Account
- **Username:** johndoe
- **Password:** customer123
- **Capabilities:** Browse books, place orders, write reviews

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string" (min 6 characters)
}
```

**Response:**
```json
{
  "message": "User registered successfully.",
  "userId": 1
}
```

#### POST `/api/auth/login`
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful.",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

### Book Endpoints

#### GET `/api/books`
Get all books with optional filtering.

**Query Parameters:**
- `category` - Filter by category ID
- `search` - Search by title or author

**Response:**
```json
[
  {
    "id": 1,
    "title": "Book Title",
    "author": "Author Name",
    "isbn": "978-XXXXXXXXXX",
    "category_id": 1,
    "category_name": "Fiction",
    "description": "Book description",
    "price": 12.99,
    "stock_quantity": 25,
    "publisher": "Publisher Name",
    "publication_year": 2020
  }
]
```

#### GET `/api/books/:id`
Get single book with reviews.

**Response:**
```json
{
  "id": 1,
  "title": "Book Title",
  ... (book fields),
  "reviews": [
    {
      "id": 1,
      "rating": 5,
      "review_text": "Great book!",
      "username": "johndoe",
      "created_at": "2025-01-07T12:00:00.000Z"
    }
  ]
}
```

#### POST `/api/books` (Admin Only)
Create a new book.

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Request Body:**
```json
{
  "title": "string",
  "author": "string",
  "isbn": "string",
  "category_id": 1,
  "description": "string",
  "price": 19.99,
  "stock_quantity": 50,
  "publisher": "string",
  "publication_year": 2025
}
```

#### PUT `/api/books/:id` (Admin Only)
Update existing book.

#### DELETE `/api/books/:id` (Admin Only)
Delete a book.

### Category Endpoints

#### GET `/api/categories`
Get all categories.

#### POST `/api/categories` (Admin Only)
Create a new category.

### Order Endpoints

#### GET `/api/orders`
Get user's orders (or all orders if admin).

**Headers:**
```
Authorization: Bearer {jwt_token}
```

#### GET `/api/orders/:id`
Get order details with items.

#### POST `/api/orders`
Create a new order.

**Request Body:**
```json
{
  "items": [
    {
      "book_id": 1,
      "quantity": 2
    },
    {
      "book_id": 3,
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "message": "Order created successfully.",
  "orderId": 1,
  "totalAmount": 45.97
}
```

#### PUT `/api/orders/:id/status` (Admin Only)
Update order status.

**Request Body:**
```json
{
  "status": "shipped"
}
```

### Review Endpoints

#### POST `/api/reviews`
Create a book review.

**Request Body:**
```json
{
  "book_id": 1,
  "rating": 5,
  "review_text": "Excellent book!"
}
```

#### DELETE `/api/reviews/:id`
Delete own review (or any review if admin).

### Statistics Endpoint

#### GET `/api/stats` (Admin Only)
Get system statistics.

**Response:**
```json
{
  "totalBooks": 10,
  "totalUsers": 5,
  "totalOrders": 12,
  "totalRevenue": 345.67,
  "lowStockBooks": [...]
}
```

## Database Schema

### Tables

1. **users** - User accounts and authentication
   - id, username, email, password_hash, role, created_at

2. **categories** - Book categories
   - id, name, description

3. **books** - Book inventory
   - id, title, author, isbn, category_id, description, price, stock_quantity, publisher, publication_year, created_at

4. **orders** - Customer orders
   - id, user_id, total_amount, status, created_at, updated_at

5. **order_items** - Items within orders
   - id, order_id, book_id, quantity, price_at_purchase

6. **reviews** - Book reviews
   - id, book_id, user_id, rating, review_text, created_at

### Relationships
- Books → Categories (many-to-one)
- Orders → Users (many-to-one)
- Order Items → Orders (many-to-one, cascade delete)
- Order Items → Books (many-to-one)
- Reviews → Books (many-to-one, cascade delete)
- Reviews → Users (many-to-one)

## Security Features

### Password Security
- Passwords hashed with bcrypt (10 salt rounds)
- Never stored or transmitted in plain text
- Strong password validation (minimum 6 characters)

### Authentication
- JWT tokens with 24-hour expiration
- Tokens signed with secret key
- Token verification on protected routes

### Input Validation
- XSS prevention through input sanitization
- Email format validation
- SQL injection prevention (parameterized queries)
- Price and quantity validation

### Authorization
- Role-based access control (RBAC)
- Admin-only endpoints protected
- Users can only access their own data (except admins)

### Error Handling
- Generic error messages to prevent user enumeration
- Server-side validation
- Transaction rollback on errors

## Development

### Available Scripts

```bash
# Start production server
npm start

# Start development server with auto-reload
npm run dev

# Initialize/reset database
npm run init-db
```

### Adding New Features

1. **Backend (API):**
   - Add route handler in `backend/server.js`
   - Use `authenticateToken` middleware for protected routes
   - Use `requireAdmin` for admin-only routes
   - Follow RESTful conventions

2. **Frontend:**
   - Add UI elements in `frontend/index.html`
   - Add logic in `frontend/app.js`
   - Add styling in `frontend/styles.css`
   - Use `fetch()` with `Authorization` header

3. **Database:**
   - Modify `database/init.js` for schema changes
   - Update `database/schema.sql` documentation
   - Run `npm run init-db` to recreate database

## Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Register new account
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Access protected routes without token
- [ ] Token expiration handling

**Books:**
- [ ] Browse all books
- [ ] Search books by title
- [ ] Search books by author
- [ ] Filter by category
- [ ] View book details
- [ ] (Admin) Add new book
- [ ] (Admin) Edit book
- [ ] (Admin) Delete book

**Shopping & Orders:**
- [ ] Add items to cart
- [ ] Update cart quantities
- [ ] Remove items from cart
- [ ] Checkout with valid stock
- [ ] Checkout with insufficient stock
- [ ] View order history
- [ ] View order details
- [ ] (Admin) Update order status

**Reviews:**
- [ ] Submit review
- [ ] View reviews on book page
- [ ] Prevent duplicate reviews
- [ ] Delete own review

**Admin Features:**
- [ ] Add category
- [ ] View statistics
- [ ] View low stock alerts
- [ ] Manage all orders

## Troubleshooting

### Database Issues
- If database is corrupted, delete `database/librobuddy.db` and run `npm run init-db`
- Check file permissions if database creation fails

### Authentication Issues
- Ensure JWT_SECRET is set in `.env`
- Check token expiration
- Clear localStorage and re-login

### Server Won't Start
- Check if port 3000 is already in use
- Verify all dependencies are installed
- Check Node.js version (14+)

### Frontend Can't Connect to Backend
- Ensure backend server is running
- Check API_URL in `frontend/app.js`
- Check browser console for CORS errors

## Future Enhancements

- Advanced search with multiple filters
- Book cover image uploads
- Email notifications for order status
- Password reset functionality
- Wishlist feature
- Shopping cart persistence across sessions
- Pagination for large book lists
- Export orders to CSV
- Analytics dashboard for admins
- Book recommendations based on purchase history

## Contributing

This project follows standard Git workflow:

1. Create a feature branch
2. Make changes with clear commit messages
3. Test thoroughly
4. Submit pull request

## License

ISC License

## Support

For issues or questions, please contact the LibroBuddy development team.

---

**Built with ❤️ by the LibroBuddy Team**
