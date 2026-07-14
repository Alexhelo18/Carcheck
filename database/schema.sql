CREATE TABLE utenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(100) NOT NULL,
    nome_profilo VARCHAR(100),
    cognome VARCHAR(100),
    username VARCHAR(80) UNIQUE,
    data_nascita DATE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'utente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE officine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(120) NOT NULL,
    nazione VARCHAR(80),
    via VARCHAR(180),
    cap VARCHAR(12),
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
    descrizione TEXT,
    categoria VARCHAR(60) DEFAULT 'altro',
    durata_minuti INTEGER NOT NULL DEFAULT 60,
    prezzo_base DECIMAL(8, 2),
    attivo BOOLEAN DEFAULT 1,
    booking_mode VARCHAR(20) NOT NULL DEFAULT 'REQUEST',
    preparation_minutes INTEGER DEFAULT 0,
    capacity_required INTEGER DEFAULT 1,
    manual_approval_required BOOLEAN DEFAULT 1,
    customer_fields TEXT,
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE veicoli (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER NOT NULL,
    marca VARCHAR(80) NOT NULL,
    modello VARCHAR(80) NOT NULL,
    anno INTEGER,
    targa VARCHAR(20),
    alimentazione VARCHAR(40),
    chilometraggio INTEGER,
    versione VARCHAR(120),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES utenti(id)
);

CREATE TABLE workshop_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    officina_id INTEGER NOT NULL,
    giorno_settimana INTEGER NOT NULL,
    open BOOLEAN DEFAULT 1,
    morning_start VARCHAR(5),
    morning_end VARCHAR(5),
    afternoon_start VARCHAR(5),
    afternoon_end VARCHAR(5),
    concurrent_capacity INTEGER DEFAULT 1,
    slot_interval_minutes INTEGER DEFAULT 30,
    min_advance_hours INTEGER DEFAULT 12,
    max_future_days INTEGER DEFAULT 45,
    preparation_minutes INTEGER DEFAULT 0,
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE workshop_closures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    officina_id INTEGER NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    reason VARCHAR(120),
    note TEXT,
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE calendar_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    officina_id INTEGER NOT NULL,
    title VARCHAR(120) NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    capacity_blocked INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    recurrence VARCHAR(80),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE prenotazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER,
    officina_id INTEGER NOT NULL,
    veicolo_id INTEGER,
    servizio_id INTEGER,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    booking_mode VARCHAR(20) NOT NULL DEFAULT 'REQUEST',
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    capacity_required INTEGER NOT NULL DEFAULT 1,
    customer_notes TEXT,
    workshop_notes TEXT,
    warning_lights TEXT,
    estimated_price DECIMAL(8, 2),
    cancellation_policy TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    completed_at DATETIME,
    cancelled_at DATETIME,
    cancelled_by VARCHAR(40),
    cancellation_reason TEXT,
    FOREIGN KEY (utente_id) REFERENCES utenti(id),
    FOREIGN KEY (officina_id) REFERENCES officine(id),
    FOREIGN KEY (veicolo_id) REFERENCES veicoli(id),
    FOREIGN KEY (servizio_id) REFERENCES servizi(id)
);

CREATE TABLE booking_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(80),
    note TEXT,
    previous_status VARCHAR(40),
    new_status VARCHAR(40),
    FOREIGN KEY (booking_id) REFERENCES prenotazioni(id)
);

CREATE TABLE booking_reschedule_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    capacity_required INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    status VARCHAR(40) DEFAULT 'PENDING',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES prenotazioni(id)
);

CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    utente_id INTEGER,
    officina_id INTEGER,
    type VARCHAR(80) NOT NULL,
    channel VARCHAR(40) DEFAULT 'internal',
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES prenotazioni(id),
    FOREIGN KEY (utente_id) REFERENCES utenti(id),
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE vehicle_service_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    veicolo_id INTEGER NOT NULL,
    booking_id INTEGER,
    officina_id INTEGER NOT NULL,
    servizio VARCHAR(120),
    data_intervento DATE,
    chilometraggio INTEGER,
    descrizione TEXT,
    componenti_sostituiti TEXT,
    prossimo_controllo DATE,
    visibility VARCHAR(40) DEFAULT 'owner_only',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (veicolo_id) REFERENCES veicoli(id),
    FOREIGN KEY (booking_id) REFERENCES prenotazioni(id),
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE platform_fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL UNIQUE,
    officina_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(40) DEFAULT 'DUE',
    matured_at DATETIME,
    paid_at DATETIME,
    reversed_at DATETIME,
    dispute_note TEXT,
    FOREIGN KEY (booking_id) REFERENCES prenotazioni(id),
    FOREIGN KEY (officina_id) REFERENCES officine(id)
);

CREATE TABLE recensioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER,
    officina_id INTEGER NOT NULL,
    booking_id INTEGER,
    voto INTEGER NOT NULL CHECK (voto BETWEEN 1 AND 5),
    testo TEXT NOT NULL,
    verified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES utenti(id),
    FOREIGN KEY (officina_id) REFERENCES officine(id),
    FOREIGN KEY (booking_id) REFERENCES prenotazioni(id)
);
