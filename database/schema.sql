-- SQL schema for airline reservation system
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS sales;

CREATE TABLE flights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flight_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  agent_id INTEGER,
  FOREIGN KEY (flight_id) REFERENCES flights(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  reservation_id INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);

-- Dummy data
INSERT INTO flights (origin, destination, date, status) VALUES
('New York', 'London', '2025-12-01', 'On Time'),
('London', 'Paris', '2025-12-02', 'Delayed'),
('Paris', 'Rome', '2025-12-03', 'On Time');

INSERT INTO agents (name) VALUES ('Agent Smith'), ('Agent Johnson');
