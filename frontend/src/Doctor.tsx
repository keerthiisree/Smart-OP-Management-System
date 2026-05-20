import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface DoctorPatient {
  visit_id: string;
  name: string;
  age: string;
  gender: string;
  temperature: number;
  bp: string;
  weight: number;
}

interface MedicationRow {
  name: string;
  route: string;
  dose: string;
  frequency: string;
  timing: string;
  duration: string;
}

export default function DoctorDashboard() {
  const [queue, setQueue] = useState<DoctorPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatient | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [medications, setMedications] = useState<MedicationRow[]>([
    { name: '', route: 'Oral', dose: '1-0-0', frequency: 'Every Day', timing: 'After Food', duration: '15 days' }
  ]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/queue/doctor');
      const data = await response.json();
      setQueue(data);
    } catch (err) {
      console.error("Error fetching doctor queue:", err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const addMedicationRow = () => {
    setMedications([...medications, { name: '', route: 'Oral', dose: '1-0-0', frequency: 'Every Day', timing: 'After Food', duration: '15 days' }]);
  };

  const removeMedicationRow = (index: number) => {
    const updated = medications.filter((_, i) => i !== index);
    setMedications(updated);
  };

  const handleMedChange = (index: number, field: keyof MedicationRow, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const payload = {
      visit_id: selectedPatient.visit_id,
      diagnosis,
      follow_up: followUp,
      medications
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/api/prescribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccessMessage(`Prescription saved for ${selectedPatient.name}. Outpatient workflow completed!`);
        setSelectedPatient(null);
        setDiagnosis('');
        setFollowUp('');
        setMedications([{ name: '', route: 'Oral', dose: '1-0-0', frequency: 'Every Day', timing: 'After Food', duration: '15 days' }]);
        fetchQueue();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error("Error submitting prescription:", err);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Doctor's Waiting Queue List */}
        <div className="lg:col-span-1 bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
          <h2 className="text-xl font-bold text-brand mb-4 border-b border-slate-700 pb-2">Active Consultations</h2>
          {queue.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No patients cleared by triage yet...</p>
          ) : (
            <div className="space-y-3">
              {queue.map((p) => (
                <div 
                  key={p.visit_id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-4 rounded-lg border cursor-pointer transition ${
                    selectedPatient?.visit_id === p.visit_id 
                      ? 'bg-brand text-slate-900 border-brand font-semibold shadow-lg' 
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold truncate">{p.name}</h4>
                    <span className="text-[10px] font-mono bg-slate-800 text-brand px-2 py-0.5 rounded border border-slate-700">{p.visit_id}</span>
                  </div>
                  <p className={`text-xs mt-1 ${selectedPatient?.visit_id === p.visit_id ? 'text-slate-800' : 'text-slate-400'}`}>
                    {p.age} / {p.gender} • <span className="font-semibold font-mono">BP: {p.bp || 'N/A'}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prescription Desk */}
        <div className="lg:col-span-3 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-brand mb-4 border-b border-slate-700 pb-2">Physician Assessment & Treatment Record</h2>
          
          {successMessage && (
            <div className="bg-emerald-900 border border-emerald-500 text-emerald-200 p-4 rounded mb-6 font-semibold">
              {successMessage}
            </div>
          )}

          {selectedPatient ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Banner displaying info from Reception & Nurse */}
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-slate-400 block text-xs">Patient Name</span><strong>{selectedPatient.name} ({selectedPatient.age})</strong></div>
                <div><span className="text-slate-400 block text-xs">Consult ID</span><span className="font-mono font-semibold text-brand">{selectedPatient.visit_id}</span></div>
                <div><span className="text-slate-400 block text-xs">Triage Blood Pressure</span><span className="font-mono text-amber-400">{selectedPatient.bp} mmHg</span></div>
                <div><span className="text-slate-400 block text-xs">Temp / Weight</span><span>{selectedPatient.temperature}°F / {selectedPatient.weight} kg</span></div>
              </div>

              {/* Diagnosis Field */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-semibold">Diagnosis</label>
                <input type="text" required placeholder="e.g., T.CRURIS" value={diagnosis}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-xl font-mono text-brand focus:outline-none focus:border-brand"
                  onChange={e => setDiagnosis(e.target.value.toUpperCase())} />
              </div>

              {/* Dynamic KIMS Prescriptions Table Grid */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold">Medication Prescribed</label>
                  <button type="button" onClick={addMedicationRow} className="text-xs bg-slate-900 border border-slate-600 text-brand px-3 py-1.5 rounded hover:bg-slate-700 transition flex items-center gap-1">
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {medications.map((med, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-900 p-3 rounded-lg border border-slate-700 items-center">
                      <div className="md:col-span-3">
                        <input type="text" required placeholder="Medicine Name (e.g., ALLEGRA 120MG)" value={med.name}
                          className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs font-semibold focus:outline-none focus:border-brand"
                          onChange={e => handleMedChange(index, 'name', e.target.value.toUpperCase())} />
                      </div>
                      <div className="md:col-span-1.5">
                        <select value={med.route} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs focus:outline-none"
                          onChange={e => handleMedChange(index, 'route', e.target.value)}>
                          <option value="Oral">Oral</option>
                          <option value="Local">Local</option>
                          <option value="IV">IV</option>
                          <option value="Injection">Injection</option>
                        </select>
                      </div>
                      <div className="md:col-span-1.5">
                        <input type="text" placeholder="Dose (1-0-1)" value={med.dose}
                          className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-center font-mono focus:outline-none"
                          onChange={e => handleMedChange(index, 'dose', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <input type="text" placeholder="Frequency" value={med.frequency}
                          className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs focus:outline-none"
                          onChange={e => handleMedChange(index, 'frequency', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <select value={med.timing} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs focus:outline-none"
                          onChange={e => handleMedChange(index, 'timing', e.target.value)}>
                          <option value="After Food">After Food</option>
                          <option value="Before Food">Before Food</option>
                          <option value="NA">NA</option>
                        </select>
                      </div>
                      <div className="md:col-span-1.5">
                        <input type="text" placeholder="Duration" value={med.duration}
                          className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-center focus:outline-none"
                          onChange={e => handleMedChange(index, 'duration', e.target.value)} />
                      </div>
                      <div className="md:col-span-0.5 text-center">
                        {medications.length > 1 && (
                          <button type="button" onClick={() => removeMedicationRow(index)} className="text-red-400 hover:text-red-500 transition">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up block */}
              <div className="w-full md:w-1/3">
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-semibold">Follow Up Date</label>
                <input type="date" value={followUp}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-xs focus:outline-none focus:border-brand text-brand"
                  onChange={e => setFollowUp(e.target.value)} />
              </div>

              <button type="submit" className="w-full bg-brand text-slate-900 font-bold py-3 rounded-lg hover:bg-opacity-90 transition shadow-lg shadow-brand/10 text-center">
                Finalize Treatment & Terminate Session
              </button>
            </form>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 italic border-2 border-dashed border-slate-700 rounded-lg">
              Awaiting selection of an active out-patient file from the left queue...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}