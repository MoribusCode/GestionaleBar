//database.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

console.log('Connessione al database...');

// Percorso al file .db nella stessa cartella
const dbPath = process.env.DB_PATH || path.join(__dirname, 'bar.db');
const db = new sqlite3.Database(dbPath);

// Crea le tabelle se non esistono
db.serialize(() => {

  // Tabella articoli (items)
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT
    )
  `);

  // Tabella ordini (orders), per ora la togliamo

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id INTEGER PRIMARY KEY,
      status TEXT DEFAULT 'in attesa',
      total_price DECIMAL(10,2),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella dettaglio ordini(orders-items)
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      item_name TEXT,
      quantity INTEGER,
      status TEXT DEFAULT 'in attesa',
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // Tabella utenti (users)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;

console.log('Connessione avviata');