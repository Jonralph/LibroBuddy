/**
 * LIBROBUDDY FRONTEND APPLICATION
 * 
 * This JavaScript file handles all client-side functionality:
 * - User authentication (login/register/logout)
 * - Book browsing and searching
 * - Shopping cart management
 * - Order placement
 * - Reviews
 * - Admin functions (CRUD operations for books)
 * 
 * Communication with backend API using fetch() with JWT authentication
 */

// ============================================
// SALES REPORT (ADMIN)
async function getSalesReport(event) {
  event.preventDefault();
  const start = document.getElementById('salesStart').value;
  const end = document.getElementById('salesEnd').value;
  let url = `${API_URL}/sales-report?`;
  if (start) url += `start=${start}&`;
  if (end) url += `end=${end}&`;
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    let html = '';
    if (!data.orders || data.orders.length === 0) {
      html = '<p>No sales found for this period.</p>';
    } else {
      html = `<p><strong>Total Sales: $${data.total_sales.toFixed(2)}</strong> (${data.total_orders} orders)</p>`;
      html += `<table class="sales-report-table">
        <thead><tr><th>Order ID</th><th>Date</th><th>User</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
        ${data.orders.map(r => `
          <tr>
            <td>${r.id}</td>
            <td>${new Date(r.created_at).toLocaleString()}</td>
            <td>${r.username}</td>
            <td>$${r.total_amount.toFixed(2)}</td>
            <td>${r.status}</td>
          </tr>
        `).join('')}
        </tbody>
      </table>`;
    }
    document.getElementById('salesReportResults').innerHTML = html;
  } catch (error) {
    document.getElementById('salesReportResults').innerHTML = '<p class="error">Failed to load sales report.</p>';
  }
}


async function exportSalesReport() {
  const start = document.getElementById('salesStart').value;
  const end = document.getElementById('salesEnd').value;
  let url = `${API_URL}/sales-report?format=csv`;
  if (start) url += `&start=${start}`;
  if (end) url += `&end=${end}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      showNotification('Failed to export report', 'error');
      return;
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    showNotification('Report exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting report:', error);
    showNotification('Failed to export report', 'error');
  }
}

// GLOBAL VARIABLES AND CONFIGURATION
// ============================================

// API base URL - change if backend runs on different port/host
const API_URL = 'http://localhost:3000/api';

// Current user data (loaded from localStorage)
let currentUser = null;

// JWT authentication token
let authToken = localStorage.getItem('authToken');

// Shopping cart (array of {book, quantity})
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Currently selected category filter
let selectedCategory = null;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application when page loads
 * This function runs automatically on page load
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('LibroBuddy application starting...');
  
  // Check if user is already logged in
  if (authToken) {
    // Decode token to get user info
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      currentUser = {
        id: payload.userId,
        username: payload.username,
        role: payload.role
      };
      
      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        // Token expired - logout
        logout();
      } else {
        // Token valid - show main app
        showMainContent();
        loadCategories();
        loadBooks();
        updateCartDisplay();
      }
    } catch (error) {
      console.error('Invalid token:', error);
      logout();
    }
  } else {
    // No token - show login/register forms
    showAuthSection();
  }
});

// ============================================
// UI DISPLAY FUNCTIONS
// ============================================

/**
 * Show the authentication section (login/register)
 * Hide the main content
 */
function showAuthSection() {
  document.getElementById('authSection').style.display = 'flex';
  document.getElementById('mainContent').style.display = 'none';
  updateNavActions();
}

/**
 * Show the main content (books, cart, etc.)
 * Hide the authentication section
 */
function showMainContent() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  updateNavActions();
  
  // Show admin panel if user is admin
  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('customerPanel').style.display = 'none';
    document.getElementById('cashierPanel').style.display = 'none';
  } else if (currentUser && currentUser.role === 'cashier') {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('customerPanel').style.display = 'block';
    document.getElementById('cashierPanel').style.display = 'block';
    const custBtn = document.querySelector('#customerPanel button');
    if (custBtn) custBtn.textContent = 'Orders';
  } else {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('customerPanel').style.display = 'block';
    document.getElementById('cashierPanel').style.display = 'none';
    const custBtn = document.querySelector('#customerPanel button');
    if (custBtn) custBtn.textContent = 'My Orders';
  }
}

/**
 * Update navigation bar based on authentication status
 * Shows username and logout button if logged in
 * Shows login/register buttons if not logged in
 */
function updateNavActions() {
  const navActions = document.getElementById('navActions');
  
  if (currentUser) {
    // User is logged in
    navActions.innerHTML = `
      <span class="user-greeting">Hello, ${currentUser.username}!</span>
      <button onclick="logout()" class="btn btn-secondary">Logout</button>
    `;
  } else {
    // User is not logged in
    navActions.innerHTML = `
      <span class="auth-prompt">Please login or register to continue</span>
    `;
  }
}

// ============================================
// NOTIFICATION/TOAST FUNCTIONS
// ============================================

/**
 * Show a notification message to the user
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification notification-${type} show`;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.className = 'notification';
  }, 3000);
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Handle user registration
 * @param {Event} event - Form submit event
 */
