# LibroBuddy - Quick Test Guide

## 🚀 Server Status
- **Backend**: Running on http://localhost:3000
- **Frontend**: http://localhost:3000
- **Database**: SQLite (librobuddy.db) - Freshly initialized

---

## 🔑 Test Accounts

| Role | Username | Password | Employee ID |
|------|----------|----------|-------------|
| Admin | admin | admin123 | - |
| Customer | johndoe | customer123 | - |
| Cashier | cashier | cashier123 | EMP001 |

---

## ✅ Feature Testing Checklist

### Public Features (No Login Required)
- [ ] Browse books with cover images
- [ ] Search books by title/author/ISBN
- [ ] Filter by category
- [ ] View book details in modal

### Customer Features (Login: johndoe / customer123)
- [ ] Register new account
- [ ] Login
- [ ] Add books to cart
- [ ] Update cart quantities
- [ ] Remove items from cart
- [ ] Checkout and create order
- [ ] View "My Orders"
- [ ] Submit book reviews
- [ ] Rate books (1-5 stars)

### Cashier Features (Login: cashier / cashier123)
- [ ] View all orders (not just own)
- [ ] Update order status
- [ ] View today's sales summary
- [ ] Process customer orders
- [ ] Orders tagged with employee ID

### Admin Features (Login: admin / admin123)

#### Book Management
- [ ] Add new book
- [ ] Edit existing book
- [ ] Delete book
- [ ] Set reorder thresholds
- [ ] View all books

#### Sales Reporting
- [ ] View sales report (all time)
- [ ] Filter by date range
- [ ] View total sales & order count
- [ ] Export sales report as CSV
- [ ] Download CSV file

#### Supplier Ordering
- [ ] View books below reorder threshold
- [ ] View all supplier orders
- [ ] Create supplier order
- [ ] Update supplier order status
- [ ] Verify stock update when order "Received"

#### Audit Logs
- [ ] View all audit logs
- [ ] Filter by login attempts
- [ ] Filter by order actions
- [ ] See user, action, details, IP, timestamp

#### Dashboard Statistics
- [ ] View total books
- [ ] View total orders
- [ ] View total revenue

---

## 🧪 Test Scenarios

### Scenario 1: Complete Customer Journey
1. Register account: "testuser" / "test@email.com" / "password123"
2. Login
3. Search for "The Great Gatsby"
4. Add to cart (quantity: 2)
5. Search for "1984"
6. Add to cart (quantity: 1)
7. Open cart
8. Verify total calculation
9. Checkout
10. View "My Orders" to confirm
11. Submit review on purchased book

### Scenario 2: Cashier Daily Operations
1. Login as cashier
2. Click "View All Orders"
3. Update order status from "pending" to "processing"
4. Update another order to "shipped"
5. Click "Today's Sales"
6. Verify today's revenue displayed

### Scenario 3: Admin Inventory Management
1. Login as admin
2. Click "Add Book"
3. Enter new book details, set reorder_threshold to 10
4. Save
5. Edit the book, reduce stock to 5
6. Go to "Supplier Orders" section
7. Click "Books Below Threshold"
8. Verify new book appears (stock 5 < threshold 10)
9. Click "Create Supplier Order"
10. Select book, supplier, quantity 20
11. Submit order
12. View all supplier orders
13. Change status to "Received"
14. Verify stock increased by 20

### Scenario 4: Sales Analysis
1. Login as admin
2. Go to Sales Report section
3. Set start date: beginning of current month
4. Set end date: today
5. Click "Get Report"
6. Review order list
7. Click "Export CSV"
8. Open downloaded file to verify data

### Scenario 5: Security Audit
1. Login as admin
2. Go to Audit Logs section
3. Click "View All Logs"
4. Observe all tracked actions
5. Click "Login Attempts"
6. Verify your login is logged
7. Try to login with wrong password
8. Check audit logs for failed login entry

### Scenario 6: Payment Processing (Backend Test)
**Note**: This requires API testing tool (Postman/curl) or custom frontend integration

