import React, { useState } from 'react';

export default function ReceptionistDashboard() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
    department: '',
    doctor_name: '',
    visit_type: ''
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  // Auto-assign doctor based on department selection just to make it slick
  const handleDeptChange = (dept: string) => {
    let doc = 'Dr. General';
    if (dept === 'Dermatology') doc = 'Dr. S. Madhuri';
    if (dept === 'Pediatrics') doc = 'Dr. A. K. Sharma';
    if (dept === 'Cardiology') doc = 'Dr. V. Prasad';
    
    setFormData({ ...formData, department: dept, doctor_name: doc });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage("Patient Registered & Added to Nurse Queue!");
        setGeneratedId(data.visit_id);
        // Reset form
        setFormData({
          name: '',
          age: '',
          gender: '',
          phone: '',
          address: '',
          department: '',
          doctor_name: '',
          visit_type: ''
        });
      }
    } catch (err) {
      console.error("Error registering patient:", err);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-xl shadow-xl border border-slate-700">
        <div className="border-b border-slate-700 pb-4 mb-6">
          <h2 className="text-3xl font-bold text-brand">KIMS-Icon Front Desk</h2>
          <p className="text-slate-400 text-sm mt-1">Out-Patient Registration & Routing Module</p>
        </div>

        {successMessage && (
          <div className="bg-emerald-900 border border-emerald-500 text-emerald-200 p-4 rounded mb-6 flex flex-col gap-1">
            <span className="font-bold">{successMessage}</span>
            <span className="text-xs font-mono">Generated Consult ID: <strong className="text-brand text-sm">{generatedId}</strong></span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Demographics */}
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">1. Patient Demographics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs text-slate-400 mb-1">Full Name</label>
              <input type="text" required value={formData.name}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                placeholder="patient name"
                onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Age</label>
              <input type="text" required value={formData.age}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                placeholder="years"
                onChange={e => setFormData({...formData, age: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gender</label>
              <select value={formData.gender}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Section 2: Contact Info */}
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">2. Contact & Address Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
              <input type="tel" required value={formData.phone}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                placeholder="phone no"
                onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Residential Address</label>
              <input type="text" required value={formData.address}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                placeholder="residential address"
                onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>

          {/* Section 3: Routing */}
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">3. Department & Doctor Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Patient Concern / Dept</label>
              <select value={formData.department}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                onChange={e => handleDeptChange(e.target.value)}>
                <option value="">Select Department</option>
                <option value="Dermatology">Dermatology</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Cardiology">Cardiology</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assigned Physician</label>
              <input type="text" readOnly value={formData.doctor_name}
                className="w-full bg-slate-700 border border-slate-600 text-slate-300 rounded p-3 cursor-not-allowed focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Visit Type</label>
              <select value={formData.visit_type}
                className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                onChange={e => setFormData({...formData, visit_type: e.target.value})}>
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