async function register(event) {
  event.preventDefault(); // Prevent form from refreshing page
  
  // Get form values
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    // Send registration request to backend
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Registration successful
      showNotification('Registration successful! Please login.', 'success');
      // Clear the form
      document.getElementById('registerForm').reset();
    } else {
      // Registration failed
      showNotification(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

/**
 * Handle user login
 * @param {Event} event - Form submit event
 */
async function login(event) {
  event.preventDefault();
  
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Login successful - save token and user info
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      
      currentUser = data.user;
      
      showNotification(`Welcome back, ${currentUser.username}!`, 'success');
      
      // Clear login form
      document.getElementById('loginForm').reset();
      
      // Show main content
      showMainContent();
      loadCategories();
      loadBooks();
      updateCartDisplay();
    } else {
      // Login failed
      showNotification(data.error || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}

/**
 * Logout current user
 * Clears token and user data, returns to login screen
 */
function logout() {
  // Clear authentication data
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  
  // Clear cart
  cart = [];
  localStorage.removeItem('cart');
  
  showNotification('Logged out successfully', 'info');
  showAuthSection();
}

// ============================================
// CATEGORY FUNCTIONS
// ============================================

/**
 * Load categories from backend and display as filter tabs
 */
async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/categories`);
    const categories = await response.json();

    const categoryTabs = document.getElementById('categoryTabs');
    
    // Add "All Books" tab
    let html = `
      <button class="category-tab ${selectedCategory === null ? 'active' : ''}" 
              onclick="filterByCategory(null)">
        All Books
      </button>
    `;

    // Add category tabs
    categories.forEach(category => {
      html += `
        <button class="category-tab ${selectedCategory === category.id ? 'active' : ''}" 
                onclick="filterByCategory(${category.id})">
          ${category.name}
        </button>
      `;
    });

    categoryTabs.innerHTML = html;
    
    // Also populate category dropdown in book form (for admins)
    if (currentUser && currentUser.role === 'admin') {
      const categorySelect = document.getElementById('bookCategory');
      categorySelect.innerHTML = '<option value="">-- Select Category --</option>';
      categories.forEach(category => {
        categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

/**
 * Filter books by category
 * @param {number|null} categoryId - Category ID or null for all books
 */
function filterByCategory(categoryId) {
  selectedCategory = categoryId;
  loadBooks();
}

// ============================================
// BOOK FUNCTIONS
// ============================================

/**
 * Load books from backend with optional filters
 */
async function loadBooks() {
  try {
    // Build query string
    let url = `${API_URL}/books?`;
    
    if (selectedCategory !== null) {
      url += `category=${selectedCategory}&`;
    }

    const searchInput = document.getElementById('searchInput').value;
    if (searchInput) {
      url += `search=${encodeURIComponent(searchInput)}&`;
    }

    const response = await fetch(url);
    const books = await response.json();

    displayBooks(books);
  } catch (error) {
    console.error('Error loading books:', error);
    showNotification('Failed to load books', 'error');
  }
}

/**
 * Search books when user clicks search button or presses Enter
 */
function searchBooks() {
  loadBooks();
}

// Allow Enter key to trigger search
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchBooks();
      }
    });
  }
});

/**
 * Display books in grid layout
 * @param {Array} books - Array of book objects
 */
function displayBooks(books) {
  const booksGrid = document.getElementById('booksGrid');

  if (books.length === 0) {
    booksGrid.innerHTML = '<p class="no-books">No books found.</p>';
    return;
  }

  let html = '';
  
  books.forEach(book => {
    // Determine if book is in stock
    const inStock = book.stock_quantity > 0;
    const stockClass = inStock ? 'in-stock' : 'out-of-stock';
    const stockText = inStock ? `${book.stock_quantity} in stock` : 'Out of stock';

    // Use book.image_url if present, else fallback to placeholder
    const bookImage = book.image_url
      ? `<img src="${book.image_url}" alt="${book.title} cover" class="book-cover" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/120x180?text=No+Image'">`
      : `<div class="book-placeholder">📖</div>`;

    html += `
      <div class="book-card">
        <div class="book-image">
          ${bookImage}
        </div>
        <div class="book-info">
          <h3 class="book-title">${book.title}</h3>
          <p class="book-author">by ${book.author}</p>
          <p class="book-category">${book.category_name || 'Uncategorized'}</p>
          <p class="book-price">$${book.price.toFixed(2)}</p>
          <p class="book-stock ${stockClass}">${stockText}</p>
          <div class="book-actions">
            <button onclick="viewBook(${book.id})" class="btn btn-info btn-sm">
              View Details
            </button>
            ${inStock ? `
              <button onclick="addToCart(${book.id})" class="btn btn-primary btn-sm">
                Add to Cart
              </button>
            ` : ''}
            ${currentUser && currentUser.role === 'admin' ? `
              <button onclick="editBook(${book.id})" class="btn btn-warning btn-sm">
                Edit
              </button>
              <button onclick="deleteBook(${book.id})" class="btn btn-danger btn-sm">
                Delete
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  });

  booksGrid.innerHTML = html;
}

/**
 * View full details of a book in modal
 * @param {number} bookId - Book ID
 */
