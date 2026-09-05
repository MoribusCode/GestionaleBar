//database.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

console.log('Connessione al database...');

// Percorso al file .db nella stessa cartella
const dbPath = process.env.DB_PATH || path.join(__dirname, 'bar.db');
const db = new sqlite3.Database(dbPath);

// SQLite non applica le foreign key di default: vanno riattivate ad ogni connessione,
// altrimenti "ON DELETE CASCADE" (vedi migrazione order_items più sotto) non avrebbe effetto.
db.run('PRAGMA foreign_keys = ON');

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
      item_purchase BOOLEAN DEFAULT 0, -- flag per item da acquistare (in inventario)
      item_favorite BOOLEAN DEFAULT 0, -- flag per item preferito (mostrato più grande in cassa)
      image_data BLOB,                 -- immagine dell'articolo, caricata da Gestione Articoli
      image_mime_type TEXT             -- content-type dell'immagine (es. image/png)
    )
  `);

  // Tabella ordini (orders), per ora la togliamo
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id INTEGER PRIMARY KEY AUTOINCREMENT,
      bar_id INTEGER NOT NULL,
      order_number INTEGER NOT NULL,
      status TEXT DEFAULT 'in attesa',
      total_price DECIMAL(10,2),
      note TEXT,
      payment_method TEXT,             -- 'contanti' oppure 'pos'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (bar_id) REFERENCES bar(id),
      UNIQUE (bar_id, order_number)
    )
  `);

  // Tabella dettaglio ordini (orders-items)
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      item_name TEXT,
      quantity INTEGER,
      price DECIMAL(10,2),
      status TEXT DEFAULT 'in attesa',
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    )
  `);

  // Tabella utenti (users)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      bar_id INTEGER NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      categories TEXT NOT NULL DEFAULT '[]', -- categorie gestite dall'utente "postazione" (JSON array)
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
      description TEXT,
      receipt_name TEXT,          -- nome file dell'allegato (es. scontrino/scritura di chiusura giornata)
      receipt_mime_type TEXT,     -- content-type dell'allegato
      receipt_data TEXT           -- allegato come data URL base64
    )
  `);
  // Tabella bar
  db.run(`
    CREATE TABLE IF NOT EXISTS bar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      printer_ip TEXT NOT NULL DEFAULT '0.0.0.0',
      order_number INTEGER NOT NULL DEFAULT 0,
      categories TEXT NOT NULL DEFAULT '[]',
      pos_enabled INTEGER NOT NULL DEFAULT 0 -- se il lettore SumUp è abilitato per questo bar
    )
  `);

  // Tabella categorie (articoli/postazioni)
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      auto_complete INTEGER NOT NULL DEFAULT 0 -- se 1, gli articoli sono già "completato" alla creazione dell'ordine
    )
  `);

  // Popolo la tabella categorie con quelle già in uso, solo se è ancora vuota
  // (prima serie di categorie era una lista fissa nel frontend: Cicchetti/Spina/Bar/Drinks).
  db.get('SELECT COUNT(*) AS count FROM categories', (err, row) => {
    if (err) {
      console.error('Errore lettura tabella categories:', err.message);
      return;
    }

    if (row.count === 0) {
      const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
      ['Cicchetti', 'Spina', 'Bar', 'Drinks'].forEach((name) => insertCategory.run(name));
      insertCategory.finalize();
    }
  });

  // Migrazione leggera: aggiunge auto_complete se mancante (categorie i cui articoli non
  // richiedono preparazione: completate subito alla creazione dell'ordine, senza passare
  // dalla coda di una Postazione).
  db.all('PRAGMA table_info(categories)', (err, columns) => {
    if (err) {
      console.error('Errore lettura schema categories:', err.message);
      return;
    }

    const existingColumns = new Set((columns || []).map((column) => column.name));
    if (!existingColumns.has('auto_complete')) {
      db.run("ALTER TABLE categories ADD COLUMN auto_complete INTEGER NOT NULL DEFAULT 0");
    }
  });

  // Migrazione leggera: aggiunge le colonne per l'immagine dell'articolo se mancanti.
  db.all('PRAGMA table_info(items)', (err, columns) => {
    if (err) {
      console.error('Errore lettura schema items:', err.message);
      return;
    }

    const existingColumns = new Set((columns || []).map((column) => column.name));
    const requiredColumns = [
      { name: 'image_data', type: 'BLOB' },
      { name: 'image_mime_type', type: 'TEXT' },
      { name: 'item_favorite', type: 'BOOLEAN DEFAULT 0' }
    ];

    requiredColumns.forEach((column) => {
      if (!existingColumns.has(column.name)) {
        db.run(`ALTER TABLE items ADD COLUMN ${column.name} ${column.type}`);
      }
    });
  });

  // Migrazione leggera: aggiunge bar_id se mancante (utenti creati prima dell'introduzione dei bar multipli).
  db.all('PRAGMA table_info(users)', (err, columns) => {
    if (err) {
      console.error('Errore lettura schema users:', err.message);
      return;
    }

    const existingColumns = new Set((columns || []).map((column) => column.name));
    if (!existingColumns.has('bar_id')) {
      db.run('ALTER TABLE users ADD COLUMN bar_id INTEGER NULL');
    }
    if (!existingColumns.has('categories')) {
      // categorie gestite dall'utente "postazione" (JSON array, stesso pattern di bar.categories)
      db.run("ALTER TABLE users ADD COLUMN categories TEXT NOT NULL DEFAULT '[]'");
    }

    // Migrazione dati: i vecchi ruoli fissi (Cicchetti/Spina/Bar/Drinks) diventano tutti
    // "postazione" con quella singola categoria già assegnata, sostituiti dal ruolo generico
    // con selezione multipla delle categorie.
    const legacyWorkstationRoles = ['Cicchetti', 'Spina', 'Bar', 'Drinks'];
    const placeholders = legacyWorkstationRoles.map(() => '?').join(',');
    db.all(`SELECT id, role, categories FROM users WHERE role IN (${placeholders})`, legacyWorkstationRoles, (err, rows) => {
      if (err) {
        console.error('Errore lettura utenti con ruoli legacy:', err.message);
        return;
      }

      (rows || []).forEach((user) => {
        const existingCategories = JSON.parse(user.categories || '[]');
        const newCategories = existingCategories.includes(user.role)
          ? existingCategories
          : [...existingCategories, user.role];

        db.run('UPDATE users SET role = ?, categories = ? WHERE id = ?', [
          'postazione',
          JSON.stringify(newCategories),
          user.id
        ]);
      });
    });
  });

  // Migrazione leggera: aggiunge pos_enabled se mancante (bar creati prima dell'integrazione SumUp).
  db.all('PRAGMA table_info(bar)', (err, columns) => {
    if (err) {
      console.error('Errore lettura schema bar:', err.message);
      return;
    }

    const existingColumns = new Set((columns || []).map((column) => column.name));
    if (!existingColumns.has('pos_enabled')) {
      db.run("ALTER TABLE bar ADD COLUMN pos_enabled INTEGER NOT NULL DEFAULT 0");
    }
  });

  // Migrazione leggera: aggiunge bar_id/order_number se mancanti (ordini creati prima dei bar multipli).
  db.all('PRAGMA table_info(orders)', (err, columns) => {
    if (err) {
      console.error('Errore lettura schema orders:', err.message);
      return;
    }

    const existingColumns = new Set((columns || []).map((column) => column.name));
    const requiredColumns = [
      { name: 'bar_id', type: 'INTEGER' },
      { name: 'order_number', type: 'INTEGER' },
      { name: 'payment_method', type: 'TEXT' } // 'contanti' oppure 'pos'
    ];

    requiredColumns.forEach((column) => {
      if (!existingColumns.has(column.name)) {
        db.run(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.type}`);
      }
    });
  });

  // Migrazione leggera: aggiunge price se mancante.
  db.all('PRAGMA table_info(order_items)', (err, columns) => {
    if (err) {
      console.error('Errore lettura schema order_items:', err.message);
      return;
    }

    const existingColumns = new Set((columns || []).map((column) => column.name));
    if (!existingColumns.has('price')) {
      db.run('ALTER TABLE order_items ADD COLUMN price DECIMAL(10,2)');
    }
  });

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