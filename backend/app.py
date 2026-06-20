"""
Smart-OP Management System — Backend with Blockchain Audit Trail
================================================================
Every clinical action (REGISTER, VITALS, PRESCRIPTION) is:
  1. Signed locally by the React frontend using ECDSA P-256 (Web Crypto API)
  2. Verified here using the staff's public key
  3. Sealed into an append-only blockchain ledger (ledger.json)
  4. Stored in SQLite for fast UI queries
"""

import hashlib
import json
import os
import sqlite3
import time
import uuid
import logging
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.exceptions import InvalidSignature

# ── Setup ──────────────────────────────────────────────────────────────────────
load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)
USED_NONCES: set[str] = set()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

DEMO_MODE = os.environ.get("DEMO_MODE", "false").lower() == "true"
FLASK_PORT = int(os.environ.get("FLASK_PORT", "5001"))
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))

if DEMO_MODE:
    logger.warning("DEMO_MODE is enabled — /api/demo_keys is active.")

# ── Load staff public keys ──────────────────────────────────────────────────────
KEYS_PATH = os.path.join(BASE_DIR, "users_keys.json")
with open(KEYS_PATH, "r", encoding="utf-8") as f:
    USERS: dict = json.load(f)

def _load_private_key_from_env(user_id: str) -> str | None:
    """Return private key PEM for user_id from environment (DEMO only)."""
    env_var = f"PRIVATE_KEY_{user_id.replace('-', '_')}"
    pem = os.environ.get(env_var, "")
    return pem.replace("\\n", "\n") if pem else None

def load_public_key(pem_str: str):
    return serialization.load_pem_public_key(pem_str.encode())

# ── ECDSA signature verification ───────────────────────────────────────────────
def verify_signature(user_id: str, patient_id: str, action: str, signature_hex: str) -> bool:
    """
    Verify that the staff member (user_id) correctly signed '{patient_id}:{action}'.
    The frontend signs using Web Crypto (P-256 / SHA-256 / DER encoded).
    """
    user = USERS.get(user_id)
    if not user:
        logger.warning("verify_signature: unknown user %s", user_id)
        return False
    pub_pem = user.get("public_key", "")
    if not pub_pem:
        logger.error("No public_key for user %s", user_id)
        return False
    try:
        public_key = load_public_key(pub_pem)
        message    = f"{patient_id}:{action}".encode()
        public_key.verify(bytes.fromhex(signature_hex), message, ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, Exception) as e:
        logger.warning("Signature invalid for %s: %s", user_id, e)
        return False

# ── Role Validation ────────────────────────────────────────────────────────
ROLE_PERMISSIONS = {
    "REGISTER": "Receptionist",
    "VITALS": "Nurse",
    "PRESCRIPTION": "Doctor",
}

def verify_role(user_id: str, required_action: str) -> bool:
    """Check that the user has the appropriate role for the action."""
    user = USERS.get(user_id)
    if not user:
        logger.warning("verify_role: unknown user %s", user_id)
        return False
    expected_role = ROLE_PERMISSIONS.get(required_action)
    return user.get("role") == expected_role

# ── Blockchain ────────────────────────────────────────────────────────────────────
LEDGER_PATH = os.path.join(BASE_DIR, "ledger.json")
blockchain_lock = threading.Lock()

class Block:
    def __init__(self, index, visit_id, user_id, action, data_hash,
                 previous_hash, signature="", timestamp=None, hash=None):
        self.index         = index
        self.timestamp     = timestamp if timestamp is not None else time.time()
        self.visit_id      = visit_id
        self.user_id       = user_id
        self.action        = action
        self.data_hash     = data_hash
        self.signature     = signature
        self.previous_hash = previous_hash
        self.hash          = hash if hash is not None else self.calculate_hash()

    def calculate_hash(self) -> str:
        content = json.dumps({
            "index":         self.index,
            "timestamp":     self.timestamp,
            "visit_id":      self.visit_id,
            "user_id":       self.user_id,
            "action":        self.action,
            "data_hash":     self.data_hash,
            "signature":     self.signature,
            "previous_hash": self.previous_hash,
        }, sort_keys=True).encode()
        return hashlib.sha256(content).hexdigest()

    def to_dict(self) -> dict:
        return {
            "index":         self.index,
            "timestamp":     self.timestamp,
            "visit_id":      self.visit_id,
            "user_id":       self.user_id,
            "action":        self.action,
            "data_hash":     self.data_hash,
            "signature":     self.signature,
            "previous_hash": self.previous_hash,
            "hash":          self.hash,
        }


