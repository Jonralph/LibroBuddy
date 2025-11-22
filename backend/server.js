
// Express backend for airline reservation system

// Import required modules
const express = require('express'); // Web framework for Node.js
const bodyParser = require('body-parser'); // Middleware to parse request bodies
const sqlite3 = require('sqlite3').verbose(); // SQLite database driver
const nodemailer = require('nodemailer'); // For sending emails (not used in demo, but included for notification simulation)
const path = require('path'); // Utility for file paths

const app = express(); // Create Express app
const PORT = 3000; // Port to run the server

// Database setup: Connect to SQLite database file
const db = new sqlite3.Database(path.join(__dirname, '../database/airline.db'));

// Middleware to parse JSON and URL-encoded data from requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- ROUTES ---

// 1. Search flights
// Endpoint: GET /flights?from=...&to=...&date=...
// Returns all flights matching the origin, destination, and date
app.get('/flights', (req, res) => {
  const { from, to, date } = req.query; // Get search parameters from query string
  db.all(
    'SELECT * FROM flights WHERE origin = ? AND destination = ? AND date = ?',
    [from, to, date],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message }); // Handle DB errors
      res.json(rows); // Return matching flights as JSON
    }
  );
});

// 2. Purchase flight
// Endpoint: POST /purchase
// Body: { flightId, customerName, customerEmail, creditCard, agentId (optional) }
// Simulates payment, creates reservation, and tracks agent sales
app.post('/purchase', (req, res) => {
  const { flightId, customerName, customerEmail, creditCard, agentId } = req.body;
  // Validate required fields
  if (!flightId || !customerName || !customerEmail || !creditCard) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Ensure flightId is a positive integer
  if (isNaN(flightId) || Number(flightId) < 1) {
    return res.status(400).json({ error: 'Flight ID must be a positive number' });
  }
  // If agentId is provided, ensure it is positive
  if (agentId && (isNaN(agentId) || Number(agentId) < 1)) {
    return res.status(400).json({ error: 'Agent ID must be a positive number' });
  }
  // Simulate payment (no real processing in demo)
  // Insert reservation into database
  db.run(
    'INSERT INTO reservations (flight_id, customer_name, customer_email, agent_id) VALUES (?, ?, ?, ?)',
    [flightId, customerName, customerEmail, agentId || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      // If an agent is provided, record the sale for the agent
      if (agentId) {
        db.run(
          'INSERT INTO sales (agent_id, reservation_id) VALUES (?, ?)',
          [agentId, this.lastID]
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
app.post('/cancel', (req, res) => {
  const { reservationId } = req.body;
  if (!reservationId) return res.status(400).json({ error: 'Missing reservationId' });
  // Ensure reservationId is a positive integer
  if (isNaN(reservationId) || Number(reservationId) < 1) {
    return res.status(400).json({ error: 'Reservation ID must be a positive number' });
  }
  // Find reservation in database
  db.get(
    'SELECT * FROM reservations WHERE id = ?',
    [reservationId],
    (err, reservation) => {
      if (err || !reservation) return res.status(404).json({ error: 'Reservation not found' });
      // Delete reservation
      db.run('DELETE FROM reservations WHERE id = ?', [reservationId], err2 => {
        if (err2) return res.status(500).json({ error: err2.message });
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
app.get('/status/:flightId', (req, res) => {
  const { flightId } = req.params;
  // Ensure flightId is a positive integer
  if (isNaN(flightId) || Number(flightId) < 1) {
    return res.status(400).json({ error: 'Flight ID must be a positive number' });
  }
  db.get('SELECT * FROM flights WHERE id = ?', [flightId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Flight not found' });
    res.json(row); // Return flight details
  });
});

// --- Serve frontend ---
// Serve static files (HTML, JS) from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