async function viewBook(bookId) {
  try {
    const response = await fetch(`${API_URL}/books/${bookId}`);
    const book = await response.json();

    // Calculate average rating
    let avgRating = 0;
    if (book.reviews && book.reviews.length > 0) {
      const sum = book.reviews.reduce((acc, r) => acc + r.rating, 0);
      avgRating = (sum / book.reviews.length).toFixed(1);
    }

    // Build reviews HTML
    let reviewsHtml = '<h3>Customer Reviews</h3>';
    if (book.reviews && book.reviews.length > 0) {
      book.reviews.forEach(review => {
        reviewsHtml += `
          <div class="review">
            <div class="review-header">
              <strong>${review.username}</strong>
              <span class="review-rating">${'⭐'.repeat(review.rating)}</span>
            </div>
            <p class="review-text">${review.review_text || ''}</p>
            <p class="review-date">${new Date(review.created_at).toLocaleDateString()}</p>
          </div>
        `;
      });
    } else {
      reviewsHtml += '<p>No reviews yet. Be the first to review!</p>';
    }

    // Add review form if logged in
    if (currentUser) {
      reviewsHtml += `
        <div class="add-review">
          <h4>Write a Review</h4>
          <form onsubmit="submitReview(event, ${bookId})">
            <div class="form-group">
              <label>Rating</label>
              <select id="reviewRating" required>
                <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                <option value="4">⭐⭐⭐⭐ Good</option>
                <option value="3">⭐⭐⭐ Average</option>
                <option value="2">⭐⭐ Poor</option>
                <option value="1">⭐ Terrible</option>
              </select>
            </div>
            <div class="form-group">
              <label>Review (optional)</label>
              <textarea id="reviewText" rows="3" placeholder="Share your thoughts..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Submit Review</button>
          </form>
        </div>
      `;
    }

    const detailsHtml = `
      <div class="book-details">
        <h2>${book.title}</h2>
        <p class="book-author">by ${book.author}</p>
        <p class="book-rating">Average Rating: ${avgRating > 0 ? avgRating + ' ⭐' : 'No ratings yet'}</p>
        
        <div class="book-meta">
          <p><strong>ISBN:</strong> ${book.isbn}</p>
          <p><strong>Category:</strong> ${book.category_name || 'N/A'}</p>
          <p><strong>Publisher:</strong> ${book.publisher || 'N/A'}</p>
          <p><strong>Publication Year:</strong> ${book.publication_year || 'N/A'}</p>
          <p><strong>Price:</strong> $${book.price.toFixed(2)}</p>
          <p><strong>Stock:</strong> ${book.stock_quantity} available</p>
        </div>

        <div class="book-description">
          <h3>Description</h3>
          <p>${book.description || 'No description available.'}</p>
        </div>

        ${book.stock_quantity > 0 ? `
          <button onclick="addToCart(${book.id}); closeModal();" class="btn btn-primary btn-lg">
            Add to Cart
          </button>
        ` : '<p class="out-of-stock">Out of stock</p>'}

        <hr>
        ${reviewsHtml}
      </div>
    `;

    document.getElementById('bookDetails').innerHTML = detailsHtml;
    document.getElementById('bookModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading book details:', error);
    showNotification('Failed to load book details', 'error');
  }
}

/**
 * Close book details modal
 */
function closeModal() {
  document.getElementById('bookModal').style.display = 'none';
}

/**
 * Submit a review for a book
 * @param {Event} event - Form submit event
 * @param {number} bookId - Book ID
 */
async function submitReview(event, bookId) {
  event.preventDefault();

  const rating = document.getElementById('reviewRating').value;
  const review_text = document.getElementById('reviewText').value;

  try {
    const response = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        book_id: bookId,
        rating: parseInt(rating),
        review_text: review_text
      })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification('Review submitted successfully!', 'success');
      // Reload book details to show new review
      viewBook(bookId);
    } else {
      showNotification(data.error || 'Failed to submit review', 'error');
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    showNotification('Network error', 'error');
  }
}

// ============================================
// ADMIN BOOK MANAGEMENT FUNCTIONS
// ============================================

/**
 * Show form to add new book (Admin only)
 */
function showAddBookForm() {
  document.getElementById('bookFormTitle').textContent = 'Add New Book';
  document.getElementById('bookForm').reset();
  document.getElementById('bookFormId').value = '';
  document.getElementById('bookFormModal').style.display = 'block';
}

/**
 * Show form to edit existing book (Admin only)
 * @param {number} bookId - Book ID
 */
async function editBook(bookId) {
  try {
    const response = await fetch(`${API_URL}/books/${bookId}`);
    const book = await response.json();

    document.getElementById('bookFormTitle').textContent = 'Edit Book';
    document.getElementById('bookFormId').value = book.id;
    document.getElementById('bookTitle').value = book.title;
    document.getElementById('bookAuthor').value = book.author;
    document.getElementById('bookISBN').value = book.isbn;
    document.getElementById('bookCategory').value = book.category_id || '';
    document.getElementById('bookDescription').value = book.description || '';
    document.getElementById('bookPrice').value = book.price;
    document.getElementById('bookStock').value = book.stock_quantity;
    document.getElementById('bookPublisher').value = book.publisher || '';
    document.getElementById('bookYear').value = book.publication_year || '';
    document.getElementById('bookImageUrl').value = book.image_url || '';

    document.getElementById('bookFormModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading book for edit:', error);
    showNotification('Failed to load book', 'error');
  }
}

/**
 * Close book form modal
 */
function closeBookFormModal() {
  document.getElementById('bookFormModal').style.display = 'none';
}

/**
 * Save book (create or update)
 * @param {Event} event - Form submit event
 */
async function saveBook(event) {
  event.preventDefault();

  const bookId = document.getElementById('bookFormId').value;
  const bookData = {
    title: document.getElementById('bookTitle').value,
    author: document.getElementById('bookAuthor').value,
    isbn: document.getElementById('bookISBN').value,
    category_id: document.getElementById('bookCategory').value || null,
    description: document.getElementById('bookDescription').value,
    price: parseFloat(document.getElementById('bookPrice').value),
    stock_quantity: parseInt(document.getElementById('bookStock').value),
    publisher: document.getElementById('bookPublisher').value,
    publication_year: parseInt(document.getElementById('bookYear').value) || null,
    image_url: document.getElementById('bookImageUrl').value || null
  };

  try {
    const url = bookId ? `${API_URL}/books/${bookId}` : `${API_URL}/books`;
    const method = bookId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(bookData)
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(bookId ? 'Book updated successfully!' : 'Book created successfully!', 'success');
      closeBookFormModal();
      loadBooks(); // Reload books list
    } else {
      showNotification(data.error || 'Failed to save book', 'error');
    }
  } catch (error) {
    console.error('Error saving book:', error);
    showNotification('Network error', 'error');
  }
}

/**
 * Delete a book (Admin only)
 * @param {number} bookId - Book ID
 */
