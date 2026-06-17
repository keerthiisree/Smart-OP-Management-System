import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

// UPDATED: Added heart_rate, bmi, and spO2 to the interface
interface DoctorPatient {
  visit_id: string;
  name: string;
  age: string;
  gender: string;
  temperature: number | string;
  bp: string;
  weight: number | string;
  heart_rate: number | string;
  bmi: number | string;
  spO2: number | string;
}

interface MedicationRow {
  name: string;
  route: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  timing: string;
  duration: number; 
}

export default function DoctorDashboard() {
  const [queue, setQueue] = useState<DoctorPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatient | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [followUp, setFollowUp] = useState('');
  
  const [medications, setMedications] = useState<MedicationRow[]>([
    { name: '', route: 'Oral', morning: false, afternoon: false, night: false, timing: 'After Food', duration: 1 }
  ]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fetchQueue = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/queue/doctor');
      const data = await response.json();
      setQueue(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const addMedicationRow = () => {
    setMedications([...medications, { name: '', route: 'Oral', morning: false, afternoon: false, night: false, timing: 'After Food', duration: 1 }]);
  };

  const removeMedicationRow = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: keyof MedicationRow, value: any) => {
    const updated = [...medications];
    (updated[index] as any)[field] = value;
    setMedications(updated);
  };

  const adjustDuration = (index: number, val: number) => {
    const updated = [...medications];
    updated[index].duration = Math.max(1, updated[index].duration + val);
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const processedMeds = medications.map(m => ({
      name: m.name,
      route: m.route,
      dose: `${m.morning ? '1' : '0'}-${m.afternoon ? '1' : '0'}-${m.night ? '1' : '0'}`,
      frequency: [m.morning && 'Morning', m.afternoon && 'Afternoon', m.night && 'Night'].filter(Boolean).join(', ') || 'As Needed',
      timing: m.timing,
      duration: `${m.duration} days`
    }));

    try {
      await fetch('http://127.0.0.1:5000/api/prescribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_id: selectedPatient.visit_id, diagnosis, follow_up: followUp, medications: processedMeds })
      });

      setSuccessMessage(`Prescription saved! Sent back to Nurse for Printing.`);
      setSelectedPatient(null);
      setDiagnosis('');
      setFollowUp('');
      setMedications([{ name: '', route: 'Oral', morning: false, afternoon: false, night: false, timing: 'After Food', duration: 1 }]);
      fetchQueue();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Waiting List */}
        <div className="lg:col-span-1 bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
          <h2 className="text-xl font-bold text-brand mb-4 border-b border-slate-700 pb-2">Active Consultations</h2>
          {queue.length === 0 ? <p className="text-slate-500 text-sm italic">No patients waiting.</p> : (
            <div className="space-y-3">
              {queue.map((p) => (
                <div key={p.visit_id} onClick={() => setSelectedPatient(p)} className={`p-4 rounded-lg border cursor-pointer transition ${selectedPatient?.visit_id === p.visit_id ? 'bg-brand text-slate-900 font-semibold' : 'bg-slate-900 border-slate-700'}`}>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold truncate">{p.name}</h4>
                    <span className="text-[10px] font-mono bg-slate-800 text-brand px-2 py-0.5 rounded border border-slate-700">{p.visit_id}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">BP: {p.bp || 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="lg:col-span-3 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-brand mb-4 border-b border-slate-700 pb-2">Physician Assessment</h2>
          {successMessage && <div className="bg-emerald-900 text-emerald-200 p-4 rounded mb-6 font-semibold">{successMessage}</div>}

          {selectedPatient ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* UPDATED: Enhanced Patient Info & Vitals Display */}
              <div className="space-y-4">
                {/* Basic Demographics */}
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-slate-400 block text-xs">Patient</span><strong>{selectedPatient.name} ({selectedPatient.age}/{selectedPatient.gender.charAt(0)})</strong></div>
                  <div><span className="text-slate-400 block text-xs">ID</span><span className="font-mono text-brand">{selectedPatient.visit_id}</span></div>
                  <div><span className="text-slate-400 block text-xs">Weight</span><span>{selectedPatient.weight ? `${selectedPatient.weight} kg` : '--'}</span></div>
                  <div><span className="text-slate-400 block text-xs">SpO2</span><span className="font-mono text-emerald-400">{selectedPatient.spO2 ? `${selectedPatient.spO2}%` : '--'}</span></div>
                </div>

                {/* Vitals Grid Component */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider border-b border-slate-700 pb-2">Triage Vitals</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900 p-3 rounded border border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Temperature</span>
                            <span className="font-mono text-lg text-white">{selectedPatient.temperature || '--'} °F</span>
                        </div>
                        <div className="bg-slate-900 p-3 rounded border border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Blood Pressure</span>
                            <span className="font-mono text-lg text-amber-400">{selectedPatient.bp || '--'}</span>
                        </div>
                        <div className="bg-slate-900 p-3 rounded border border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Heart Rate</span>
                            <span className="font-mono text-lg text-white">{selectedPatient.heart_rate || '--'} bpm</span>
                        </div>
                        <div className="bg-slate-900 p-3 rounded border border-slate-700">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">BMI</span>
                            <span className="font-mono text-lg text-white">{selectedPatient.bmi || '--'}</span>
                        </div>
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-400 mb-2 font-semibold">Diagnosis</label>
                <input type="text" required placeholder="Enter Diagnosis" value={diagnosis} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-lg font-mono text-brand focus:border-brand outline-none" onChange={e => setDiagnosis(e.target.value.toUpperCase())} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs uppercase text-slate-400 font-semibold">Medication Checklist</label>
                  <button type="button" onClick={addMedicationRow} className="text-xs bg-slate-900 border border-slate-600 text-brand px-3 py-1.5 rounded hover:bg-slate-700 flex items-center gap-1"><Plus size={14} /> Add Row</button>
                </div>

                <div className="space-y-2">
                  {medications.map((med, index) => (
                    <div key={index} className="grid grid-cols-1 xl:grid-cols-12 gap-2 bg-slate-900 p-3 rounded-lg border border-slate-700 items-center text-xs">
                      
                      <div className="xl:col-span-3">
                        <input type="text" required placeholder="Medicine Name" value={med.name} className="w-full bg-slate-800 border border-slate-600 rounded p-2 focus:border-brand outline-none font-bold text-white" onChange={e => handleMedChange(index, 'name', e.target.value.toUpperCase())} />
                      </div>

                      <div className="xl:col-span-3 flex justify-around bg-slate-800 border border-slate-600 p-1.5 rounded items-center">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="accent-brand w-4 h-4" checked={med.morning} onChange={e => handleMedChange(index, 'morning', e.target.checked)} />
                          <span className={med.morning ? 'text-brand font-bold' : 'text-slate-500'}>Morn</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="accent-brand w-4 h-4" checked={med.afternoon} onChange={e => handleMedChange(index, 'afternoon', e.target.checked)} />
                          <span className={med.afternoon ? 'text-brand font-bold' : 'text-slate-500'}>Aft</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="accent-brand w-4 h-4" checked={med.night} onChange={e => handleMedChange(index, 'night', e.target.checked)} />
                          <span className={med.night ? 'text-brand font-bold' : 'text-slate-500'}>Night</span>
                        </label>
                      </div>

                      <div className="xl:col-span-2">
                        <select value={med.timing} className="w-full bg-slate-800 border border-slate-600 rounded p-2 outline-none" onChange={e => handleMedChange(index, 'timing', e.target.value)}>
                          <option value="After Food">After Food</option>
                          <option value="Before Food">Before Food</option>
                          <option value="With Food">With Food</option>
                        </select>
                      </div>

                      <div className="xl:col-span-2">
                        <select value={med.route} className="w-full bg-slate-800 border border-slate-600 rounded p-2 outline-none" onChange={e => handleMedChange(index, 'route', e.target.value)}>
                          <option value="Oral">Oral</option>
                          <option value="Local Cream">Local</option>
                          <option value="Drops">Drops</option>
                        </select>
                      </div>

                      <div className="xl:col-span-1.5 flex items-center bg-slate-800 border border-slate-600 rounded h-8 px-2 justify-between">
                        <span className="font-mono text-white text-[11px]">{med.duration} days</span>
                        <div className="flex flex-col border-l border-slate-600 pl-1.5 ml-1">
                          <button type="button" onClick={() => adjustDuration(index, 1)} className="hover:text-brand text-slate-400"><ChevronUp size={12} /></button>
                          <button type="button" onClick={() => adjustDuration(index, -1)} className="hover:text-brand text-slate-400"><ChevronDown size={12} /></button>
                        </div>
                      </div>

                      <div className="xl:col-span-0.5 text-center">
                        {medications.length > 1 && <button type="button" onClick={() => removeMedicationRow(index)} className="text-red-400 hover:text-red-500"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-1/3">
                <label className="block text-xs uppercase text-slate-400 mb-1 font-semibold">Next Consultation Date</label>
                <input 
                  type="date" 
                  ref={dateInputRef}
                  onClick={() => dateInputRef.current?.showPicker()}
                  value={followUp} 
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-sm outline-none focus:border-brand text-brand cursor-pointer" 
                  onChange={e => setFollowUp(e.target.value)} 
                />
              </div>

              <button type="submit" className="w-full bg-brand text-slate-900 font-bold py-3 rounded-lg hover:bg-opacity-90 transition">
                Finalize Consultation & Push to Nurse Print Desk
              </button>
            </form>
          ) : <div className="h-48 flex items-center justify-center text-slate-500 italic">Select patient card from left list.</div>}
        </div>
      </div>
    </div>
  );
}