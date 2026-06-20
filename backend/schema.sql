CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dob DATE,                      
    age INTEGER,                   
    gender TEXT,
    phone TEXT,
    address TEXT,
    organ_donor BOOLEAN DEFAULT 0, 
    blockchain_hash TEXT,          
    registration_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
    visit_id TEXT PRIMARY KEY,
    patient_id INTEGER,
    department TEXT,
    doctor_name TEXT,
    visit_type TEXT, 
    status TEXT DEFAULT 'WAITING_VITALS', 
    visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients (id)
);

CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id TEXT,
    temperature REAL,
    heart_rate INTEGER,
    bp TEXT, 
    spO2 INTEGER,
    height REAL,
    weight REAL,
    bmi REAL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (visit_id) REFERENCES visits (visit_id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id TEXT,
    diagnosis TEXT,
    follow_up_date TEXT,
    prescribed_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (visit_id) REFERENCES visits (visit_id)
);

CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER,
    medicine_name TEXT,
    route TEXT,
    dose TEXT,
    frequency TEXT,
    timing TEXT, 
    duration TEXT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions (id)
);

-- Blockchain audit cross-reference: links each SQL record to its on-chain block
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id TEXT NOT NULL,
    action TEXT NOT NULL,           -- REGISTER | VITALS | PRESCRIPTION
    user_id TEXT NOT NULL,          -- Staff ID who performed the action
    block_index INTEGER NOT NULL,   -- Index in ledger.json
    block_hash TEXT NOT NULL,       -- Hash of the sealed block
    sealed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits (visit_id)
);