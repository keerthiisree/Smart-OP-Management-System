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

with app.app_context():
    db = get_db_connection()
    with open('schema.sql', 'r') as f:
        db.executescript(f.read())
    db.commit()
    db.close()

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    db = get_db_connection()
    cursor = db.cursor()
    
    # UPDATED: Added 'dob' to ensure the calendar date from the UI is saved to the database
    cursor.execute("INSERT INTO patients (name, age, dob, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
                   (data.get('name'), data.get('age'), data.get('dob'), data.get('gender'), data.get('phone'), data.get('address')))
    patient_id = cursor.lastrowid
    
    visit_id = f"OPC{uuid.uuid4().hex[:8].upper()}"
    cursor.execute("INSERT INTO visits (visit_id, patient_id, department, doctor_name, visit_type, status) VALUES (?, ?, ?, ?, ?, ?)",
                   (visit_id, patient_id, data.get('department'), data.get('doctor_name'), data.get('visit_type', 'WALK IN'), 'WAITING_VITALS'))
    
    db.commit()
    db.close()
    return jsonify({"message": "Registered successfully", "visit_id": visit_id})

@app.route('/api/queue/nurse', methods=['GET'])
def get_nurse_queue():
    db = get_db_connection()
    
    # 1. Fetch Triage Queue (Waiting for Vitals)
    waiting = db.execute('''
        SELECT v.visit_id, p.name, p.age, p.gender, v.department 
        FROM visits v JOIN patients p ON v.patient_id = p.id 
        WHERE v.status = 'WAITING_VITALS'
    ''').fetchall()
    
    # 2. Fetch Print Queue (Waiting for Print - NOW WITH VITALS AND PHONE)
    printing_rows = db.execute('''
        SELECT 
            v.visit_id, v.department, v.doctor_name,
            p.name, p.age, p.gender, p.phone,
            pr.id as prescription_id, pr.diagnosis, pr.follow_up_date as follow_up,
            vt.temperature, vt.heart_rate, vt.bp, vt.spO2 as spo2, vt.weight, vt.bmi
        FROM visits v 
        JOIN patients p ON v.patient_id = p.id 
        JOIN prescriptions pr ON v.visit_id = pr.visit_id
        LEFT JOIN vitals vt ON v.visit_id = vt.visit_id
        WHERE v.status = 'WAITING_PRINT'
    ''').fetchall()
    
    # 3. Loop through print queue to attach the Medications list to each patient
    printing_list = []
    for row in printing_rows:
        patient_dict = dict(row)
        
        # Fetch the medications specifically tied to this prescription
        meds = db.execute('''
            SELECT medicine_name as name, route, dose, frequency, timing, duration 
            FROM medications 
            WHERE prescription_id = ?
        ''', (patient_dict['prescription_id'],)).fetchall()
        
        # Attach the meds array to the patient dictionary
        patient_dict['medications'] = [dict(m) for m in meds]
        printing_list.append(patient_dict)
        
    db.close()
    
    return jsonify({
        "waiting": [dict(ix) for ix in waiting],
        "printing": printing_list
    })

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

@app.route('/api/queue/doctor', methods=['GET'])
def get_doctor_queue():
    db = get_db_connection()
    visits = db.execute('''
        SELECT v.visit_id, p.name, p.age, p.gender, 
               vt.temperature, vt.bp, vt.heart_rate, vt.bmi, vt.spO2 as spo2, vt.weight 
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
                       
    db.execute("UPDATE visits SET status = 'WAITING_PRINT' WHERE visit_id = ?", (visit_id,))
    db.commit()
    db.close()
    return jsonify({"message": "Prescription forwarded to print desk"})

@app.route('/api/print/complete', methods=['POST'])
def complete_print():
    visit_id = request.json.get('visit_id')
    db = get_db_connection()
    db.execute("UPDATE visits SET status = 'COMPLETED' WHERE visit_id = ?", (visit_id,))
    db.commit()
    db.close()
    return jsonify({"message": "Session finalized successfully"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)