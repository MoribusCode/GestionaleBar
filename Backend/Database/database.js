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
      category TEXT NOT NULL,
      note TEXT,
      minimum_stock INTEGER NOT NULL DEFAULT 0,
      practical_unit TEXT NOT NULL,    -- unità di misura (es. pezzi, confezioni, bottiglie etc.)
      item_sale BOOLEAN DEFAULT 0,     -- flag per item in vendita
      item_purchase BOOLEAN DEFAULT 0  -- flag per item da acquistare (in inventario)
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

  // Tabella dettaglio ordini (orders-items)
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

  // Tabella inventartio (inventory)
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Tabella transazioni (transactions)
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      amount DECIMAL(10,2) NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
      description TEXT
    )
  `);

  // Migrazione leggera: aggiunge colonne mancanti per allegati scontrino.
  db.all('PRAGMA table_info(transactions)', (err, columns) => {
    if (err) {
      console.error('Errore lettura schema transactions:', err.message);
      return;
    }

    const existingColumns = new Set((columns || []).map((column) => column.name));
    const requiredColumns = [
      { name: 'receipt_name', type: 'TEXT' },
      { name: 'receipt_mime_type', type: 'TEXT' },
      { name: 'receipt_data', type: 'TEXT' }
    ];

    requiredColumns.forEach((column) => {
      if (!existingColumns.has(column.name)) {
        db.run(`ALTER TABLE transactions ADD COLUMN ${column.name} ${column.type}`);
      }
    });
  });
});

module.exports = db;

console.log('Connessione avviata');