import React, { useState, useRef } from 'react';

// OFFICIAL HOSPITAL DIRECTORY 
// Cleaned, Fully Separated, and Alphabetized by Department
const HOSPITAL_DIRECTORY: Record<string, string[]> = {
  "Dental": [
    "Dr. B Ganga Raju"
  ],
  "Dermatology": [
    "Dr. T Narayana Rao"
  ],
  "Diabetology": [
    "Dr. K Dileep Kumar",
    "Dr. KAV Subrahmanyam",
    "Dr. K Rambabu"
  ],
  "Endocrinology": [
    "Dr. K Dileep Kumar",
    "Dr. KAV Subrahmanyam",
    "Dr. G Sri Harsha"
  ],
  "ENT": [
    "Dr. Krishna Kishore T",
    "Dr. B Nageswara Rao"
  ],
  "Gastroenterology": [
    "Dr. L R S Girinadh",
    "Dr. Reddy Sreenivasa Rao",
    "Dr. P Siva Kumar"
  ],
  "General Medicine": [
    "Dr. Duvvada Vijay Babu",
    "Dr. M V V Gandhi",
    "Dr. K Rambabu",
    "Dr. BB Phani Kumar"
  ],
  "General Surgery": [
    "Dr. G Manohar"
  ],
  "Gynaecology": [
    "Dr. K Padmavathi"
  ],
  "Hepatology": [
    "Dr. L R S Girinadh",
    "Dr. Reddy Sreenivasa Rao",
    "Dr. P Siva Kumar"
  ],
  "Joint Replacement": [
    "Dr. C J R Mani Kumar",
    "Dr. GSK Sharma"
  ],
  "Nephrology": [
    "Dr. BB Phani Kumar",
    "Dr. Vani D",
    "Dr. Y V S Anita",
    "Dr. V Ratna Prabha"
  ],
  "Neurology": [
    "Dr. Raju Butchi",
    "Dr. S Gopi",
    "Dr. K Bhagya Rekha"
  ],
  "Obstetrics": [
    "Dr. K Padmavathi"
  ],
  "Ophthalmology": [
    "Dr. ISV Siva Prasada Rao",
    "Dr. K V V Satyanarayana",
    "Dr. V Rajeswara Rao"
  ],
  "Orthopedics": [
    "Dr. P Sivananda",
    "Dr. C J R Mani Kumar",
    "Dr. GSK Sharma",
    "Dr. Chandra Sekaram Naidu",
    "Dr. Kiran Kumar NVS"
  ],
  "Psychiatry": [
    "Dr. Nagarju",
    "Dr. GVS Murthy",
    "Dr. NN Raju",
    "Dr. K V Rami Reddy",
    "Dr. Prabhath K",
    "Dr. Ranga Sandhya"
  ],
  "Spine Surgery": [
    "Dr. P Sivananda"
  ],
  "Urology": [
    "Dr. G Manohar",
    "Dr. B Ramesh",
    "Dr. Suman G"
  ]
};

// Generate a master list of ALL unique doctors sorted alphabetically
const ALL_DOCTORS = Array.from(new Set(Object.values(HOSPITAL_DIRECTORY).flat())).sort();