async function deleteBook(bookId) {
  if (!confirm('Are you sure you want to delete this book?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/books/${bookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      showNotification('Book deleted successfully!', 'success');
      loadBooks();
    } else {
      showNotification(data.error || 'Failed to delete book', 'error');
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    showNotification('Network error', 'error');
  }
}

/**
 * Show form to add new category (Admin only)
 */
function showAddCategoryForm() {
  const name = prompt('Enter category name:');
  if (!name) return;

  const description = prompt('Enter category description (optional):');

  addCategory(name, description);
}

/**
 * Add a new category
 * @param {string} name - Category name
 * @param {string} description - Category description
 */
async function addCategory(name, description) {
  try {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, description })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification('Category created successfully!', 'success');
      loadCategories();
    } else {
      showNotification(data.error || 'Failed to create category', 'error');
    }
  } catch (error) {
    console.error('Error creating category:', error);
    showNotification('Network error', 'error');
  }
}

// ============================================
// SHOPPING CART FUNCTIONS
// ============================================

/**
 * Add book to shopping cart
 * @param {number} bookId - Book ID
 */
async function addToCart(bookId) {
  try {
    // Fetch book details
    const response = await fetch(`${API_URL}/books/${bookId}`);
    const book = await response.json();

    // Check if book is already in cart
    const existingItem = cart.find(item => item.book.id === bookId);

    if (existingItem) {
      // Increase quantity (but don't exceed stock)
      if (existingItem.quantity < book.stock_quantity) {
        existingItem.quantity++;
        showNotification('Quantity updated in cart', 'success');
      } else {
        showNotification('Cannot add more - stock limit reached', 'error');
        return;
      }
    } else {
      // Add new item to cart
      cart.push({
        book: book,
        quantity: 1
      });
      showNotification(`"${book.title}" added to cart!`, 'success');
    }

    // Save cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
  } catch (error) {
    console.error('Error adding to cart:', error);
    showNotification('Failed to add to cart', 'error');
  }
}

/**
 * Remove item from cart
 * @param {number} bookId - Book ID
 */
function removeFromCart(bookId) {
  cart = cart.filter(item => item.book.id !== bookId);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
  showNotification('Item removed from cart', 'info');
}

// Clear all items from cart and persist
function clearCart() {
  if (cart.length === 0) {
    showNotification('Your cart is already empty', 'info');
    return;
  }
  cart = [];
  localStorage.removeItem('cart');
  updateCartDisplay();
  showNotification('Cart cleared', 'info');
}

/**
 * Update quantity of item in cart
 * @param {number} bookId - Book ID
 * @param {number} quantity - New quantity
 */
function updateCartQuantity(bookId, quantity) {
  const item = cart.find(item => item.book.id === bookId);
  if (item) {
    if (quantity <= 0) {
      removeFromCart(bookId);
    } else if (quantity <= item.book.stock_quantity) {
      item.quantity = quantity;
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartDisplay();
    } else {
      showNotification('Quantity exceeds available stock', 'error');
    }
  }
}

/**
 * Update cart display (count and items)
 */
function updateCartDisplay() {
  // Update cart count badge
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cartCount').textContent = totalItems;

  // Update cart items
  const cartItems = document.getElementById('cartItems');
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    document.getElementById('cartTotal').textContent = '0.00';
    return;
  }

  let html = '';
  let total = 0;

  cart.forEach(item => {
    const itemTotal = item.book.price * item.quantity;
    total += itemTotal;

    html += `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.book.title}</h4>
          <p class="cart-item-price">$${item.book.price.toFixed(2)} each</p>
        </div>
        <div class="cart-item-actions">
          <input 
            type="number" 
            min="1" 
            max="${item.book.stock_quantity}"
            value="${item.quantity}" 
            onchange="updateCartQuantity(${item.book.id}, parseInt(this.value))"
            class="cart-quantity-input"
          >
          <button onclick="removeFromCart(${item.book.id})" class="btn btn-danger btn-sm">
            Remove
          </button>
        </div>
        <div class="cart-item-total">
          $${itemTotal.toFixed(2)}
        </div>
      </div>
    `;
  });

  cartItems.innerHTML = html;
  document.getElementById('cartTotal').textContent = total.toFixed(2);
}

/**
 * Toggle cart panel visibility
 */
function toggleCart() {
  const cartPanel = document.getElementById('cartPanel');
  cartPanel.classList.toggle('open');
}

/**
 * Close cart panel if click is outside
 */
document.addEventListener('click', function(event) {
  const cartPanel = document.getElementById('cartPanel');
  const cartButton = event.target.closest('[onclick*="toggleCart"]');
  
  // If cart is open and click is outside cart panel and not the cart button
  if (cartPanel && cartPanel.classList.contains('open') && 
      !cartPanel.contains(event.target) && !cartButton) {
    cartPanel.classList.remove('open');
  }
});

/**
 * Checkout - create order and show payment form
 */
async function checkout() {
  if (cart.length === 0) {
    showNotification('Your cart is empty', 'error');
    return;
  }

  // Create order first
  const items = cart.map(item => ({
    book_id: item.book.id,
    quantity: item.quantity
  }));

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ items })
    });

    const data = await response.json();

    if (response.ok) {
      // Store order ID for payment processing
      window.currentOrderId = data.orderId;
      window.currentOrderTotal = data.total_amount;
      
      // Show checkout modal with payment form
      showCheckoutModal();
      toggleCart();
    } else {
      showNotification(data.error || 'Failed to create order', 'error');
    }
  } catch (error) {
    console.error('Error placing order:', error);
    showNotification('Network error', 'error');
  }
}

/**
 * Show checkout modal with payment form
 */
function showCheckoutModal() {
  // Populate order summary
  let summaryHtml = '';
  let total = 0;

  cart.forEach(item => {
    const itemTotal = item.book.price * item.quantity;
    total += itemTotal;
    summaryHtml += `
      <div class="checkout-item">
        <div>
          <div class="checkout-item-title">${item.book.title}</div>
          <span class="checkout-item-qty">x${item.quantity}</span>
        </div>
        <span class="checkout-item-price">$${itemTotal.toFixed(2)}</span>
      </div>
    `;
  });

  summaryHtml += `
    <div class="checkout-total-line">
      <span class="checkout-total-label">Total:</span>
      <span class="checkout-total-amount">$${total.toFixed(2)}</span>
    </div>
  `;

  document.getElementById('checkoutSummary').innerHTML = summaryHtml;
  document.getElementById('paymentTotal').textContent = total.toFixed(2);

  // Show modal
  const modal = document.getElementById('checkoutModal');
  modal.style.display = 'block';
}