class Blockchain:
    def __init__(self):
        self.chain: list[Block] = []
        self._load()

    def _load(self):
        if os.path.exists(LEDGER_PATH):
            try:
                with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                    for blk in json.load(f):
                        self.chain.append(Block(**blk))
            except Exception as e:
                logger.error("Failed to load ledger: %s. Starting fresh.", e)
        if not self.chain:
            self.chain.append(self._genesis())
        if not self.is_valid():
            logger.error("INTEGRITY WARNING: ledger.json failed chain validation!")

    def _save(self):
        with open(LEDGER_PATH, "w", encoding="utf-8") as f:
            json.dump([b.to_dict() for b in self.chain], f, indent=2)

    def _genesis(self) -> Block:
        return Block(0, "GENESIS", "SYSTEM", "GENESIS", "0", "0")

    def latest(self) -> Block:
        return self.chain[-1]

    def add_block(self, visit_id: str, user_id: str, action: str,
                  data_hash: str, signature: str) -> Block:
        with blockchain_lock:
            blk = Block(
                index         = len(self.chain),
                visit_id      = visit_id,
                user_id       = user_id,
                action        = action,
                data_hash     = data_hash,
                previous_hash = self.latest().hash,
                signature     = signature,
            )
            self.chain.append(blk)
            self._save()
            logger.info("⛓ Block #%d sealed — %s by %s for %s",
                        blk.index, action, user_id, visit_id)
            return blk

    def is_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            curr = self.chain[i]
            prev = self.chain[i - 1]
            if curr.hash != curr.calculate_hash():
                return False
            if curr.previous_hash != prev.hash:
                return False
        return True


ledger = Blockchain()

def make_data_hash(payload: dict) -> str:
    """Deterministic SHA-256 of a dict for on-chain anchoring."""
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()