export default function ReceptionistDashboard() {
  const [formData, setFormData] = useState({
    name: '',
    dob: '', 
    gender: '',
    phone: '',
    address: '',
    department: '',
    doctor_name: '',
    visit_type: ''
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const dobInputRef = useRef<HTMLInputElement>(null);

  // Helper function to find which departments a specific doctor belongs to
  const getDepartmentsForDoctor = (doctorName: string) => {
    return Object.keys(HOSPITAL_DIRECTORY).filter(dept => 
      HOSPITAL_DIRECTORY[dept].includes(doctorName)
    );
  };

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDept = e.target.value;
    const currentDoc = formData.doctor_name;

    // If the currently selected doctor doesn't belong to the newly chosen department, clear the doctor.
    if (selectedDept && currentDoc && !HOSPITAL_DIRECTORY[selectedDept].includes(currentDoc)) {
      setFormData({ ...formData, department: selectedDept, doctor_name: '' });
    } else {
      setFormData({ ...formData, department: selectedDept });
    }
  };

  const handleDoctorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDoc = e.target.value;

    if (!selectedDoc) {
      setFormData({ ...formData, doctor_name: '' });
      return;
    }

    // Find all departments this doctor works in
    const docDepts = getDepartmentsForDoctor(selectedDoc);

    // If the doctor only has ONE department, auto-fill it to save time
    if (docDepts.length === 1) {
      setFormData({ ...formData, doctor_name: selectedDoc, department: docDepts[0] });
    } 
    // If the doctor has MULTIPLE departments, check if the current one is valid.
    // If it isn't valid, clear the department so the receptionist must manually pick the correct one.
    else {
      if (formData.department && docDepts.includes(formData.department)) {
        setFormData({ ...formData, doctor_name: selectedDoc });
      } else {
        setFormData({ ...formData, doctor_name: selectedDoc, department: '' });
      }
    }
  };

  // Calculates actual numerical age from the Date of Birth string
  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, age: calculateAge(formData.dob) };
      
      const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage("Patient Registered & Added to Nurse Queue!");
        setGeneratedId(data.visit_id);
        setFormData({ name: '', dob: '', gender: '', phone: '', address: '', department: '', doctor_name: '', visit_type: '' });
        
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(`Server Error: Could not register patient. The database might be missing a required field.`);
        console.error("Server returned:", data);
      }
    } catch (err) {
      alert("Network Error: Could not connect to the Python backend. Is app.py running?");
      console.error("Error registering patient:", err);
    }
  };

  // CROSS-FILTERING LOGIC
  // If a department is selected, only show doctors in that department. Otherwise, show all doctors.
  const availableDoctors = formData.department ? HOSPITAL_DIRECTORY[formData.department] : ALL_DOCTORS;
  
  // If a doctor is selected, only show the departments they work in. Otherwise, show all departments.
  const availableDepartments = formData.doctor_name ? getDepartmentsForDoctor(formData.doctor_name) : Object.keys(HOSPITAL_DIRECTORY);

  return (
    <div className="min-h-screen bg-dark text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl shadow-xl border border-slate-700">
        <div className="border-b border-slate-700 pb-4 mb-6">
          <h2 className="text-3xl font-bold text-brand">Hospital Front Desk</h2>
          <p className="text-slate-400 text-sm mt-1">Out-Patient Registration & Routing Module</p>
        </div>

        {successMessage && (
          <div className="bg-emerald-900 border border-emerald-500 text-emerald-200 p-4 rounded mb-6 flex flex-col gap-1">
            <span className="font-bold">{successMessage}</span>
            <span className="text-xs font-mono">Generated Consult ID: <strong className="text-brand text-sm">{generatedId}</strong></span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">1. Patient Demographics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs text-slate-400 mb-1">Full Name</label>
              <input type="text" required value={formData.name}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                placeholder="Patient Name"
                onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date of Birth</label>
              <input 
                type="date" 
                ref={dobInputRef}
                onClick={() => dobInputRef.current?.showPicker()}
                required 
                value={formData.dob}
                className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 focus:outline-none focus:border-brand text-brand cursor-pointer"
                onChange={e => setFormData({...formData, dob: e.target.value})} 
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Gender</label>
              <select value={formData.gender} required
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">2. Contact & Address Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
              <input type="tel" required value={formData.phone}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                placeholder="Phone Number"
                onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Residential Address</label>
              <input type="text" required value={formData.address}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                placeholder="Residential Address"
                onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">3. Department & Doctor Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Filtered Department Dropdown */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Patient Concern / Dept</label>
              <select value={formData.department} required
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                onChange={handleDeptChange}>
                <option value="">Select Department</option>
                {availableDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Filtered Doctor Dropdown */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assigned Physician</label>
              <select 
                value={formData.doctor_name} 
                required
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand text-white"
                onChange={handleDoctorChange}>
                <option value="">Select Physician</option>
                {availableDoctors.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Visit Type</label>
              <select value={formData.visit_type} required
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                onChange={e => setFormData({...formData, visit_type: e.target.value})}>
                <option value="">Select Type</option>
                <option value="WALK IN">WALK IN</option>
                <option value="APPOINTMENT">APPOINTMENT</option>
                <option value="EMERGENCY">EMERGENCY</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-brand text-slate-900 font-bold py-3 rounded-lg hover:bg-opacity-90 transition mt-4 shadow-lg shadow-brand/10">
            Generate Consult ID & Route Patient
          </button>
        </form>
      </div>
    </div>
  );
}