/**
 * Close checkout modal
 */
function closeCheckoutModal() {
  document.getElementById('checkoutModal').style.display = 'none';
}

/**
 * Format credit card number with spaces
 */
function formatCardNumber(input) {
  let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  let formattedValue = '';
  
  for (let i = 0; i < value.length; i++) {
    if (i > 0 && i % 4 === 0) {
      formattedValue += ' ';
    }
    formattedValue += value[i];
  }
  
  input.value = formattedValue;

  // Detect card type
  detectCardType(value);
}

/**
 * Detect card type (Visa, Mastercard, Amex, etc.)
 */
function detectCardType(cardNumber) {
  const cardIcon = document.getElementById('cardIcon');
  
  if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(cardNumber)) {
    cardIcon.textContent = '💳 Visa';
  } else if (/^5[1-5][0-9]{14}$/.test(cardNumber)) {
    cardIcon.textContent = '💳 Mastercard';
  } else if (/^3[47][0-9]{13}$/.test(cardNumber)) {
    cardIcon.textContent = '💳 Amex';
  } else if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(cardNumber)) {
    cardIcon.textContent = '💳 Discover';
  } else {
    cardIcon.textContent = '';
  }
}

/**
 * Format expiry date MM/YY
 */
function formatExpiryDate(input) {
  let value = input.value.replace(/\D/g, '');
  
  if (value.length >= 2) {
    value = value.slice(0, 2) + '/' + value.slice(2, 4);
  }
  
  input.value = value;
}

/**
 * Process credit card payment
 */
async function processCheckoutPayment(event) {
  event.preventDefault();

  // Get form values
  const cardNumber = document.getElementById('cardNumber').value.replace(/\s+/g, '');
  const cardExpiry = document.getElementById('expiryDate').value;
  const cardCVV = document.getElementById('cvv').value;
  const cardholderName = document.getElementById('cardholderName').value;
  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const address = document.getElementById('address').value;
  const city = document.getElementById('city').value;
  const state = document.getElementById('state').value;
  const zipcode = document.getElementById('zipcode').value;
  const country = document.getElementById('country').value;

  // Validate card information
  if (cardNumber.length < 13 || cardNumber.length > 19) {
    showNotification('Invalid card number', 'error');
    return;
  }

  if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
    showNotification('Invalid expiry date (use MM/YY)', 'error');
    return;
  }

  if (cardCVV.length < 3 || cardCVV.length > 4) {
    showNotification('Invalid CVV', 'error');
    return;
  }

  // Disable submit button
  const submitBtn = document.getElementById('submitPaymentBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  try {
    const response = await fetch(`${API_URL}/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        order_id: window.currentOrderId,
        payment_method: 'credit_card',
        card_number: cardNumber,
        card_expiry: cardExpiry,
        card_cvv: cardCVV,
        cardholder_name: cardholderName,
        billing_name: fullName,
        billing_email: email,
        billing_address: address,
        billing_city: city,
        billing_state: state,
        billing_zipcode: zipcode,
        billing_country: country
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Show success modal
      showPaymentSuccessModal(data);
      
      // Clear cart
      cart = [];
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartDisplay();
      
      // Close checkout modal
      closeCheckoutModal();
      
      // Reset form
      document.getElementById('checkoutForm').reset();
    } else {
      showNotification(data.error || 'Payment failed', 'error');
    }
  } catch (error) {
    console.error('Payment error:', error);
    showNotification('Payment processing error', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = `Complete Purchase - $${window.currentOrderTotal.toFixed(2)}`;
  }
}

/**
 * Show payment success modal
 */
function showPaymentSuccessModal(paymentData) {
  const modal = document.getElementById('successModal');
  
  document.getElementById('successMessage').textContent = 
    `Your payment has been processed successfully! Your order #${paymentData.order.id} is being prepared.`;
  
  const detailsHtml = `
    <div class="success-detail-row">
      <span class="success-detail-label">Order ID:</span>
      <span class="success-detail-value">#${paymentData.order.id}</span>
    </div>
    <div class="success-detail-row">
      <span class="success-detail-label">Payment ID:</span>
      <span class="success-detail-value">${paymentData.payment_id}</span>
    </div>
    <div class="success-detail-row">
      <span class="success-detail-label">Amount:</span>
      <span class="success-detail-value">$${paymentData.order.total_amount.toFixed(2)}</span>
    </div>
    <div class="success-detail-row">
      <span class="success-detail-label">Status:</span>
      <span class="success-detail-value">${paymentData.order.status}</span>
    </div>
  `;
  
  document.getElementById('successDetails').innerHTML = detailsHtml;
  modal.style.display = 'block';
}

/**
 * Close payment success modal
 */
function closeSuccessModal() {
  document.getElementById('successModal').style.display = 'none';
  // Reload page to show updated content
  loadBooks();
}

// ============================================
// ORDER VIEWING FUNCTIONS
// ============================================

/**
 * View all orders (Admin) or user's orders
 */
async function viewMyOrders() {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const orders = await response.json();

    if (orders.length === 0) {
      alert('You have no orders yet.');
      return;
    }

    let html = '<h2>My Orders</h2><div class="orders-list">';
    
    orders.forEach(order => {
      html += `
        <div class="order-card">
          <h3>Order #${order.id}</h3>
          <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
          <p><strong>Status:</strong> <span class="order-status status-${order.status}">${order.status}</span></p>
          <p><strong>Total:</strong> $${order.total_amount.toFixed(2)}</p>
          <button onclick="viewOrderDetails(${order.id})" class="btn btn-info btn-sm">View Details</button>
        </div>
      `;
    });

    html += '</div>';

    // Show in modal
    document.getElementById('bookDetails').innerHTML = html;
    document.getElementById('bookModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading orders:', error);
    showNotification('Failed to load orders', 'error');
  }
}

