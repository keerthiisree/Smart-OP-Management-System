CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age TEXT,
    gender TEXT,
    phone TEXT,
    address TEXT,
    registration_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
    visit_id TEXT PRIMARY KEY,
    patient_id INTEGER,
    department TEXT,
    doctor_name TEXT,
    visit_type TEXT, -- e.g., 'WALK IN'
    status TEXT DEFAULT 'WAITING_VITALS', -- Queue Status: WAITING_VITALS, WAITING_DOCTOR, COMPLETED
    visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients (id)
);

CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id TEXT,
    temperature REAL,
    heart_rate INTEGER,
    bp TEXT, -- e.g., 120/80
    spO2 INTEGER,
    height REAL,
    weight REAL,
    bmi REAL,
    FOREIGN KEY (visit_id) REFERENCES visits (visit_id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id TEXT,
    diagnosis TEXT,
    follow_up_date TEXT,
    FOREIGN KEY (visit_id) REFERENCES visits (visit_id)
);

CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER,
    medicine_name TEXT,
    route TEXT,
    dose TEXT,
    frequency TEXT,
    timing TEXT, -- e.g., 'After Food'
    duration TEXT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions (id)
);