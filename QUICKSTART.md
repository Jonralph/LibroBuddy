# 🚀 Quick Start Guide - LibroBuddy

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Initialize the database
npm run init-db

# 3. Start the server
npm start
```

## Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## Default Login Accounts

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Access:** Full system control, can manage books, orders, view statistics

### Customer Account
- **Username:** `johndoe`
- **Password:** `customer123`
- **Access:** Browse books, place orders, write reviews

## What You Can Do

### As a Customer:
- ✅ Browse books by category
- ✅ Search books by title or author
- ✅ View book details and reviews
- ✅ Add books to shopping cart
- ✅ Place orders
- ✅ Write reviews for books
- ✅ View your order history

### As an Admin:
- ✅ Everything a customer can do, PLUS:
- ✅ Add new books to the system
- ✅ Edit existing books (price, stock, details)
- ✅ Delete books
- ✅ Create new categories
- ✅ View all customer orders
- ✅ Update order status
- ✅ View system statistics
- ✅ Monitor low stock alerts

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running

## Documentation

- **README.md** - Full technical documentation for developers
- **README_SIMPLIFIED.md** - Easy-to-understand explanation of how everything works

## Troubleshooting

### Database Issues
```bash
# Delete database and recreate
rm database/librobuddy.db
npm run init-db
```

### Server Won't Start
- Check if port 3000 is already in use
- Make sure all dependencies are installed: `npm install`
- Try rebuilding sqlite3: `npm rebuild sqlite3`

### Can't Login
- Use default credentials: `admin`/`admin123`
- Check that database was initialized: `npm run init-db`
- Clear browser cache and try again

## Sample Books Included

The system comes pre-loaded with 10 sample books:
1. The Great Gatsby - F. Scott Fitzgerald
2. To Kill a Mockingbird - Harper Lee
3. 1984 - George Orwell
4. Sapiens - Yuval Noah Harari
5. Educated - Tara Westover
6. A Brief History of Time - Stephen Hawking
7. The Selfish Gene - Richard Dawkins
8. The Diary of Anne Frank - Anne Frank
9. Clean Code - Robert Martin
10. The Da Vinci Code - Dan Brown

---

**Enjoy using LibroBuddy! 📚**