```bash
# Create an order first, note the order_id
# Then test payment endpoint:

POST http://localhost:3000/api/process-payment
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
Body: {
  "order_id": 1,
  "payment_method": "credit_card",
  "card_number": "4111111111111111",
  "card_expiry": "12/25",
  "card_cvv": "123"
}

# Check server console for confirmation email output
```

---

## 🔍 Expected Results

### Successful Operations:
- ✅ Book covers load from Open Library
- ✅ Cart persists after page refresh
- ✅ Stock decreases when order placed
- ✅ Stock increases when supplier order received
- ✅ Audit logs record all critical actions
- ✅ CSV downloads with correct data
- ✅ Email logged to console on payment
- ✅ Role-based UI visibility works
- ✅ Only authorized users can access admin features

### Security Checks:
- ✅ Passwords are hashed (check database - no plaintext)
- ✅ Email addresses are encrypted (check database - encrypted format)
- ✅ JWT required for protected endpoints
- ✅ Failed login attempts logged
- ✅ Role enforcement prevents unauthorized access

---

## 📊 Database Verification

### Check Encrypted Data:
```sql
-- Email addresses should look like:
-- "1a2b3c4d5e6f:encrypted_hex_string"
SELECT username, email FROM users;

-- Should show hashed passwords (bcrypt format):
-- "$2b$10$randomsaltandhashedpassword"
SELECT username, password_hash FROM users;
```

### Check Audit Logs:
```sql
-- View recent audit entries:
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20;
```

### Check Supplier Orders:
```sql
-- View supplier orders and their effects:
SELECT so.id, b.title, s.name, so.quantity, so.status, b.stock_quantity
FROM supplier_orders so
JOIN books b ON so.book_id = b.id
JOIN suppliers s ON so.supplier_id = s.id;
```

---

## 🐛 Troubleshooting

### Issue: Book covers not loading
- **Solution**: Check internet connection (images from covers.openlibrary.org)

### Issue: Admin panel not showing
- **Solution**: Verify logged in as admin, check browser console for errors

### Issue: Orders not saving
- **Solution**: Check stock availability, ensure sufficient quantity

### Issue: CSV not downloading
- **Solution**: Check browser pop-up blocker, allow downloads from localhost

### Issue: Audit logs empty
- **Solution**: Perform actions (login, create order, etc.) to generate logs

---

## 📞 Sample Books in Database

The database is pre-loaded with these books:

1. **The Great Gatsby** - F. Scott Fitzgerald - $12.99
2. **To Kill a Mockingbird** - Harper Lee - $14.99
3. **1984** - George Orwell - $13.99
4. **The Catcher in the Rye** - J.D. Salinger - $11.99
5. **Pride and Prejudice** - Jane Austen - $10.99
6. **The Hobbit** - J.R.R. Tolkien - $15.99
7. **Harry Potter and the Philosopher's Stone** - J.K. Rowling - $16.99
8. **The Da Vinci Code** - Dan Brown - $14.99
9. **The Alchemist** - Paulo Coelho - $12.99
10. **The Book Thief** - Markus Zusak - $13.99

All have actual book covers via ISBN lookup!

---

## ✨ New Features Highlights

### 1. **Sales Reporting & CSV Export**
- Filter by custom date ranges
- See total sales and order counts
- Download complete sales data
- Perfect for accounting and analysis

### 2. **Supplier Ordering System**
- Set reorder thresholds per book
- Automated low-stock alerts
- Track supplier orders through lifecycle
- Auto-update inventory on receipt

### 3. **Payment Gateway (Mock)**
- Simulates real payment processing
- Validates card information
- Generates transaction IDs
- Sends confirmation emails (to console)

### 4. **Comprehensive Audit Logging**
- Tracks all critical actions
- Records user, action, details, IP, timestamp
- Filterable by action type
- Essential for security compliance

### 5. **Data Encryption**
- Email addresses encrypted at rest
- AES-256-CBC encryption
- Environment variable key support
- Backward-compatible decryption

### 6. **Cashier Role**
- Separate employee access level
- Process customer orders
- View daily sales
- Track which employee processed orders

---

**Happy Testing! 🎉**

All features are fully functional and ready for demonstration.
