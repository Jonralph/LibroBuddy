# Airline Reservation System

This project is a demo online airline reservation system with Node.js (Express), SQLite, and a simple HTML frontend.

## Features
- Search for flights
- Purchase flights (credit card simulation)
- Cancel reservations (with notification simulation)
- Check flight status
- Track agents and sales

## Setup

1. Install dependencies:
   ```
npm install
   ```
2. Initialize the database:
   ```
node database/init_db.js
   ```
3. Start the server:
   ```
npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### PowerShell Script Execution Policy Fix (if needed)
If you see an error like:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```
You need to allow local scripts to run. Open PowerShell as Administrator and run:
```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Then restart your terminal and continue with the steps below.

## Demo Data
- Flights and agents are preloaded in the database.

---

**Note:** This is a demo system. Payment and notifications are simulated.
