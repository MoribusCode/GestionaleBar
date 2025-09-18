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

  //sta roba è provvisoria per aggiungere gli articoli di prova a 'items' intanto che è vuota, intanto ignora
  db.get('SELECT COUNT(*) AS count FROM items', (err, row) => {
    if (err) {
      console.error('Errore nel controllo count items:', err.message);
      return;
    }

    if (row.count === 0) {

      const insert = db.prepare('INSERT INTO items (name, price, category) VALUES (?, ?, ?)');
  
      insert.run('Birra', 5.00, 'Spina');
      insert.run('Aperol', 3.00, 'Drink');
      insert.run('Cicchetti', 4.00, 'Cibo');
      insert.run('Gin Tonic', 7.00, 'Drink');

      insert.finalize(() => {
        console.log("Articoli iniziali inseriti nel DB.");
      });

    } else {
      console.log("Articoli già presenti nel DB.");
    }
  });
});

module.exports = db;

console.log('Connessione avviata');