/**
 * Alias for admin to view all orders
 */
function viewOrders() {
  viewMyOrders();
}

/**
 * View details of a specific order
 * @param {number} orderId - Order ID
 */
async function viewOrderDetails(orderId) {
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const order = await response.json();

    let html = `
      <h2>Order #${order.id}</h2>
      <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      
      <h3>Items</h3>
      <table class="order-items-table">
        <thead>
          <tr>
            <th>Book</th>
            <th>Author</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
    `;

    order.items.forEach(item => {
      html += `
        <tr>
          <td>${item.title}</td>
          <td>${item.author}</td>
          <td>${item.quantity}</td>
          <td>$${item.price_at_purchase.toFixed(2)}</td>
          <td>$${(item.price_at_purchase * item.quantity).toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <p class="order-total"><strong>Total:</strong> $${order.total_amount.toFixed(2)}</p>
    `;

    // Admin can update order status
    if (currentUser.role === 'admin') {
      html += `
        <div class="admin-actions">
          <h4>Update Status</h4>
          <select id="orderStatusSelect">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
          <button onclick="updateOrderStatus(${order.id})" class="btn btn-primary">Update Status</button>
        </div>
      `;
    }

    document.getElementById('bookDetails').innerHTML = html;
    document.getElementById('bookModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading order details:', error);
    showNotification('Failed to load order details', 'error');
  }
}

/**
 * Update order status (Admin only)
 * @param {number} orderId - Order ID
 */
async function updateOrderStatus(orderId) {
  const status = document.getElementById('orderStatusSelect').value;

  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification('Order status updated!', 'success');
      viewOrderDetails(orderId); // Refresh
    } else {
      showNotification(data.error || 'Failed to update status', 'error');
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    showNotification('Network error', 'error');
  }
}

// ============================================
// ADMIN STATISTICS
// ============================================

/**
 * View system statistics (Admin only)
 */
async function viewStats() {
  try {
    const response = await fetch(`${API_URL}/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const stats = await response.json();

    let html = `
      <h2>System Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Books</h3>
          <p class="stat-number">${stats.totalBooks}</p>
        </div>
        <div class="stat-card">
          <h3>Total Users</h3>
          <p class="stat-number">${stats.totalUsers}</p>
        </div>
        <div class="stat-card">
          <h3>Total Orders</h3>
          <p class="stat-number">${stats.totalOrders}</p>
        </div>
        <div class="stat-card">
          <h3>Total Revenue</h3>
          <p class="stat-number">$${stats.totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      <h3>Low Stock Alert</h3>
      ${stats.lowStockBooks && stats.lowStockBooks.length > 0 ? `
        <table class="low-stock-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Stock</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${stats.lowStockBooks.map(book => `
              <tr>
                <td>${book.title}</td>
                <td class="low-stock">${book.stock_quantity}</td>
                <td><button onclick="editBook(${book.id}); closeModal();" class="btn btn-sm btn-warning">Restock</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p>No low stock items</p>'}
    `;

    document.getElementById('bookDetails').innerHTML = html;
    document.getElementById('bookModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading statistics:', error);
    showNotification('Failed to load statistics', 'error');
  }
}

// SUPPLIER ORDERING (ADMIN)
async function viewBooksNeedingReorder() {
  try {
    const response = await fetch(`${API_URL}/books-below-threshold`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const books = await response.json();
    let html = '<h4>Books Below Reorder Threshold</h4>';
    if (books.length === 0) {
      html += '<p>No books need reordering.</p>';
    } else {
      html += `<table class="supplier-table">
        <thead><tr><th>Title</th><th>Stock</th><th>Threshold</th><th>Action</th></tr></thead>
        <tbody>
        ${books.map(b => `
          <tr>
            <td>${b.title}</td>
            <td class="low-stock">${b.stock_quantity}</td>
            <td>${b.reorder_threshold}</td>
            <td><button onclick="showCreateSupplierOrderForm(${b.id})" class="btn btn-sm btn-success">Order</button></td>
          </tr>
        `).join('')}
        </tbody>
      </table>`;
    }
    document.getElementById('supplierOrderResults').innerHTML = html;
  } catch (error) {
    showNotification('Failed to load books below threshold', 'error');
  }
}

async function viewSupplierOrders() {
  try {
    const response = await fetch(`${API_URL}/supplier-orders`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const orders = await response.json();
    let html = '<h4>All Supplier Orders</h4>';
    if (orders.length === 0) {
      html += '<p>No supplier orders found.</p>';
    } else {
      html += `<table class="supplier-table">
        <thead><tr><th>ID</th><th>Book</th><th>Supplier</th><th>Quantity</th><th>Status</th><th>Expected Delivery</th><th>Action</th></tr></thead>
        <tbody>
        ${orders.map(o => `
          <tr>
            <td>${o.id}</td>
            <td>${o.title}</td>
            <td>${o.supplier_name}</td>
            <td>${o.quantity}</td>
            <td>${o.status}</td>
            <td>${o.expected_delivery || 'N/A'}</td>
            <td>
              <select id="supplierOrderStatus${o.id}" onchange="updateSupplierOrderStatus(${o.id})">
                <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                <option value="Received" ${o.status === 'Received' ? 'selected' : ''}>Received</option>
                <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
          </tr>
        `).join('')}
        </tbody>
      </table>`;
    }
    document.getElementById('supplierOrderResults').innerHTML = html;
  } catch (error) {
    showNotification('Failed to load supplier orders', 'error');
  }
}

async function showCreateSupplierOrderForm(bookId = null) {
  // Fetch suppliers and books for the form
  const [suppliersResp, booksResp] = await Promise.all([
    fetch(`${API_URL}/suppliers`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
    fetch(`${API_URL}/books`, { headers: { 'Authorization': `Bearer ${authToken}` } })
  ]);
  const suppliers = await suppliersResp.json();
  const books = await booksResp.json();

  let html = `
    <h4>Create Supplier Order</h4>
    <form id="createSupplierOrderForm" onsubmit="createSupplierOrder(event)">
      <label>Book:</label>
      <select id="supplierOrderBook" required>
        ${books.map(b => `<option value="${b.id}" ${bookId == b.id ? 'selected' : ''}>${b.title}</option>`).join('')}
      </select>
      <label>Supplier:</label>
      <select id="supplierOrderSupplier" required>
        ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
      <label>Quantity:</label>
      <input type="number" id="supplierOrderQuantity" min="1" required>
      <label>Expected Delivery:</label>
      <input type="date" id="supplierOrderDelivery">
      <button type="submit" class="btn btn-primary">Create Order</button>
      <button type="button" onclick="viewSupplierOrders()" class="btn btn-secondary">Cancel</button>
    </form>
  `;
  document.getElementById('supplierOrderResults').innerHTML = html;
}

async function createSupplierOrder(event) {
  event.preventDefault();
  const book_id = document.getElementById('supplierOrderBook').value;
  const supplier_id = document.getElementById('supplierOrderSupplier').value;
  const quantity = document.getElementById('supplierOrderQuantity').value;
  const expected_delivery = document.getElementById('supplierOrderDelivery').value;

  try {
    const response = await fetch(`${API_URL}/supplier-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ book_id, supplier_id, quantity, expected_delivery })
    });
    const data = await response.json();
    if (response.ok) {
      showNotification('Supplier order created successfully!', 'success');
      viewSupplierOrders();
    } else {
      showNotification(data.error || 'Failed to create supplier order', 'error');
    }
  } catch (error) {
    showNotification('Network error', 'error');
  }
}

