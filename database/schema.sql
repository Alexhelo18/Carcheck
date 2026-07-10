CREATE TABLE utenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'utente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE officine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(120) NOT NULL,
    citta VARCHAR(80) NOT NULL,
    indirizzo VARCHAR(180) NOT NULL,
    descrizione TEXT,
    rating DECIMAL(2, 1) DEFAULT 0,
    proprietario_id INTEGER,
    FOREIGN KEY (proprietario_id) REFERENCES utenti(id)
);

CREATE TABLE servizi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    officina_id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    prezzo_base DECIMAL(8, 2),
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE prenotazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER,
    officina_id INTEGER NOT NULL,
    servizio VARCHAR(100) NOT NULL,
    data_prenotazione DATE NOT NULL,
    orario VARCHAR(10) NOT NULL,
    note TEXT,
    stato VARCHAR(30) DEFAULT 'in attesa',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES utenti(id),
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE recensioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER,
    officina_id INTEGER NOT NULL,
    voto INTEGER NOT NULL CHECK (voto BETWEEN 1 AND 5),
    testo TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES utenti(id),
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);