# ── SQLite helpers ─────────────────────────────────────────────────────────────
def get_db():
    db_path = os.path.join(BASE_DIR, "database.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# Initialise schema on startup
with app.app_context():
    db = get_db()
    schema_path = os.path.join(BASE_DIR, "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        db.executescript(f.read())
    db.commit()
    db.close()

# ── Demo-key endpoint ──────────────────────────────────────────────────────────
@app.route("/api/demo_keys", methods=["GET"])
def get_demo_keys():
    if not DEMO_MODE:
        return jsonify({"error": "Only available in DEMO_MODE."}), 403
    result = {}
    for uid, info in USERS.items():
        result[uid] = {
            "role":        info["role"],
            "public_key":  info.get("public_key", ""),
            "private_key": _load_private_key_from_env(uid) or "",
        }
    return jsonify(result), 200

# ── Patient Registration ───────────────────────────────────────────────────────
@app.route("/api/register", methods=["POST"])
def register():
    data            = request.get_json() or {}
    name            = data.get("name")
    age             = data.get("age")
    dob             = data.get("dob")
    gender          = data.get("gender")
    phone           = data.get("phone")
    address         = data.get("address", "")
    department      = data.get("department")
    doctor_name     = data.get("doctor_name")
    visit_type      = data.get("visit_type", "WALK IN")
    receptionist_id = data.get("receptionist_id", "REC-101")
    signature       = data.get("signature")
    # Frontend generates a patientId (PAT-...) locally, signs it, and sends it as `patient_id`.
    # We must use EXACTLY this same value for signature verification.
    visit_id        = data.get("patient_id") or data.get("visit_id") or f"OPC{uuid.uuid4().hex[:8].upper()}"

    if not all([name, gender, phone, signature]):
        return jsonify({"error": "Missing required fields or signature."}), 400

    # Extract and verify nonce
    nonce = data.get('nonce')
    if not check_and_consume_nonce(nonce):
        logger.warning("REJECTED registration — replay nonce used from %s (visit_id=%s)", receptionist_id, visit_id)
        return jsonify({"error": "Replay attack detected: nonce reused."}), 400
    # Role validation
    if not verify_role(receptionist_id, "REGISTER"):
        logger.warning("REJECTED registration — role mismatch for %s", receptionist_id)
        return jsonify({"error": "User role not authorized for registration."}), 403
    # Message signed by frontend: f"{patient_id}:REGISTER"
    if not verify_signature(receptionist_id, visit_id, "REGISTER", signature):
        logger.warning("REJECTED registration — invalid signature from %s (visit_id=%s)", receptionist_id, visit_id)
        return jsonify({"error": "Invalid cryptographic signature. Registration rejected."}), 403


    # ── SQLite insert ──
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO patients (name, age, dob, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
            (name, age, dob, gender, phone, address)
        )
        patient_db_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO visits (visit_id, patient_id, department, doctor_name, visit_type, status) VALUES (?, ?, ?, ?, ?, ?)",
            (visit_id, patient_db_id, department, doctor_name, visit_type, "WAITING_VITALS")
        )
        db.commit()
    finally:
        db.close()

    # ── Blockchain seal ──
    payload   = {"name": name, "age": str(age), "gender": gender, "visit_id": visit_id}
    data_hash = make_data_hash(payload)
    USED_NONCES: set[str] = set()

def check_and_consume_nonce(nonce: str) -> bool:
    """Return True if nonce is fresh, store it; otherwise False for replay."""
    if not nonce:
        return False
    if nonce in USED_NONCES:
        return False
    USED_NONCES.add(nonce)
    return True

    return jsonify({
        "message":     "Patient registered and block sealed on-chain.",
        "visit_id":    visit_id,
        "block_index": block.index,
        "block_hash":  block.hash,
    }), 201

# ── Nurse Queue ────────────────────────────────────────────────────────────────
@app.route("/api/queue/nurse", methods=["GET"])
def get_nurse_queue():
    db = get_db()
    waiting_rows = db.execute(
        "SELECT v.visit_id, p.name, p.age, p.gender, v.department "
        "FROM visits v JOIN patients p ON v.patient_id = p.id "
        "WHERE v.status = 'WAITING_VITALS'"
    ).fetchall()

    printing_rows = db.execute(
        "SELECT v.visit_id, v.department, v.doctor_name, "
        "p.name, p.age, p.gender, p.phone, "
        "pr.id as prescription_id, pr.diagnosis, pr.follow_up_date as follow_up, "
        "vt.temperature, vt.heart_rate, vt.bp, vt.spO2 as spo2, vt.weight, vt.bmi "
        "FROM visits v "
        "JOIN patients p ON v.patient_id = p.id "
        "JOIN prescriptions pr ON v.visit_id = pr.visit_id "
        "LEFT JOIN vitals vt ON v.visit_id = vt.visit_id "
        "WHERE v.status = 'WAITING_PRINT'"
    ).fetchall()

    printing_list = []
    for row in printing_rows:
        rec  = dict(row)
        meds = db.execute(
            "SELECT medicine_name as name, route, dose, frequency, timing, duration "
            "FROM medications WHERE prescription_id = ?",
            (rec["prescription_id"],)
        ).fetchall()
        rec["medications"] = [dict(m) for m in meds]
        printing_list.append(rec)

    db.close()
    return jsonify({"waiting": [dict(r) for r in waiting_rows], "printing": printing_list}), 200

# ── Vitals ─────────────────────────────────────────────────────────────────────
@app.route("/api/vitals", methods=["POST"])
def submit_vitals():
    data     = request.get_json() or {}
    visit_id = data.get("visit_id")
    nurse_id = data.get("nurse_id", "NUR-202")
    temp     = data.get("temp")
    hr       = data.get("hr")
    bp       = data.get("bp")
    spo2     = data.get("spo2")
    height   = data.get("height")
    weight   = data.get("weight")
    bmi      = data.get("bmi")
    signature = data.get("signature")

    if not all([visit_id, temp, hr, bp, height, weight, signature]):
        return jsonify({"error": "Missing required vitals fields or signature."}), 400

    # Extract and verify nonce
    nonce = data.get('nonce')
    if not check_and_consume_nonce(nonce):
        logger.warning("REJECTED vitals — replay nonce used from %s", nurse_id)
        return jsonify({"error": "Replay attack detected: nonce reused."}), 400
    # Role validation
    if not verify_role(nurse_id, "VITALS"):
        logger.warning("REJECTED vitals — role mismatch for %s", nurse_id)
        return jsonify({"error": "User role not authorized for vitals submission."}), 403
    if not verify_signature(nurse_id, visit_id, "VITALS", signature):
        logger.warning("REJECTED vitals — invalid signature from %s", nurse_id)
        return jsonify({"error": "Invalid cryptographic signature. Vitals rejected."}), 403

    # ── SQLite insert ──
    db = get_db()
    try:
        db.execute(
            "INSERT INTO vitals (visit_id, temperature, heart_rate, bp, spO2, height, weight, bmi) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (visit_id, temp, hr, bp, spo2, height, weight, bmi)
        )
        db.execute("UPDATE visits SET status = 'WAITING_DOCTOR' WHERE visit_id = ?", (visit_id,))
        db.commit()
    finally:
        db.close()

    # ── Blockchain seal ──
    payload   = {"visit_id": visit_id, "temp": str(temp), "hr": str(hr), "bp": bp}
    data_hash = make_data_hash(payload)
    block     = ledger.add_block(visit_id, nurse_id, "VITALS", data_hash, signature)

    return jsonify({
        "message":     "Vitals recorded and block sealed on-chain.",
        "block_index": block.index,
        "block_hash":  block.hash,
    }), 201

# ── Doctor Queue ───────────────────────────────────────────────────────────────
@app.route("/api/queue/doctor", methods=["GET"])
def get_doctor_queue():
    db = get_db()
    rows = db.execute(
        "SELECT v.visit_id, p.name, p.age, p.gender, "
        "vt.temperature, vt.bp, vt.heart_rate, vt.bmi, vt.spO2 as spo2, vt.weight "
        "FROM visits v "
        "JOIN patients p ON v.patient_id = p.id "
        "LEFT JOIN vitals vt ON v.visit_id = vt.visit_id "
        "WHERE v.status = 'WAITING_DOCTOR'"
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows]), 200