async function updateSupplierOrderStatus(orderId) {
  const status = document.getElementById(`supplierOrderStatus${orderId}`).value;
  try {
    const response = await fetch(`${API_URL}/supplier-orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (response.ok) {
      showNotification('Supplier order updated!', 'success');
      viewSupplierOrders();
    } else {
      showNotification(data.error || 'Failed to update', 'error');
    }
  } catch (error) {
    showNotification('Network error', 'error');
  }
}

// ============================================
// AUDIT LOG FUNCTIONS (ADMIN)
// ============================================
function formatAuditDetails(details, action) {
  if (!details) return 'N/A';
  
  let parsed = details;
  if (typeof details === 'string') {
    try {
      parsed = JSON.parse(details);
    } catch (e) {
      return details;
    }
  }
  
  // Format Order Actions with clear key-value pairs
  if (action.startsWith('ORDER_')) {
    const lines = [];
    if (parsed.order_id) lines.push(`Order ID: ${parsed.order_id}`);
    if (parsed.total_amount !== undefined) lines.push(`Total: $${parseFloat(parsed.total_amount).toFixed(2)}`);
    if (parsed.items !== undefined) lines.push(`Items: ${parsed.items}`);
    if (parsed.new_status) lines.push(`Status: ${parsed.new_status}`);
    return lines.length > 0 ? lines.join(' | ') : JSON.stringify(parsed);
  }
  
  // Format other actions
  const lines = [];
  for (const [key, value] of Object.entries(parsed)) {
    const formattedKey = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    lines.push(`${formattedKey}: ${value}`);
  }
  return lines.length > 0 ? lines.join(' | ') : JSON.stringify(parsed);
}

function renderAuditLogs(title, logs, summaryHtml = '') {
  let html = `<h4>${title}</h4>`;
  if (summaryHtml) {
    html += summaryHtml;
  }
  if (logs.length === 0) {
    html += '<p>No audit logs found.</p>';
  } else {
    html += `<table class="audit-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Action</th>
          <th>Details</th>
          <th>IP Address</th>
        </tr>
      </thead>
      <tbody>
      ${logs.map(log => {
        const formattedDetails = formatAuditDetails(log.details, log.action);
        return `
        <tr>
          <td title="${new Date(log.created_at).toLocaleString()}">${new Date(log.created_at).toLocaleString()}</td>
          <td title="${log.username || 'N/A'}">${log.username || 'N/A'}</td>
          <td title="${log.action}">${log.action}</td>
          <td title="${formattedDetails}">${formattedDetails}</td>
          <td title="${log.ip_address || 'N/A'}">${log.ip_address || 'N/A'}</td>
        </tr>
      `;
      }).join('')}
      </tbody>
    </table>`;
  }
  document.getElementById('auditLogResults').innerHTML = html;
}

async function viewAuditLogs(actionFilter = '', titleOverride = '') {
  try {
    let url = `${API_URL}/audit-logs`;
    if (actionFilter) {
      url += `?action=${actionFilter}`;
    }
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) {
      let message = 'Failed to load audit logs';
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          message = errorData.error;
        }
      } catch (parseError) {
        // Ignore parse errors and keep default message.
      }
      showNotification(message, 'error');
      return;
    }

    const logs = await response.json();
    if (!Array.isArray(logs)) {
      showNotification('Failed to load audit logs', 'error');
      return;
    }
    const title = titleOverride || `Audit Logs${actionFilter ? ` (${actionFilter}*)` : ''}`;
    renderAuditLogs(title, logs);
  } catch (error) {
    showNotification('Failed to load audit logs', 'error');
  }
}

async function viewSalesLog() {
  try {
    const response = await fetch(`${API_URL}/sales-report`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    // Handle the new response format with orders array
    const rows = data.orders || [];
    const totalSales = data.total_sales || 0;
    const totalOrders = data.total_orders || 0;

    let html = `<h4>Sales Log</h4>
      <p><strong>Total Sales:</strong> $${totalSales.toFixed(2)} (${totalOrders} orders)</p>`;

    if (rows.length === 0) {
      html += '<p>No sales found.</p>';
    } else {
      html += `<table class="sales-report-table">
        <thead><tr><th>Order ID</th><th>Date</th><th>User</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.id}</td>
            <td>${new Date(r.created_at).toLocaleString()}</td>
            <td>${r.username}</td>
            <td>$${Number(r.total_amount || 0).toFixed(2)}</td>
            <td>${r.status}</td>
          </tr>
        `).join('')}
        </tbody>
      </table>`;
    }

    document.getElementById('auditLogResults').innerHTML = html;
  } catch (error) {
    showNotification('Failed to load sales log', 'error');
  }
}

