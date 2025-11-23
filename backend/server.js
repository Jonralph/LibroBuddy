
// Express backend for airline reservation system

// Import required modules
const express = require('express'); // Web framework for Node.js
const bodyParser = require('body-parser'); // Middleware to parse request bodies
const sqlite3 = require('sqlite3').verbose(); // SQLite database driver
const nodemailer = require('nodemailer'); // For sending emails (not used in demo, but included for notification simulation)
const path = require('path'); // Utility for file paths


const app = express(); // Create Express app
// Use environment variable for port if available, otherwise default to 3000
const PORT = process.env.PORT || 3000;

// Database setup: Connect to SQLite database file
const db = new sqlite3.Database(path.join(__dirname, '../database/airline.db'));

// Helper function for input validation
function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

// Middleware to parse JSON and URL-encoded data from requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- ROUTES ---

// 1. Search flights
// Endpoint: GET /flights?from=...&to=...&date=...
// Returns all flights matching the origin, destination, and date
// Search flights endpoint
app.get('/flights', (req, res, next) => {
  const { from, to, date } = req.query; // Get search parameters from query string
  // Basic validation
  if (!from || !to || !date) {
    return res.status(400).json({ error: 'Missing required search parameters.' });
  }
  db.all(
    'SELECT * FROM flights WHERE origin = ? AND destination = ? AND date = ?',
    [from, to, date],
    (err, rows) => {
      if (err) return next(err); // Use global error handler
      res.json(rows); // Return matching flights as JSON
    }
  );
});

// 2. Purchase flight
// Endpoint: POST /purchase
// Body: { flightId, customerName, customerEmail, creditCard, agentId (optional) }
// Simulates payment, creates reservation, and tracks agent sales
// Purchase flight endpoint
app.post('/purchase', (req, res, next) => {
  const { flightId, customerName, customerEmail, creditCard, agentId } = req.body;
  // Validate required fields
  if (!flightId || !customerName || !customerEmail || !creditCard) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Ensure flightId is a positive integer
  const flightIdNum = Number(flightId);
  if (!isPositiveInteger(flightIdNum)) {
    return res.status(400).json({ error: 'Flight ID must be a positive integer' });
  }
  // If agentId is provided, ensure it is positive
  let agentIdNum = null;
  if (agentId) {
    agentIdNum = Number(agentId);
    if (!isPositiveInteger(agentIdNum)) {
      return res.status(400).json({ error: 'Agent ID must be a positive integer' });
    }
  }
  // Simulate payment (no real processing in demo)
  // Insert reservation into database
  db.run(
    'INSERT INTO reservations (flight_id, customer_name, customer_email, agent_id) VALUES (?, ?, ?, ?)',
    [flightIdNum, customerName, customerEmail, agentIdNum],
    function (err) {
      if (err) return next(err);
      // If an agent is provided, record the sale for the agent
      if (agentIdNum) {
        db.run(
          'INSERT INTO sales (agent_id, reservation_id) VALUES (?, ?)',
          [agentIdNum, this.lastID]
        );
      }
      // Respond with reservation ID
      res.json({ success: true, reservationId: this.lastID });
    }
  );
});

// 3. Cancel reservation
// Endpoint: POST /cancel
// Body: { reservationId }
// Cancels a reservation and simulates notification to customer
// Cancel reservation endpoint
app.post('/cancel', (req, res, next) => {
  const { reservationId } = req.body;
  if (!reservationId) return res.status(400).json({ error: 'Missing reservationId' });
  const reservationIdNum = Number(reservationId);
  if (!isPositiveInteger(reservationIdNum)) {
    return res.status(400).json({ error: 'Reservation ID must be a positive integer' });
  }
  // Find reservation in database
  db.get(
    'SELECT * FROM reservations WHERE id = ?',
    [reservationIdNum],
    (err, reservation) => {
      if (err) return next(err);
      if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
      // Delete reservation
      db.run('DELETE FROM reservations WHERE id = ?', [reservationIdNum], err2 => {
        if (err2) return next(err2);
        // Simulate notification (console log, could use nodemailer for real email)
        console.log(`Notification: Reservation for ${reservation.customer_email} cancelled.`);
        res.json({ success: true });
      });
    }
  );
});

// 4. Check flight status
// Endpoint: GET /status/:flightId
// Returns the status and details of a specific flight
// Check flight status endpoint
app.get('/status/:flightId', (req, res, next) => {
  const { flightId } = req.params;
  const flightIdNum = Number(flightId);
  if (!isPositiveInteger(flightIdNum)) {
    return res.status(400).json({ error: 'Flight ID must be a positive integer' });
  }
  db.get('SELECT * FROM flights WHERE id = ?', [flightIdNum], (err, row) => {
    if (err) return next(err);
    if (!row) return res.status(404).json({ error: 'Flight not found' });
    res.json(row); // Return flight details
  });
});


// --- Serve frontend ---
// Serve static files (HTML, JS) from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Global Error Handler Middleware ---
// This will catch any errors passed to next(err) and send a consistent response
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