# ── Prescription ───────────────────────────────────────────────────────────────
@app.route("/api/prescribe", methods=["POST"])
def prescribe():
    data      = request.get_json() or {}
    visit_id  = data.get("visit_id")
    doctor_id = data.get("doctor_id", "DOC-505")
    diagnosis = data.get("diagnosis")
    follow_up = data.get("follow_up")
    meds      = data.get("medications", [])
    signature = data.get("signature")

    if not all([visit_id, diagnosis, signature]):
        return jsonify({"error": "Missing required prescription fields or signature."}), 400

    # Extract and verify nonce
    nonce = data.get('nonce')
    if not check_and_consume_nonce(nonce):
        logger.warning("REJECTED prescription — replay nonce used from %s", doctor_id)
        return jsonify({"error": "Replay attack detected: nonce reused."}), 400
    # Role validation
    if not verify_role(doctor_id, "PRESCRIPTION"):
        logger.warning("REJECTED prescription — role mismatch for %s", doctor_id)
        return jsonify({"error": "User role not authorized for prescription."}), 403
    if not verify_signature(doctor_id, visit_id, "PRESCRIPTION", signature):
        logger.warning("REJECTED prescription — invalid signature from %s", doctor_id)
        return jsonify({"error": "Invalid cryptographic signature. Prescription rejected."}), 403

    # ── SQLite insert ──
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO prescriptions (visit_id, diagnosis, follow_up_date) VALUES (?, ?, ?)",
            (visit_id, diagnosis, follow_up)
        )
        prescription_id = cursor.lastrowid
        for med in meds:
            cursor.execute(
                "INSERT INTO medications (prescription_id, medicine_name, route, dose, frequency, timing, duration) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (prescription_id, med.get("name"), med.get("route"), med.get("dose"),
                 med.get("frequency"), med.get("timing"), med.get("duration"))
            )
        db.execute("UPDATE visits SET status = 'WAITING_PRINT' WHERE visit_id = ?", (visit_id,))
        db.commit()
    finally:
        db.close()

    # ── Blockchain seal ──
    meds_str  = ", ".join(f"{m.get('name')} {m.get('dose')}" for m in meds)
    payload   = {"visit_id": visit_id, "diagnosis": diagnosis, "medications": meds_str}
    data_hash = make_data_hash(payload)
    block     = ledger.add_block(visit_id, doctor_id, "PRESCRIPTION", data_hash, signature)

    return jsonify({
        "message":     "Prescription sealed on-chain and forwarded to print desk.",
        "block_index": block.index,
        "block_hash":  block.hash,
    }), 201

# ── Print Complete ─────────────────────────────────────────────────────────────
@app.route("/api/print/complete", methods=["POST"])
def complete_print():
    visit_id = (request.get_json() or {}).get("visit_id")
    if not visit_id:
        return jsonify({"error": "Missing visit_id."}), 400
    db = get_db()
    try:
        db.execute("UPDATE visits SET status = 'COMPLETED' WHERE visit_id = ?", (visit_id,))
        db.commit()
    finally:
        db.close()
    return jsonify({"message": "Session finalized successfully."}), 200

# ── Blockchain audit endpoints ─────────────────────────────────────────────────
@app.route("/api/chain", methods=["GET"])
def get_chain():
    """Return the full blockchain ledger for audit viewing."""
    return jsonify({
        "length": len(ledger.chain),
        "is_valid": ledger.is_valid(),
        "chain": [b.to_dict() for b in ledger.chain],
    }), 200


@app.route("/api/verify", methods=["GET"])
def verify_chain():
    """Quick integrity check — returns true only if the chain is untampered."""
    valid = ledger.is_valid()
    return jsonify({
        "is_valid": valid,
        "total_blocks": len(ledger.chain),
        "health": "SECURE" if valid else "COMPROMISED",
    }), 200


if __name__ == "__main__":
    logger.info("Starting Smart-OP backend on port %d (DEMO_MODE=%s)", FLASK_PORT, DEMO_MODE)
    app.run(host="127.0.0.1", port=FLASK_PORT, debug=False)