async function viewLoginAttempts() {
  try {
    const response = await fetch(`${API_URL}/audit-logs?action=LOGIN_`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) {
      let message = 'Failed to load login attempts';
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          message = errorData.error;
        }
      } catch (parseError) {
        // Ignore parse errors and keep default message.
      }
      showNotification(message, 'error');
      return;
    }

    const logs = await response.json();
    if (!Array.isArray(logs)) {
      showNotification('Failed to load login attempts', 'error');
      return;
    }
    const totalAttempts = logs.length;
    const successCount = logs.filter(log => log.action === 'LOGIN_SUCCESS').length;
    const failedCount = logs.filter(log => log.action === 'LOGIN_FAILED').length;
    const summary = `<p><strong>Total login attempts:</strong> ${totalAttempts} (Success: ${successCount}, Failed: ${failedCount})</p>`;
    renderAuditLogs('Login Attempts', logs, summary);
  } catch (error) {
    showNotification('Failed to load login attempts', 'error');
  }
}

async function viewOrderActions() {
  await viewAuditLogs('ORDER_', 'Order Actions');
  const orderIdInput = prompt('Enter an order ID to view or cancel. Leave blank to skip.');
  if (!orderIdInput) {
    return;
  }
  const orderId = Number(orderIdInput);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    showNotification('Invalid order ID', 'error');
    return;
  }
  const action = prompt('Type VIEW to open the order, or CANCEL to cancel it.');
  if (!action) {
    return;
  }
  const normalizedAction = action.trim().toUpperCase();
  if (normalizedAction === 'VIEW') {
    viewOrderDetails(orderId);
    return;
  }
  if (normalizedAction === 'CANCEL') {
    const confirmCancel = confirm(`Cancel order #${orderId}?`);
    if (!confirmCancel) {
      return;
    }
    await cancelOrder(orderId);
    viewOrderDetails(orderId);
    return;
  }
  showNotification('Action not recognized. Use VIEW or CANCEL.', 'info');
}

async function cancelOrder(orderId) {
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'cancelled' })
    });
    const data = await response.json();
    if (response.ok) {
      showNotification('Order cancelled.', 'success');
    } else {
      showNotification(data.error || 'Failed to cancel order', 'error');
    }
  } catch (error) {
    showNotification('Network error', 'error');
  }
}

// ============================================
// CASHIER FUNCTIONS
// ============================================
async function viewAllOrders() {
  try {
    const response = await fetch(`${API_URL}/orders/all`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const orders = await response.json();
    
    let html = '<h3>All Orders</h3>';
    if (orders.length === 0) {
      html += '<p>No orders found.</p>';
    } else {
      html += `<table class="orders-table">
        <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
        ${orders.map(o => `
          <tr>
            <td>${o.id}</td>
            <td>${o.username}</td>
            <td>$${o.total_amount.toFixed(2)}</td>
            <td>${o.status}</td>
            <td>${new Date(o.created_at).toLocaleString()}</td>
            <td>
              <select onchange="updateOrderStatusCashier(${o.id}, this.value)">
                <option value="">-- Update --</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button class="btn btn-danger btn-sm" onclick="cancelOrder(${o.id})" ${['cancelled','delivered'].includes(o.status) ? 'disabled' : ''}>Cancel</button>
            </td>
          </tr>
        `).join('')}
        </tbody>
      </table>`;
    }
    document.getElementById('booksGrid').innerHTML = html;
  } catch (error) {
    showNotification('Failed to load orders', 'error');
  }
}

async function viewTodaysSales() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const response = await fetch(`${API_URL}/sales-report?start=${today}&end=${today}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    let html = `<h3>Today's Sales (${today})</h3>`;
    if (!data.orders || data.orders.length === 0) {
      html += '<p>No sales today.</p>';
    } else {
      html += `<p><strong>Total Sales: $${data.total_sales.toFixed(2)}</strong> (${data.total_orders} orders)</p>`;
      html += `<table class="orders-table">
        <thead><tr><th>Order ID</th><th>Time</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
        ${data.orders.map(o => `
          <tr>
            <td>${o.id}</td>
            <td>${new Date(o.created_at).toLocaleTimeString()}</td>
            <td>${o.username}</td>
            <td>$${o.total_amount.toFixed(2)}</td>
            <td>${o.status}</td>
          </tr>
        `).join('')}
        </tbody>
      </table>`;
    }
    document.getElementById('booksGrid').innerHTML = html;
  } catch (error) {
    showNotification('Failed to load today\'s sales', 'error');
  }
}

async function updateOrderStatusCashier(orderId, newStatus) {
  if (!newStatus) return;
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (response.ok) {
      showNotification('Order status updated!', 'success');
      viewAllOrders();
    } else {
      showNotification('Failed to update order', 'error');
    }
  } catch (error) {
    showNotification('Network error', 'error');
  }
}

// ============================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ============================================
window.onclick = function(event) {
  const bookModal = document.getElementById('bookModal');
  const bookFormModal = document.getElementById('bookFormModal');
  
  if (event.target == bookModal) {
    bookModal.style.display = 'none';
  }
  
  if (event.target == bookFormModal) {
    bookFormModal.style.display = 'none';
  }
}
