from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import uuid

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# Initialize DB on startup
with app.app_context():
    db = get_db_connection()
    with open('schema.sql', 'r') as f:
        db.executescript(f.read())
    db.commit()
    db.close()

# ---------------------------------------------
# RECEPTION MODULE: Register new patient
# ---------------------------------------------
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    db = get_db_connection()
    cursor = db.cursor()
    
    cursor.execute("INSERT INTO patients (name, age, gender, phone, address) VALUES (?, ?, ?, ?, ?)",
                   (data.get('name'), data.get('age'), data.get('gender'), data.get('phone'), data.get('address')))
    patient_id = cursor.lastrowid
    
    visit_id = f"OPC{uuid.uuid4().hex[:8].upper()}"
    cursor.execute("INSERT INTO visits (visit_id, patient_id, department, doctor_name, visit_type, status) VALUES (?, ?, ?, ?, ?, ?)",
                   (visit_id, patient_id, data.get('department'), data.get('doctor_name'), data.get('visit_type', 'WALK IN'), 'WAITING_VITALS'))
    
    db.commit()
    db.close()
    return jsonify({"message": "Registered successfully", "visit_id": visit_id})

# ---------------------------------------------
# NURSE MODULE: View queue and submit vitals
# ---------------------------------------------
@app.route('/api/queue/nurse', methods=['GET'])
def get_nurse_queue():
    db = get_db_connection()
    visits = db.execute('''
        SELECT v.visit_id, p.name, p.age, p.gender, v.department 
        FROM visits v JOIN patients p ON v.patient_id = p.id 
        WHERE v.status = 'WAITING_VITALS'
    ''').fetchall()
    db.close()
    return jsonify([dict(ix) for ix in visits])

@app.route('/api/vitals', methods=['POST'])
def submit_vitals():
    data = request.json
    visit_id = data.get('visit_id')
    db = get_db_connection()
    
    db.execute('''INSERT INTO vitals (visit_id, temperature, heart_rate, bp, spO2, height, weight, bmi) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
               (visit_id, data.get('temp'), data.get('hr'), data.get('bp'), data.get('spo2'), data.get('height'), data.get('weight'), data.get('bmi')))
    
    db.execute("UPDATE visits SET status = 'WAITING_DOCTOR' WHERE visit_id = ?", (visit_id,))
    db.commit()
    db.close()
    return jsonify({"message": "Vitals recorded"})

# ---------------------------------------------
# DOCTOR MODULE: View queue and prescribe
# ---------------------------------------------
@app.route('/api/queue/doctor', methods=['GET'])
def get_doctor_queue():
    db = get_db_connection()
    visits = db.execute('''
        SELECT v.visit_id, p.name, p.age, p.gender, vt.temperature, vt.bp, vt.weight 
        FROM visits v 
        JOIN patients p ON v.patient_id = p.id 
        LEFT JOIN vitals vt ON v.visit_id = vt.visit_id
        WHERE v.status = 'WAITING_DOCTOR'
    ''').fetchall()
    db.close()
    return jsonify([dict(ix) for ix in visits])

@app.route('/api/prescribe', methods=['POST'])
def prescribe():
    data = request.json
    visit_id = data.get('visit_id')
    db = get_db_connection()
    cursor = db.cursor()
    
    cursor.execute("INSERT INTO prescriptions (visit_id, diagnosis, follow_up_date) VALUES (?, ?, ?)",
                   (visit_id, data.get('diagnosis'), data.get('follow_up')))
    prescription_id = cursor.lastrowid
    
    for med in data.get('medications', []):
        cursor.execute('''INSERT INTO medications (prescription_id, medicine_name, route, dose, frequency, timing, duration)
                          VALUES (?, ?, ?, ?, ?, ?, ?)''',
                       (prescription_id, med['name'], med['route'], med['dose'], med['frequency'], med['timing'], med['duration']))
                       
    db.execute("UPDATE visits SET status = 'COMPLETED' WHERE visit_id = ?", (visit_id,))
    db.commit()
    db.close()
    return jsonify({"message": "Prescription saved"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)