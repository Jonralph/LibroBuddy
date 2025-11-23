# Getaway Airline Reservation System

This project is a demo online airline reservation system built with Node.js (Express), SQLite, and a modern HTML/CSS/JS frontend. It is designed for easy setup, learning, and demonstration.

**All commands below should be run in Windows PowerShell.**

**Important:** You must be in the project folder (where `package.json` is located) to run any `npm` commands. See below for how to change directories.

---

## Features

- **Search for flights:** Find available flights by origin, destination, and date.
- **Purchase flights:** Book a ticket using a simple form (credit card is simulated, not real).
- **Cancel reservations:** Cancel an existing reservation by ID.
- **Check flight status:** View the status and details of any flight.
- **Track agents and sales:** Optionally associate a sale with an agent.

---

## How to Install and Run This Project (Step-by-Step)

### 1. Clone the Repository

Download the project code from GitHub to your computer. In PowerShell, run:

```powershell
git clone https://github.com/Jonralph/Project-demo.git
```

This will create a folder called `Project-demo` in your current directory.

**Change into the project directory:**

```powershell
cd Project-demo
```

You must run all further commands from inside this folder. To check your current folder, run:

```powershell
pwd
```
It should end with `Project-demo`.

### 2. Install Node.js (if you don’t have it)

- Go to [https://nodejs.org/](https://nodejs.org/) and download the LTS version for your operating system.
- Install it using the default options.
- To check if Node.js is installed, run:
  ```sh
  node --version
  npm --version
  ```
  Both should print a version number.

### 3. Install Project Dependencies

This will install all the required libraries (Express, SQLite, etc.). Make sure you are still in the `Project-demo` folder:

```powershell
npm install
```

### 4. Initialize the Database

This creates the database file and loads sample data. Run this in the `Project-demo` folder:

```powershell
node database/init_db.js
```

You should see “Database initialized successfully.”

### 5. Start the Server

This will launch the backend and serve the website. Run this in the `Project-demo` folder:

```powershell
npm start
```

You should see “Server running on http://localhost:3000” in your terminal.

### 6. Open the Website

Open your web browser and go to:

```
http://localhost:3000
```

You’ll see the Getaway airline reservation system homepage.

---

## Troubleshooting & Common Issues

- **PowerShell Script Execution Policy Error (Windows):**
  If you see an error like:
  ```
  npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
  ```
  Fix it by opening PowerShell as Administrator and running:
  ```
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
  Then restart your terminal and try again.

- **Port Already in Use:**
  If you get an error about port 3000 being in use, close any other apps using that port or change the port in `backend/server.js`.

- **Database Not Found:**
  Always run `node database/init_db.js` before starting the server for the first time.

---

## Demo Data (for Testing)

The following data is preloaded in the database for testing:

### Flights
| ID | Origin    | Destination | Date        | Status   |
|----|-----------|-------------|-------------|----------|
| 1  | New York  | London      | 2025-12-01  | On Time  |
| 2  | London    | Paris       | 2025-12-02  | Delayed  |
| 3  | Paris     | Rome        | 2025-12-03  | On Time  |

### Agents
| ID | Name          |
|----|---------------|
| 1  | Agent Smith   |
| 2  | Agent Johnson |

No customers or reservations are preloaded. You can create them by using the forms in the app.

---

## How the System Works

1. **Search Flights:** Enter origin, destination, and date. Results show as cards.
2. **Purchase Ticket:** Enter a valid Flight ID and your info. You’ll get a reservation ID.
3. **Cancel Reservation:** Enter your reservation ID to cancel.
4. **Check Flight Status:** Enter a Flight ID to see its status.

All actions are done through the website’s forms. No real payments are processed.

---

**Note:** This is a demo system. Payment and notifications are simulated. For questions or help, open an issue on GitHub.
